package com.suwalink.repository;

import com.suwalink.entity.District;
import com.suwalink.entity.Inventory;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    List<Inventory> findByPharmacyId(UUID pharmacyId);

    Optional<Inventory> findByIdAndPharmacyId(UUID id, UUID pharmacyId);

    /** Offers: available, in stock, unexpired, at a publicly visible pharmacy. Every filter is optional. */
    @Query("SELECT i FROM Inventory i "
            + "JOIN FETCH i.medicineMaster m "
            + "JOIN FETCH m.therapeuticCategory "
            + "JOIN FETCH m.manufacturer "
            + "JOIN FETCH i.pharmacy p "
            + "WHERE i.available = true "
            + "AND i.stockQuantity > 0 AND i.expireDate > :today "
            + "AND " + VisibilityJpql.VISIBLE_PHARMACY_P + " "
            + "AND " + VisibilityJpql.APPROVED_MEDICINE_M + " "
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
            + "AND " + VisibilityJpql.APPROVED_MEDICINE_M + " "
            + "ORDER BY m.brandName, i.unitPrice")
    List<Inventory> findOffersByPharmacy(
            @Param("pharmacyId") UUID pharmacyId,
            @Param("includeDemo") boolean includeDemo,
            @Param("today") LocalDate today);

    /**
     * Loads and row-locks (SELECT ... FOR UPDATE) the given items until the transaction ends, so
     * concurrent reservations of the same stock run one after another. Ordered by id so that two
     * transactions locking overlapping sets always lock in the same order (no deadlock).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "10000"))
    @Query("select i from Inventory i join fetch i.pharmacy join fetch i.medicineMaster "
            + "where i.id in :ids order by i.id")
    List<Inventory> lockAllById(@Param("ids") Collection<UUID> ids);

    List<Inventory> findByPharmacyIdIn(Collection<UUID> pharmacyIds);
}
