package com.suwalink.repository;

import com.suwalink.entity.Bookmark;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

    List<Bookmark> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Bookmark> findByUserIdAndInventoryId(UUID userId, UUID inventoryId);

    boolean existsByUserIdAndInventoryId(UUID userId, UUID inventoryId);

    void deleteByUserIdAndInventoryId(UUID userId, UUID inventoryId);

    void deleteByUserId(UUID userId);

    /** Bookmarks of any of the users, or on stock of any of the pharmacies (demo cleanup). */
    @Query("SELECT b FROM Bookmark b WHERE b.user.id IN :userIds OR b.inventory.pharmacy.id IN :pharmacyIds")
    List<Bookmark> findByUserIdInOrInventoryPharmacyIdIn(
            @Param("userIds") Collection<UUID> userIds, @Param("pharmacyIds") Collection<UUID> pharmacyIds);
}
