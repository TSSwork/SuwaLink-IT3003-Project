package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.Manufacturer;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManufacturerRepository extends JpaRepository<Manufacturer, UUID> {
}
