package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.PrescriptionResponseItem;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrescriptionResponseItemRepository extends JpaRepository<PrescriptionResponseItem, UUID> {
}
