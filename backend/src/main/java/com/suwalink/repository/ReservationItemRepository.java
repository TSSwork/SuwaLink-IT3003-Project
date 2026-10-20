package com.suwalink.repository;

import com.suwalink.entity.ReservationItem;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationItemRepository extends JpaRepository<ReservationItem, UUID> {

    /** True when any reservation line was made from one of this prescription response's items. */
    boolean existsByPrescriptionResponseItem_PrescriptionResponse_Id(UUID responseId);
}
