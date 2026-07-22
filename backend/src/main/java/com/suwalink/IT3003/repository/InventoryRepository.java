package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.Inventory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    List<Inventory> findByPharmacyId(UUID pharmacyId);

    Optional<Inventory> findByIdAndPharmacyId(UUID id, UUID pharmacyId);

    @Query("SELECT i FROM Inventory i WHERE i.available = true AND ("
        + "LOWER(i.medicineMaster.brandName) LIKE LOWER(CONCAT('%', :query, '%')) "
        + "OR LOWER(i.medicineMaster.genericName) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Inventory> searchAvailableByMedicineName(@Param("query") String query);
}
