package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.Inventory;
import com.suwalink.IT3003.entity.PrescriptionStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    List<Inventory> findByPharmacyId(UUID pharmacyId);

    Optional<Inventory> findByIdAndPharmacyId(UUID id, UUID pharmacyId);

    @Query("SELECT i FROM Inventory i WHERE i.available = true "
            + "AND (:query IS NULL OR :query = '' "
            + "     OR LOWER(i.medicineMaster.brandName) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "     OR LOWER(i.medicineMaster.genericName) LIKE LOWER(CONCAT('%', :query, '%'))) "
            + "AND (:categoryId IS NULL OR i.medicineMaster.therapeuticCategory.id = :categoryId) "
            + "AND (:manufacturerId IS NULL OR i.medicineMaster.manufacturer.id = :manufacturerId) "
            + "AND (:legalCategory IS NULL OR i.medicineMaster.legalCategory = :legalCategory) "
            + "AND (:minPrice IS NULL OR i.unitPrice >= :minPrice) "
            + "AND (:maxPrice IS NULL OR i.unitPrice <= :maxPrice)")
    List<Inventory> search(
            @Param("query") String query,
            @Param("categoryId") UUID categoryId,
            @Param("manufacturerId") UUID manufacturerId,
            @Param("legalCategory") PrescriptionStatus legalCategory,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice);
}