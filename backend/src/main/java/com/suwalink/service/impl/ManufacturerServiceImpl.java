package com.suwalink.service.impl;

import com.suwalink.dto.request.ManufacturerRequest;
import com.suwalink.dto.response.ManufacturerResponse;
import com.suwalink.entity.Manufacturer;
import com.suwalink.exception.DuplicateResourceException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.service.ManufacturerService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ManufacturerServiceImpl implements ManufacturerService {

    private final ManufacturerRepository manufacturerRepository;

    @Override
    @Transactional
    public ManufacturerResponse create(ManufacturerRequest request) {
        if (manufacturerRepository.existsByName(request.getName())) {
            throw new DuplicateResourceException("A manufacturer named '" + request.getName() + "' already exists");
        }

        Manufacturer manufacturer = Manufacturer.builder()
            .name(request.getName())
            .licenseNumber(request.getLicenseNumber())
            .country(request.getCountry())
            .contactEmail(request.getContactEmail())
            .phone(request.getPhone())
            .build();

        return toResponse(manufacturerRepository.save(manufacturer));
    }

    @Override
    public List<ManufacturerResponse> list() {
        return manufacturerRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManufacturerResponse> listActive() {
        return manufacturerRepository.findByIsActiveTrueOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Override
    public ManufacturerResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Override
    @Transactional
    public ManufacturerResponse update(UUID id, ManufacturerRequest request) {
        Manufacturer manufacturer = findOrThrow(id);
        if (!manufacturer.getName().equals(request.getName())
                && manufacturerRepository.existsByName(request.getName())) {
            throw new DuplicateResourceException("A manufacturer named '" + request.getName() + "' already exists");
        }
        manufacturer.setName(request.getName());
        manufacturer.setLicenseNumber(request.getLicenseNumber());
        manufacturer.setCountry(request.getCountry());
        manufacturer.setContactEmail(request.getContactEmail());
        manufacturer.setPhone(request.getPhone());
        return toResponse(manufacturerRepository.save(manufacturer));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        manufacturerRepository.delete(findOrThrow(id));
    }

    private Manufacturer findOrThrow(UUID id) {
        return manufacturerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Manufacturer not found: " + id));
    }

    private ManufacturerResponse toResponse(Manufacturer manufacturer) {
        return ManufacturerResponse.builder()
            .id(manufacturer.getId())
            .name(manufacturer.getName())
            .licenseNumber(manufacturer.getLicenseNumber())
            .country(manufacturer.getCountry())
            .contactEmail(manufacturer.getContactEmail())
            .phone(manufacturer.getPhone())
            .active(manufacturer.isActive())
            .build();
    }
}
