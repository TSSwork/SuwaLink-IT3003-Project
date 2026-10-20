package com.suwalink.repository;

import com.suwalink.entity.District;
import com.suwalink.entity.Inventory;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    List<Inventory> findByPharmacyId(UUID pharmacyId);

    Optional<Inventory> findByIdAndPharmacyId(UUID id, UUID pharmacyId);

    void deleteByPharmacyId(UUID pharmacyId);

    /** Offers: available, in stock, unexpired, at a publicly visible pharmacy. Every filter is optional. */
    @Query("SELECT i FROM Inventory i "
            + "JOIN FETCH i.medicineMaster m "
            + "JOIN FETCH m.therapeuticCategory "
            + "JOIN FETCH m.manufacturer "
            + "JOIN FETCH i.pharmacy p "
            + "WHERE i.available = true "
            + "AND i.stockQuantity > 0 AND i.expireDate > :today "
            + "AND " + VisibilityJpql.VISIBLE_PHARMACY_P + " "
            + "AND (:query IS NULL "
            + "     OR LOWER(m.brandName) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "     OR LOWER(m.genericName) LIKE LOWER(CONCAT('%', :query, '%'))) "
            + "AND (:categoryId IS NULL OR m.therapeuticCategory.id = :categoryId) "
            + "AND (:medicineId IS NULL OR m.id = :medicineId) "
            + "AND (:district IS NULL OR p.district = :district)")
    List<Inventory> findOffers(
            @Param("query") String query,
            @Param("categoryId") UUID categoryId,
            @Param("medicineId") UUID medicineId,
            @Param("district") District district,
            @Param("includeDemo") boolean includeDemo,
            @Param("today") LocalDate today);

    /** One pharmacy's offers (same rule as {@link #findOffers}), ordered by brand name. */
    @Query("SELECT i FROM Inventory i "
            + "JOIN FETCH i.medicineMaster m "
            + "JOIN FETCH i.pharmacy p "
            + "WHERE p.id = :pharmacyId "
            + "AND i.available = true "
            + "AND i.stockQuantity > 0 AND i.expireDate > :today "
            + "AND " + VisibilityJpql.VISIBLE_PHARMACY_P + " "
            + "ORDER BY m.brandName, i.unitPrice")
    List<Inventory> findOffersByPharmacy(
            @Param("pharmacyId") UUID pharmacyId,
            @Param("includeDemo") boolean includeDemo,
            @Param("today") LocalDate today);
}
