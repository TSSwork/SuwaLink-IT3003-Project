package com.suwalink.repository;

import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrescriptionRequestRepository extends JpaRepository<PrescriptionRequest, UUID> {

    List<PrescriptionRequest> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    /** Requests in the given statuses that target the pharmacy, newest first. */
    @Query("SELECT r FROM PrescriptionRequest r JOIN r.targetPharmacies p "
            + "WHERE p.id = :pharmacyId AND r.status IN :statuses ORDER BY r.createdAt DESC")
    List<PrescriptionRequest> findTargetingPharmacy(
            @Param("pharmacyId") UUID pharmacyId,
            @Param("statuses") Collection<PrescriptionRequestStatus> statuses);

    /** Whether the pharmacy is one of the request's targets. */
    boolean existsByIdAndTargetPharmacies_Id(UUID requestId, UUID pharmacyId);

    List<PrescriptionRequest> findByStatusInAndExpiresAtBefore(
            Collection<PrescriptionRequestStatus> statuses, LocalDateTime cutoff);
}
