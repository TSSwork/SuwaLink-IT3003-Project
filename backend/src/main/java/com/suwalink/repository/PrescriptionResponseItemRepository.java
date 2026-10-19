package com.suwalink.repository;

import com.suwalink.entity.PrescriptionResponseItem;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrescriptionResponseItemRepository extends JpaRepository<PrescriptionResponseItem, UUID> {
}
