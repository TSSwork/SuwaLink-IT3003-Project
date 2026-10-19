package com.suwalink.repository;

import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrescriptionRequestRepository extends JpaRepository<PrescriptionRequest, UUID> {

    List<PrescriptionRequest> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    List<PrescriptionRequest> findByStatusOrderByCreatedAtDesc(PrescriptionRequestStatus status);
}
