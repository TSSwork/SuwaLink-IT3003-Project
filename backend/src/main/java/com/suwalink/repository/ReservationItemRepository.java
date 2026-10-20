package com.suwalink.repository;

import com.suwalink.entity.ReservationItem;
import com.suwalink.entity.ReservationStatus;
import java.util.Collection;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationItemRepository extends JpaRepository<ReservationItem, UUID> {

    /** True when any reservation line was made from one of this prescription response's items. */
    boolean existsByPrescriptionResponseItem_PrescriptionResponse_Id(UUID responseId);

    /** Quantity of a quoted response item already taken by reservations in the given statuses. */
    @Query("select coalesce(sum(ri.quantity), 0) from ReservationItem ri "
            + "where ri.prescriptionResponseItem.id = :responseItemId and ri.reservation.status in :statuses")
    long sumQuantityByResponseItem(
            @Param("responseItemId") UUID responseItemId,
            @Param("statuses") Collection<ReservationStatus> statuses);
}
