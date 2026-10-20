package com.suwalink.service.impl;

import com.suwalink.dto.request.CreatePrescriptionResponseRequest;
import com.suwalink.dto.response.PrescriptionResponseResponse;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.PrescriptionResponse;
import com.suwalink.entity.PrescriptionResponseItem;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.event.PharmacyRespondedEvent;
import com.suwalink.exception.DuplicateResourceException;
import com.suwalink.exception.InventoryAccessDeniedException;
import com.suwalink.exception.PrescriptionAccessDeniedException;
import com.suwalink.exception.PrescriptionRequestClosedException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.repository.PrescriptionResponseRepository;
import com.suwalink.repository.ReservationItemRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.PrescriptionResponseService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PrescriptionResponseServiceImpl implements PrescriptionResponseService {

    private final PrescriptionResponseRepository prescriptionResponseRepository;
    private final PrescriptionRequestRepository prescriptionRequestRepository;
    private final InventoryRepository inventoryRepository;
    private final ReservationItemRepository reservationItemRepository;
    private final PharmacyRepository pharmacyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public PrescriptionResponseResponse create(UUID requestId, CreatePrescriptionResponseRequest request) {
        PrescriptionRequest prescriptionRequest = findOpenRequest(requestId);
        Pharmacy pharmacy = currentTargetedPharmacy(prescriptionRequest);

        if (!prescriptionResponseRepository
                .findByPrescriptionRequestIdAndPharmacyId(requestId, pharmacy.getId()).isEmpty()) {
            throw new DuplicateResourceException("You have already responded; update your response instead");
        }

        PrescriptionResponse response = PrescriptionResponse.builder()
                .prescriptionRequest(prescriptionRequest)
                .pharmacy(pharmacy)
                .build();
        applyContent(response, pharmacy, request);

        PrescriptionResponse saved = prescriptionResponseRepository.save(response);

        if (prescriptionRequest.getStatus() == PrescriptionRequestStatus.PENDING) {
            prescriptionRequest.setStatus(PrescriptionRequestStatus.RESPONDED);
            prescriptionRequestRepository.save(prescriptionRequest);
        }

        eventPublisher.publishEvent(new PharmacyRespondedEvent(this, prescriptionRequest.getId(),
                prescriptionRequest.getPatient().getId(), pharmacy.getName(), false));

        return toResponse(saved);
    }

    @Override
    @Transactional
    public PrescriptionResponseResponse updateMine(UUID requestId, CreatePrescriptionResponseRequest request) {
        PrescriptionRequest prescriptionRequest = findOpenRequest(requestId);
        Pharmacy pharmacy = currentTargetedPharmacy(prescriptionRequest);

        PrescriptionResponse response = prescriptionResponseRepository
                .findByPrescriptionRequestIdAndPharmacyId(requestId, pharmacy.getId()).stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("You have not responded to this request yet"));

        if (reservationItemRepository.existsByPrescriptionResponseItem_PrescriptionResponse_Id(response.getId())) {
            throw new DuplicateResourceException(
                    "This response already has reservations and can no longer be changed");
        }

        response.getItems().clear();
        applyContent(response, pharmacy, request);
        PrescriptionResponse saved = prescriptionResponseRepository.save(response);

        eventPublisher.publishEvent(new PharmacyRespondedEvent(this, prescriptionRequest.getId(),
                prescriptionRequest.getPatient().getId(), pharmacy.getName(), true));

        return toResponse(saved);
    }

    private PrescriptionRequest findOpenRequest(UUID requestId) {
        PrescriptionRequest prescriptionRequest = prescriptionRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription request not found: " + requestId));
        if (prescriptionRequest.getStatus() != PrescriptionRequestStatus.PENDING
                && prescriptionRequest.getStatus() != PrescriptionRequestStatus.RESPONDED) {
            throw new PrescriptionRequestClosedException();
        }
        return prescriptionRequest;
    }

    private Pharmacy currentTargetedPharmacy(PrescriptionRequest prescriptionRequest) {
        Pharmacy pharmacy = currentPharmacy();
        if (!prescriptionRequestRepository.existsByIdAndTargetPharmacies_Id(
                prescriptionRequest.getId(), pharmacy.getId())) {
            throw new PrescriptionAccessDeniedException();
        }
        return pharmacy;
    }

    /** Sets the message and (re)builds the items from the pharmacy's own inventory at current prices. */
    private void applyContent(PrescriptionResponse response, Pharmacy pharmacy,
            CreatePrescriptionResponseRequest request) {
        response.setMessage(blankToNull(request.getMessage()));
        for (CreatePrescriptionResponseRequest.ResponseItem itemRequest : request.getItems()) {
            Inventory inventory = inventoryRepository.findById(itemRequest.getInventoryItemId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Inventory item not found: " + itemRequest.getInventoryItemId()));

            if (!inventory.getPharmacy().getId().equals(pharmacy.getId())) {
                throw new InventoryAccessDeniedException();
            }

            response.getItems().add(PrescriptionResponseItem.builder()
                    .prescriptionResponse(response)
                    .inventoryItem(inventory)
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(inventory.getUnitPrice())
                    .build());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponseResponse> listForRequest(UUID requestId) {
        PrescriptionRequest prescriptionRequest = prescriptionRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription request not found: " + requestId));

        User currentUser = currentUserProvider.getCurrentUser();

        if (currentUser.getRole() == Role.PHARMACY_OWNER) {
            Pharmacy pharmacy = currentTargetedPharmacy(prescriptionRequest);
            return prescriptionResponseRepository
                    .findByPrescriptionRequestIdAndPharmacyId(requestId, pharmacy.getId())
                    .stream()
                    .map(this::toResponse)
                    .toList();
        }

        if (currentUser.getRole() != Role.ADMIN
                && !prescriptionRequest.getPatient().getId().equals(currentUser.getId())) {
            throw new PrescriptionAccessDeniedException();
        }

        return prescriptionResponseRepository.findByPrescriptionRequestIdOrderByCreatedAtDesc(requestId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponseResponse> listMyResponses() {
        Pharmacy pharmacy = currentPharmacy();
        return prescriptionResponseRepository.findByPharmacyIdOrderByCreatedAtDesc(pharmacy.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private Pharmacy currentPharmacy() {
        UUID userId = currentUserProvider.getCurrentUser().getId();
        return pharmacyRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("Pharmacy admin missing pharmacy record"));
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private PrescriptionResponseResponse toResponse(PrescriptionResponse response) {
        List<PrescriptionResponseResponse.ResponseItemSummary> items = response.getItems().stream()
                .map(item -> PrescriptionResponseResponse.ResponseItemSummary.builder()
                        .id(item.getId())
                        .inventoryItemId(item.getInventoryItem().getId())
                        .medicineBrandName(item.getInventoryItem().getMedicineMaster().getBrandName())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .build())
                .toList();

        return PrescriptionResponseResponse.builder()
                .id(response.getId())
                .prescriptionRequestId(response.getPrescriptionRequest().getId())
                .pharmacyId(response.getPharmacy().getId())
                .pharmacyName(response.getPharmacy().getName())
                .pharmacyActive(response.getPharmacy().getStatus() != PharmacyStatus.DEACTIVATED)
                .message(response.getMessage())
                .items(items)
                .createdAt(response.getCreatedAt())
                .build();
    }
}
