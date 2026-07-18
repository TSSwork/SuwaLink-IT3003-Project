package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.Inventory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    List<Inventory> findByPharmacyId(UUID pharmacyId);

    Optional<Inventory> findByIdAndPharmacyId(UUID id, UUID pharmacyId);
}
