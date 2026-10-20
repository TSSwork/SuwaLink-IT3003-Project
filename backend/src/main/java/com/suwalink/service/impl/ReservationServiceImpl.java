package com.suwalink.service.impl;

import com.suwalink.dto.request.CancelReservationRequest;
import com.suwalink.dto.request.CreateReservationRequest;
import com.suwalink.dto.response.ReservationResponse;
import com.suwalink.entity.CancelledBy;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PrescriptionResponseItem;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.event.ReservationCancelledEvent;
import com.suwalink.event.ReservationCreatedEvent;
import com.suwalink.exception.InsufficientStockException;
import com.suwalink.exception.InvalidReservationStateException;
import com.suwalink.exception.ReservationAccessDeniedException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionResponseItemRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.ReservationService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final InventoryRepository inventoryRepository;
    private final PrescriptionResponseItemRepository prescriptionResponseItemRepository;
    private final PharmacyRepository pharmacyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public ReservationResponse create(CreateReservationRequest request) {
        User patient = currentUserProvider.getCurrentUser();

        Inventory inventory = inventoryRepository.findById(request.getInventoryItemId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Inventory item not found: " + request.getInventoryItemId()));

        if (inventory.getStockQuantity() < request.getQuantity()) {
            throw new InsufficientStockException(inventory.getStockQuantity(), request.getQuantity());
        }

        PrescriptionResponseItem responseItem = null;
        if (request.getPrescriptionResponseItemId() != null) {
            responseItem = prescriptionResponseItemRepository.findById(request.getPrescriptionResponseItemId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Prescription response item not found: " + request.getPrescriptionResponseItemId()));
        }

        inventory.setStockQuantity(inventory.getStockQuantity() - request.getQuantity());
        inventoryRepository.save(inventory);

        Reservation reservation = Reservation.builder()
                .patient(patient)
                .pharmacy(inventory.getPharmacy())
                .inventoryItem(inventory)
                .prescriptionResponseItem(responseItem)
                .quantity(request.getQuantity())
                .unitPrice(inventory.getUnitPrice())
                .status(ReservationStatus.CONFIRMED)
                .build();

        Reservation saved = reservationRepository.save(reservation);
        eventPublisher.publishEvent(new ReservationCreatedEvent(this, saved.getId()));

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationResponse> getMyReservations() {
        User patient = currentUserProvider.getCurrentUser();
        return reservationRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationResponse> getPharmacyReservations() {
        Pharmacy pharmacy = currentPharmacy();
        return reservationRepository.findByPharmacyIdOrderByCreatedAtDesc(pharmacy.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ReservationResponse cancel(UUID id, CancelReservationRequest request) {
        Reservation reservation = findOrThrow(id);
        User currentUser = currentUserProvider.getCurrentUser();

        CancelledBy cancelledBy = resolveRequester(reservation, currentUser);

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new InvalidReservationStateException(
                    "Only a CONFIRMED reservation can be cancelled (current status: "
                            + reservation.getStatus() + ")");
        }

        Inventory inventory = reservation.getInventoryItem();
        inventory.setStockQuantity(inventory.getStockQuantity() + reservation.getQuantity());
        inventoryRepository.save(inventory);

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelReason(request == null ? null : blankToNull(request.getReason()));
        Reservation saved = reservationRepository.save(reservation);

        eventPublisher.publishEvent(new ReservationCancelledEvent(this, saved.getId(), cancelledBy));

        return toResponse(saved);
    }

    @Override
    @Transactional
    public ReservationResponse complete(UUID id) {
        Reservation reservation = findOrThrow(id);
        Pharmacy pharmacy = currentPharmacy();

        if (!reservation.getPharmacy().getId().equals(pharmacy.getId())) {
            throw new ReservationAccessDeniedException();
        }

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new InvalidReservationStateException(
                    "Only a CONFIRMED reservation can be completed (current status: "
                            + reservation.getStatus() + ")");
        }

        reservation.setStatus(ReservationStatus.COMPLETED);
        return toResponse(reservationRepository.save(reservation));
    }

    private CancelledBy resolveRequester(Reservation reservation, User currentUser) {
        if (currentUser.getRole() == Role.PHARMACY_OWNER) {
            Pharmacy pharmacy = currentPharmacy();
            if (!reservation.getPharmacy().getId().equals(pharmacy.getId())) {
                throw new ReservationAccessDeniedException();
            }
            return CancelledBy.PHARMACY;
        }

        if (!reservation.getPatient().getId().equals(currentUser.getId())) {
            throw new ReservationAccessDeniedException();
        }
        return CancelledBy.PATIENT;
    }

    private Pharmacy currentPharmacy() {
        UUID userId = currentUserProvider.getCurrentUser().getId();
        return pharmacyRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("Pharmacy admin missing pharmacy record"));
    }

    private Reservation findOrThrow(UUID id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + id));
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private ReservationResponse toResponse(Reservation reservation) {
        return ReservationResponse.builder()
                .id(reservation.getId())
                .patientId(reservation.getPatient().getId())
                .patientName(reservation.getPatient().getName())
                .pharmacyId(reservation.getPharmacy().getId())
                .pharmacyName(reservation.getPharmacy().getName())
                .inventoryItemId(reservation.getInventoryItem().getId())
                .medicineBrandName(reservation.getInventoryItem().getMedicineMaster().getBrandName())
                .quantity(reservation.getQuantity())
                .unitPrice(reservation.getUnitPrice())
                .status(reservation.getStatus())
                .cancelReason(reservation.getCancelReason())
                .createdAt(reservation.getCreatedAt())
                .build();
    }
}
