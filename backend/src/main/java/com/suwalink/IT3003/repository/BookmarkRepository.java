package com.suwalink.IT3003.repository;


import com.suwalink.IT3003.entity.Bookmark;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

    List<Bookmark> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Bookmark> findByUserIdAndInventoryId(UUID userId, UUID inventoryId);

    boolean existsByUserIdAndInventoryId(UUID userId, UUID inventoryId);

    void deleteByUserIdAndInventoryId(UUID userId, UUID inventoryId);

    void deleteByInventory_PharmacyId(UUID pharmacyId);
}
