package com.suwalink.repository;

import com.suwalink.entity.Manufacturer;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManufacturerRepository extends JpaRepository<Manufacturer, UUID> {

    boolean existsByName(String name);

    List<Manufacturer> findByIsActiveTrueOrderByNameAsc();
}
