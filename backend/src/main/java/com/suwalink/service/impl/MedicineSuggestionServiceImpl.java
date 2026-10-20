package com.suwalink.service.impl;

import com.suwalink.dto.request.MedicineMasterRequest;
import com.suwalink.dto.response.MedicineMasterResponse;
import com.suwalink.entity.Category;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.MedicineStatus;
import com.suwalink.entity.Pharmacy;
import com.suwalink.event.MedicineSuggestionReviewedEvent;
import com.suwalink.exception.DuplicateResourceException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.MedicineSuggestionService;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MedicineSuggestionServiceImpl implements MedicineSuggestionService {

    private final MedicineMasterRepository medicineMasterRepository;
    private final CategoryRepository categoryRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final PharmacyRepository pharmacyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public MedicineMasterResponse suggest(MedicineMasterRequest request) {
        Pharmacy pharmacy = currentPharmacy();
        if (medicineMasterRepository.existsByBrandNameIgnoreCaseAndStrengthIgnoreCaseAndDosageFormIgnoreCaseAndStatusIn(
                request.getBrandName().trim(), request.getStrength().trim(), request.getDosageForm().trim(),
                EnumSet.of(MedicineStatus.APPROVED, MedicineStatus.PENDING))) {
            throw new DuplicateResourceException("This medicine already exists or is awaiting review");
        }
        Category category = categoryRepository.findById(request.getTherapeuticCategoryId())
            .orElseThrow(() -> new ResourceNotFoundException(
                "Category not found: " + request.getTherapeuticCategoryId()));
        Manufacturer manufacturer = manufacturerRepository.findById(request.getManufacturerId())
            .orElseThrow(() -> new ResourceNotFoundException(
                "Manufacturer not found: " + request.getManufacturerId()));

        MedicineMaster medicine = MedicineMaster.builder()
            .brandName(request.getBrandName().trim())
            .genericName(request.getGenericName().trim())
            .dosageForm(request.getDosageForm().trim())
            .strength(request.getStrength().trim())
            .unitOfMeasure(request.getUnitOfMeasure())
            .description(request.getDescription())
            .therapeuticCategory(category)
            .manufacturer(manufacturer)
            .legalCategory(request.getLegalCategory())
            .imageUrl(request.getImageUrl())
            .status(MedicineStatus.PENDING)
            .suggestedByPharmacy(pharmacy)
            .build();
        return MedicineMasterResponse.of(medicineMasterRepository.save(medicine));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineMasterResponse> mySuggestions() {
        return medicineMasterRepository.findBySuggestedByPharmacyIdOrderByCreatedAtDesc(currentPharmacy().getId())
            .stream().map(MedicineMasterResponse::of).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineMasterResponse> listSuggestions(MedicineStatus status) {
        return medicineMasterRepository.findAll().stream()
            .filter(m -> m.getSuggestedByPharmacy() != null)
            .filter(m -> status == null || m.getStatus() == status)
            .sorted(Comparator.comparing(MedicineMaster::getCreatedAt))
            .map(MedicineMasterResponse::of)
            .toList();
    }

    @Override
    @Transactional
    public MedicineMasterResponse approve(UUID id) {
        MedicineMaster medicine = pendingSuggestion(id);
        medicine.setStatus(MedicineStatus.APPROVED);
        medicine.setRejectionReason(null);
        return review(medicine, true);
    }

    @Override
    @Transactional
    public MedicineMasterResponse reject(UUID id, String reason) {
        MedicineMaster medicine = pendingSuggestion(id);
        medicine.setStatus(MedicineStatus.REJECTED);
        medicine.setRejectionReason(reason);
        return review(medicine, false);
    }

    private MedicineMasterResponse review(MedicineMaster medicine, boolean approved) {
        MedicineMaster saved = medicineMasterRepository.save(medicine);
        eventPublisher.publishEvent(new MedicineSuggestionReviewedEvent(
            this, saved.getSuggestedByPharmacy().getUser().getId(),
            saved.getBrandName() + " " + saved.getStrength(), approved));
        return MedicineMasterResponse.of(saved);
    }

    private MedicineMaster pendingSuggestion(UUID id) {
        MedicineMaster medicine = medicineMasterRepository.findById(id)
            .filter(m -> m.getSuggestedByPharmacy() != null)
            .orElseThrow(() -> new ResourceNotFoundException("Suggestion not found: " + id));
        if (medicine.getStatus() != MedicineStatus.PENDING) {
            throw new DuplicateResourceException("This suggestion has already been reviewed");
        }
        return medicine;
    }

    private Pharmacy currentPharmacy() {
        UUID userId = currentUserProvider.getCurrentUser().getId();
        return pharmacyRepository.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("Pharmacy admin missing pharmacy record"));
    }
}
