package com.suwalink.repository;

import com.suwalink.entity.PrescriptionResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrescriptionResponseRepository extends JpaRepository<PrescriptionResponse, UUID> {

    List<PrescriptionResponse> findByPrescriptionRequestIdOrderByCreatedAtDesc(UUID prescriptionRequestId);

    List<PrescriptionResponse> findByPrescriptionRequestIdAndPharmacyId(UUID prescriptionRequestId, UUID pharmacyId);

    List<PrescriptionResponse> findByPharmacyIdOrderByCreatedAtDesc(UUID pharmacyId);

    void deleteByPharmacyId(UUID pharmacyId);
}
