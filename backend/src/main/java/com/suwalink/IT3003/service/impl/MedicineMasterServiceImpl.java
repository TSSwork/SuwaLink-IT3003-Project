package com.suwalink.IT3003.service.impl;

import com.suwalink.IT3003.dto.request.MedicineMasterRequest;
import com.suwalink.IT3003.dto.response.MedicineMasterResponse;
import com.suwalink.IT3003.entity.Category;
import com.suwalink.IT3003.entity.Manufacturer;
import com.suwalink.IT3003.entity.MedicineMaster;
import com.suwalink.IT3003.exception.ResourceNotFoundException;
import com.suwalink.IT3003.repository.CategoryRepository;
import com.suwalink.IT3003.repository.ManufacturerRepository;
import com.suwalink.IT3003.repository.MedicineMasterRepository;
import com.suwalink.IT3003.service.MedicineMasterService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MedicineMasterServiceImpl implements MedicineMasterService {

    private final MedicineMasterRepository medicineMasterRepository;
    private final CategoryRepository categoryRepository;
    private final ManufacturerRepository manufacturerRepository;

    @Override
    @Transactional
    public MedicineMasterResponse create(MedicineMasterRequest request) {
        MedicineMaster medicine = MedicineMaster.builder()
            .brandName(request.getBrandName())
            .genericName(request.getGenericName())
            .dosageForm(request.getDosageForm())
            .strength(request.getStrength())
            .unitOfMeasure(request.getUnitOfMeasure())
            .description(request.getDescription())
            .therapeuticCategory(resolveCategory(request.getTherapeuticCategoryId()))
            .manufacturer(resolveManufacturer(request.getManufacturerId()))
            .legalCategory(request.getLegalCategory())
            .imageUrl(request.getImageUrl())
            .build();

        return toResponse(medicineMasterRepository.save(medicine));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineMasterResponse> list() {
        return medicineMasterRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MedicineMasterResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Override
    @Transactional
    public MedicineMasterResponse update(UUID id, MedicineMasterRequest request) {
        MedicineMaster medicine = findOrThrow(id);
        medicine.setBrandName(request.getBrandName());
        medicine.setGenericName(request.getGenericName());
        medicine.setDosageForm(request.getDosageForm());
        medicine.setStrength(request.getStrength());
        medicine.setUnitOfMeasure(request.getUnitOfMeasure());
        medicine.setDescription(request.getDescription());
        medicine.setTherapeuticCategory(resolveCategory(request.getTherapeuticCategoryId()));
        medicine.setManufacturer(resolveManufacturer(request.getManufacturerId()));
        medicine.setLegalCategory(request.getLegalCategory());
        medicine.setImageUrl(request.getImageUrl());
        return toResponse(medicineMasterRepository.save(medicine));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        medicineMasterRepository.delete(findOrThrow(id));
    }

    private Category resolveCategory(UUID id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
    }

    private Manufacturer resolveManufacturer(UUID id) {
        return manufacturerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Manufacturer not found: " + id));
    }

    private MedicineMaster findOrThrow(UUID id) {
        return medicineMasterRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + id));
    }

    private MedicineMasterResponse toResponse(MedicineMaster medicine) {
        return MedicineMasterResponse.builder()
            .id(medicine.getId())
            .brandName(medicine.getBrandName())
            .genericName(medicine.getGenericName())
            .dosageForm(medicine.getDosageForm())
            .strength(medicine.getStrength())
            .unitOfMeasure(medicine.getUnitOfMeasure())
            .description(medicine.getDescription())
            .legalCategory(medicine.getLegalCategory())
            .imageUrl(medicine.getImageUrl())
            .therapeuticCategoryId(medicine.getTherapeuticCategory().getId())
            .therapeuticCategoryName(medicine.getTherapeuticCategory().getName())
            .manufacturerId(medicine.getManufacturer().getId())
            .manufacturerName(medicine.getManufacturer().getName())
            .build();
    }
}
