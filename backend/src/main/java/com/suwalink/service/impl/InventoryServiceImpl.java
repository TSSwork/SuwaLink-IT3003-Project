package com.suwalink.service.impl;

import com.suwalink.dto.request.CreateInventoryRequest;
import com.suwalink.dto.request.UpdateInventoryRequest;
import com.suwalink.dto.response.InventoryResponse;
import com.suwalink.entity.Image;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.exception.InventoryAccessDeniedException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.ImageRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.InventoryService;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final MedicineMasterRepository medicineMasterRepository;
    private final ImageRepository imageRepository;
    private final PharmacyRepository pharmacyRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional
    public InventoryResponse addInventoryItem(CreateInventoryRequest request) {
        Pharmacy pharmacy = currentPharmacy();

        MedicineMaster medicineMaster = medicineMasterRepository.findById(request.getMedicineMasterId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Medicine not found: " + request.getMedicineMasterId()));

        Image image = null;
        if (request.getImageId() != null) {
            image = imageRepository.findById(request.getImageId())
                    .orElseThrow(() -> new ResourceNotFoundException("Image not found: " + request.getImageId()));
            if (!pharmacy.getUser().getId().equals(image.getUploadedByUserId())) {
                throw new InventoryAccessDeniedException();
            }
        }

        Inventory inventory = Inventory.builder()
                .medicineMaster(medicineMaster)
                .pharmacy(pharmacy)
                .unitPrice(request.getUnitPrice())
                .stockQuantity(request.getStockQuantity())
                .expireDate(request.getExpireDate())
                .image(image)
                .build();

        return toResponse(inventoryRepository.save(inventory));
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryResponse> listMyInventory() {
        Pharmacy pharmacy = currentPharmacy();
        return inventoryRepository.findByPharmacyId(pharmacy.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryResponse getInventoryItem(UUID id) {
        return toResponse(ownedInventoryItem(id));
    }

    @Override
    @Transactional
    public InventoryResponse updateInventoryItem(UUID id, UpdateInventoryRequest request) {
        Inventory inventory = ownedInventoryItem(id);

        inventory.setUnitPrice(request.getUnitPrice());
        inventory.setStockQuantity(request.getStockQuantity());
        inventory.setExpireDate(request.getExpireDate());

        return toResponse(inventoryRepository.save(inventory));
    }

    @Override
    @Transactional
    public InventoryResponse setAvailability(UUID id, boolean available) {
        Inventory inventory = ownedInventoryItem(id);
        inventory.setAvailable(available);
        return toResponse(inventoryRepository.save(inventory));
    }

    @Override
    @Transactional
    public void removeInventoryItem(UUID id) {
        Inventory inventory = ownedInventoryItem(id);
        inventoryRepository.delete(inventory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryResponse> search(
            String query,
            UUID categoryId,
            UUID manufacturerId,
            PrescriptionStatus legalCategory,
            BigDecimal minPrice,
            BigDecimal maxPrice) {

        return inventoryRepository.search(query, categoryId, manufacturerId, legalCategory, minPrice, maxPrice)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private Pharmacy currentPharmacy() {
        UUID userId = currentUserProvider.getCurrentUser().getId();
        return pharmacyRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("Pharmacy admin missing pharmacy record"));
    }

    private Inventory ownedInventoryItem(UUID id) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found: " + id));

        Pharmacy pharmacy = currentPharmacy();
        if (!inventory.getPharmacy().getId().equals(pharmacy.getId())) {
            throw new InventoryAccessDeniedException();
        }

        return inventory;
    }

    private InventoryResponse toResponse(Inventory inventory) {
        MedicineMaster medicine = inventory.getMedicineMaster();

        InventoryResponse.MedicineSummary medicineSummary = InventoryResponse.MedicineSummary.builder()
                .id(medicine.getId())
                .brandName(medicine.getBrandName())
                .genericName(medicine.getGenericName())
                .dosageForm(medicine.getDosageForm())
                .strength(medicine.getStrength())
                .unitOfMeasure(medicine.getUnitOfMeasure())
                .legalCategory(medicine.getLegalCategory())
                .category(medicine.getTherapeuticCategory().getName())
                .manufacturer(medicine.getManufacturer().getName())
                .build();

        InventoryResponse.PharmacySummary pharmacySummary = InventoryResponse.PharmacySummary.builder()
                .id(inventory.getPharmacy().getId())
                .name(inventory.getPharmacy().getName())
                .address(inventory.getPharmacy().getAddress())
                .build();

        return InventoryResponse.builder()
                .id(inventory.getId())
                .unitPrice(inventory.getUnitPrice())
                .currency(inventory.getCurrency())
                .stockQuantity(inventory.getStockQuantity())
                .expireDate(inventory.getExpireDate())
                .available(inventory.isAvailable())
                .imageUrl(inventory.getImage() != null ? inventory.getImage().getUrl() : null)
                .medicine(medicineSummary)
                .pharmacy(pharmacySummary)
                .build();
    }
}
