package com.suwalink.service.impl;

import com.suwalink.dto.request.CancelReservationRequest;
import com.suwalink.dto.request.CreateReservationRequest;
import com.suwalink.dto.response.ReservationResponse;
import com.suwalink.entity.CancelledBy;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.PrescriptionResponseItem;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationItem;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.event.ReservationCancelledEvent;
import com.suwalink.event.ReservationCreatedEvent;
import com.suwalink.exception.InsufficientStockException;
import com.suwalink.exception.InvalidReservationRequestException;
import com.suwalink.exception.InvalidReservationStateException;
import com.suwalink.exception.ItemUnavailableException;
import com.suwalink.exception.PrescriptionAccessDeniedException;
import com.suwalink.exception.ReservationAccessDeniedException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionResponseItemRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.PharmacyVisibilityService;
import com.suwalink.service.ReservationService;
import com.suwalink.util.PickupCodeGenerator;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReservationServiceImpl implements ReservationService {

    private static final Set<PrescriptionRequestStatus> CLOSED_REQUEST_STATUSES =
            EnumSet.of(PrescriptionRequestStatus.EXPIRED, PrescriptionRequestStatus.CLOSED);

    private final ReservationRepository reservationRepository;
    private final InventoryRepository inventoryRepository;
    private final PrescriptionResponseItemRepository prescriptionResponseItemRepository;
    private final PharmacyRepository pharmacyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ApplicationEventPublisher eventPublisher;
    private final PharmacyVisibilityService pharmacyVisibilityService;
    private final PickupCodeGenerator pickupCodeGenerator;

    @Value("${app.reservation.hold-hours}")
    private int holdHours;

    /**
     * All-or-nothing: the inventory rows are locked (in id order) before any check, so two customers
     * racing for the same stock are serialised and the loser sees the decremented quantity.
     */
    @Override
    @Transactional
    public ReservationResponse create(CreateReservationRequest request) {
        User patient = currentUserProvider.getCurrentUser();
        List<CreateReservationRequest.Line> lines = request.getLines();

        Set<UUID> inventoryIds = new HashSet<>();
        for (CreateReservationRequest.Line line : lines) {
            if (!inventoryIds.add(line.getInventoryItemId())) {
                throw new InvalidReservationRequestException(
                        "Each inventory item may appear only once in a reservation: " + line.getInventoryItemId());
            }
        }

        Map<UUID, Inventory> locked = inventoryRepository.lockAllById(inventoryIds).stream()
                .collect(Collectors.toMap(Inventory::getId, Function.identity()));
        for (UUID id : inventoryIds) {
            if (!locked.containsKey(id)) {
                throw new ResourceNotFoundException("Inventory item not found: " + id);
            }
        }

        Set<UUID> pharmacyIds = locked.values().stream()
                .map(inventory -> inventory.getPharmacy().getId())
                .collect(Collectors.toSet());
        if (pharmacyIds.size() > 1) {
            throw new InvalidReservationRequestException(
                    "All items in one reservation must come from the same pharmacy");
        }
        Pharmacy pharmacy = locked.values().iterator().next().getPharmacy();
        if (!pharmacyVisibilityService.isPubliclyVisible(pharmacy)) {
            throw new ResourceNotFoundException("Inventory item not found: " + lines.get(0).getInventoryItemId());
        }

        LocalDate today = LocalDate.now();
        PrescriptionRequest prescriptionRequest = null;
        Reservation reservation = Reservation.builder()
                .patient(patient)
                .pharmacy(pharmacy)
                .status(ReservationStatus.CONFIRMED)
                .demo(pharmacy.isDemo())
                .build();

        for (CreateReservationRequest.Line line : lines) {
            Inventory inventory = locked.get(line.getInventoryItemId());
            checkReservable(inventory, line.getQuantity(), today);

            BigDecimal unitPrice = inventory.getUnitPrice();
            PrescriptionResponseItem responseItem = null;
            if (line.getPrescriptionResponseItemId() != null) {
                responseItem = findQuotedItem(line, patient);
                unitPrice = responseItem.getUnitPrice();
                prescriptionRequest = responseItem.getPrescriptionResponse().getPrescriptionRequest();
            }

            MedicineMaster medicine = inventory.getMedicineMaster();
            reservation.addItem(ReservationItem.builder()
                    .inventoryItem(inventory)
                    .prescriptionResponseItem(responseItem)
                    .quantity(line.getQuantity())
                    .unitPrice(unitPrice)
                    .medicineName(medicine.getBrandName() + " " + medicine.getStrength())
                    .requiresPrescription(medicine.getLegalCategory() != PrescriptionStatus.OTC)
                    .build());
        }

        // Every line passed its checks, so decrement on the locked rows (entity updates keep Envers history).
        for (CreateReservationRequest.Line line : lines) {
            Inventory inventory = locked.get(line.getInventoryItemId());
            inventory.setStockQuantity(inventory.getStockQuantity() - line.getQuantity());
        }

        reservation.setPrescriptionRequest(prescriptionRequest);
        reservation.setPickupCode(newPickupCode());
        reservation.setExpiresAt(LocalDateTime.now().plusHours(holdHours));

        Reservation saved = reservationRepository.save(reservation);
        eventPublisher.publishEvent(new ReservationCreatedEvent(this, saved.getId()));

        return toResponse(saved);
    }

    private void checkReservable(Inventory inventory, int quantity, LocalDate today) {
        String name = inventory.getMedicineMaster().getBrandName();
        if (!inventory.isAvailable()) {
            throw new ItemUnavailableException(name + " is currently unavailable at this pharmacy");
        }
        if (!inventory.getExpireDate().isAfter(today)) {
            throw new ItemUnavailableException(name + " has expired and cannot be reserved");
        }
        if (inventory.getStockQuantity() < quantity) {
            throw new InsufficientStockException(inventory.getStockQuantity(), quantity);
        }
    }

    /** Validates a quoted line: the caller's own open request, the same inventory, within the quoted quantity. */
    private PrescriptionResponseItem findQuotedItem(CreateReservationRequest.Line line, User patient) {
        PrescriptionResponseItem item = prescriptionResponseItemRepository.findById(line.getPrescriptionResponseItemId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Prescription response item not found: " + line.getPrescriptionResponseItemId()));

        PrescriptionRequest prescriptionRequest = item.getPrescriptionResponse().getPrescriptionRequest();
        if (!prescriptionRequest.getPatient().getId().equals(patient.getId())) {
            throw new PrescriptionAccessDeniedException();
        }
        if (CLOSED_REQUEST_STATUSES.contains(prescriptionRequest.getStatus())) {
            throw new ItemUnavailableException(
                    "This prescription request is " + prescriptionRequest.getStatus()
                            + " and its quotes can no longer be reserved");
        }
        if (!item.getInventoryItem().getId().equals(line.getInventoryItemId())) {
            throw new InvalidReservationRequestException(
                    "The quoted item does not match inventory item " + line.getInventoryItemId());
        }
        if (line.getQuantity() > item.getQuantity()) {
            throw new InvalidReservationRequestException(
                    "Cannot reserve more than the quoted quantity of " + item.getQuantity());
        }
        return item;
    }

    private String newPickupCode() {
        String code;
        do {
            code = pickupCodeGenerator.next();
        } while (reservationRepository.existsByPickupCode(code));
        return code;
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

        for (ReservationItem item : reservation.getItems()) {
            Inventory inventory = item.getInventoryItem();
            inventory.setStockQuantity(inventory.getStockQuantity() + item.getQuantity());
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelledBy(cancelledBy);
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
        Pharmacy pharmacy = reservation.getPharmacy();
        User patient = reservation.getPatient();
        List<ReservationResponse.Item> items = reservation.getItems().stream()
                .map(item -> ReservationResponse.Item.builder()
                        .id(item.getId())
                        .inventoryItemId(item.getInventoryItem().getId())
                        .medicineName(item.getMedicineName())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .lineTotal(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                        .requiresPrescription(item.isRequiresPrescription())
                        .build())
                .toList();

        return ReservationResponse.builder()
                .id(reservation.getId())
                .pickupCode(reservation.getPickupCode())
                .status(reservation.getStatus())
                .expiresAt(reservation.getExpiresAt())
                .createdAt(reservation.getCreatedAt())
                .cancelReason(reservation.getCancelReason())
                .cancelledBy(reservation.getCancelledBy())
                .prescriptionRequestId(reservation.getPrescriptionRequest() == null
                        ? null : reservation.getPrescriptionRequest().getId())
                .requiresPrescription(items.stream().anyMatch(ReservationResponse.Item::isRequiresPrescription))
                .total(items.stream().map(ReservationResponse.Item::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add))
                .pharmacy(ReservationResponse.PharmacySummary.builder()
                        .id(pharmacy.getId())
                        .name(pharmacy.getName())
                        .phone(pharmacy.getPhone())
                        .address(pharmacy.getAddress())
                        .city(pharmacy.getCity())
                        .district(pharmacy.getDistrict())
                        .latitude(pharmacy.getLatitude())
                        .longitude(pharmacy.getLongitude())
                        .build())
                .customer(ReservationResponse.CustomerSummary.builder()
                        .id(patient.getId())
                        .name(patient.getName())
                        .build())
                .items(items)
                .build();
    }
}
