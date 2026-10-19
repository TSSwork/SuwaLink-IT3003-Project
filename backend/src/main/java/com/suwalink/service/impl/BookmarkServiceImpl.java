package com.suwalink.service.impl;


import com.suwalink.service.BookmarkService;
import com.suwalink.dto.response.BookmarkResponse;
import com.suwalink.dto.response.InventoryResponse;
import com.suwalink.entity.Bookmark;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.User;
import com.suwalink.exception.DuplicateResourceException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.BookmarkRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.security.CurrentUserProvider;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BookmarkServiceImpl implements BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final InventoryRepository inventoryRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional
    public BookmarkResponse addBookmark(UUID inventoryId) {
        User user = currentUserProvider.getCurrentUser();

        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found"));

        if (bookmarkRepository.existsByUserIdAndInventoryId(user.getId(), inventoryId)) {
            throw new DuplicateResourceException("This item is already bookmarked");
        }

        Bookmark bookmark = Bookmark.builder()
                .user(user)
                .inventory(inventory)
                .build();

        Bookmark saved = bookmarkRepository.save(bookmark);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void removeBookmark(UUID inventoryId) {
        User user = currentUserProvider.getCurrentUser();

        Bookmark bookmark = bookmarkRepository.findByUserIdAndInventoryId(user.getId(), inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark not found"));

        bookmarkRepository.delete(bookmark);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookmarkResponse> listMyBookmarks() {
        User user = currentUserProvider.getCurrentUser();

        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    private BookmarkResponse toResponse(Bookmark bookmark) {
        Inventory inventory = bookmark.getInventory();
        MedicineMaster medicine = inventory.getMedicineMaster();
        Pharmacy pharmacy = inventory.getPharmacy();

        InventoryResponse inventoryResponse = InventoryResponse.builder()
                .id(inventory.getId())
                .unitPrice(inventory.getUnitPrice())
                .currency(inventory.getCurrency())
                .stockQuantity(inventory.getStockQuantity())
                .expireDate(inventory.getExpireDate())
                .available(inventory.isAvailable())
                .imageUrl(inventory.getImage() != null ? inventory.getImage().getUrl() : null)
                .medicine(InventoryResponse.MedicineSummary.builder()
                        .id(medicine.getId())
                        .brandName(medicine.getBrandName())
                        .genericName(medicine.getGenericName())
                        .dosageForm(medicine.getDosageForm())
                        .strength(medicine.getStrength())
                        .unitOfMeasure(medicine.getUnitOfMeasure())
                        .legalCategory(medicine.getLegalCategory())
                        .category(medicine.getTherapeuticCategory() != null
                                ? medicine.getTherapeuticCategory().getName() : null)
                        .manufacturer(medicine.getManufacturer() != null
                                ? medicine.getManufacturer().getName() : null)
                        .build())
                .pharmacy(InventoryResponse.PharmacySummary.builder()
                        .id(pharmacy.getId())
                        .name(pharmacy.getUser() != null ? pharmacy.getUser().getName() : null)
                        .address(pharmacy.getAddress())
                        .build())
                .build();

        return BookmarkResponse.builder()
                .id(bookmark.getId())
                .createdAt(bookmark.getCreatedAt())
                .inventory(inventoryResponse)
                .build();
    }
}

