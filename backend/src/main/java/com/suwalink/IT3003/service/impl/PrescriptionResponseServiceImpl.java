package com.suwalink.IT3003.service.impl;

import com.suwalink.IT3003.dto.request.CreatePrescriptionResponseRequest;
import com.suwalink.IT3003.dto.response.PrescriptionResponseResponse;
import com.suwalink.IT3003.entity.Inventory;
import com.suwalink.IT3003.entity.Pharmacy;
import com.suwalink.IT3003.entity.PrescriptionRequest;
import com.suwalink.IT3003.entity.PrescriptionRequestStatus;
import com.suwalink.IT3003.entity.PrescriptionResponse;
import com.suwalink.IT3003.entity.PrescriptionResponseItem;
import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.event.PharmacyRespondedEvent;
import com.suwalink.IT3003.exception.InventoryAccessDeniedException;
import com.suwalink.IT3003.exception.PrescriptionAccessDeniedException;
import com.suwalink.IT3003.exception.PrescriptionRequestClosedException;
import com.suwalink.IT3003.exception.ResourceNotFoundException;
import com.suwalink.IT3003.repository.InventoryRepository;
import com.suwalink.IT3003.repository.PharmacyRepository;
import com.suwalink.IT3003.repository.PrescriptionRequestRepository;
import com.suwalink.IT3003.repository.PrescriptionResponseRepository;
import com.suwalink.IT3003.security.CurrentUserProvider;
import com.suwalink.IT3003.service.PrescriptionResponseService;
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
    private final PharmacyRepository pharmacyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public PrescriptionResponseResponse create(UUID requestId, CreatePrescriptionResponseRequest request) {
        PrescriptionRequest prescriptionRequest = prescriptionRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription request not found: " + requestId));

        if (prescriptionRequest.getStatus() == PrescriptionRequestStatus.CLOSED) {
            throw new PrescriptionRequestClosedException();
        }

        Pharmacy pharmacy = currentPharmacy();

        PrescriptionResponse response = PrescriptionResponse.builder()
                .prescriptionRequest(prescriptionRequest)
                .pharmacy(pharmacy)
                .message(blankToNull(request.getMessage()))
                .build();

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

        PrescriptionResponse saved = prescriptionResponseRepository.save(response);

        if (prescriptionRequest.getStatus() == PrescriptionRequestStatus.PENDING) {
            prescriptionRequest.setStatus(PrescriptionRequestStatus.RESPONDED);
            prescriptionRequestRepository.save(prescriptionRequest);
        }

        eventPublisher.publishEvent(new PharmacyRespondedEvent(
                this, prescriptionRequest.getPatient().getId(), pharmacy.getUser().getName()));

        return toResponse(saved);
    }

    @Override
    public List<PrescriptionResponseResponse> listForRequest(UUID requestId) {
        PrescriptionRequest prescriptionRequest = prescriptionRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription request not found: " + requestId));

        User currentUser = currentUserProvider.getCurrentUser();

        if (currentUser.getRole() == Role.PHARMACY_ADMIN) {
            Pharmacy pharmacy = currentPharmacy();
            return prescriptionResponseRepository
                    .findByPrescriptionRequestIdAndPharmacyId(requestId, pharmacy.getId())
                    .stream()
                    .map(this::toResponse)
                    .toList();
        }

        if (!prescriptionRequest.getPatient().getId().equals(currentUser.getId())) {
            throw new PrescriptionAccessDeniedException();
        }

        return prescriptionResponseRepository.findByPrescriptionRequestIdOrderByCreatedAtDesc(requestId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
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
                .pharmacyName(response.getPharmacy().getUser().getName())
                .message(response.getMessage())
                .items(items)
                .createdAt(response.getCreatedAt())
                .build();
    }
}
