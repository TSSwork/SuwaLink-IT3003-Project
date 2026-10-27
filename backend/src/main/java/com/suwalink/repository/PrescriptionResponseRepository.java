package com.suwalink.repository;

import com.suwalink.entity.PrescriptionResponse;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrescriptionResponseRepository extends JpaRepository<PrescriptionResponse, UUID> {

    List<PrescriptionResponse> findByPrescriptionRequestIdOrderByCreatedAtDesc(UUID prescriptionRequestId);

    List<PrescriptionResponse> findByPrescriptionRequestIdAndPharmacyId(UUID prescriptionRequestId, UUID pharmacyId);

    List<PrescriptionResponse> findByPharmacyIdOrderByCreatedAtDesc(UUID pharmacyId);

    void deleteByPharmacyId(UUID pharmacyId);

    boolean existsByPrescriptionRequestId(UUID prescriptionRequestId);

    /** Number of responses per request, for all requests of one patient: rows of {requestId, count}. */
    @Query("SELECT r.prescriptionRequest.id, COUNT(r) FROM PrescriptionResponse r "
            + "WHERE r.prescriptionRequest.patient.id = :patientId GROUP BY r.prescriptionRequest.id")
    List<Object[]> countByRequestForPatient(@Param("patientId") UUID patientId);

    /** Responses given by any of the pharmacies or made to a request of any of the customers (demo cleanup). */
    @Query("SELECT r FROM PrescriptionResponse r "
            + "WHERE r.pharmacy.id IN :pharmacyIds OR r.prescriptionRequest.patient.id IN :patientIds")
    List<PrescriptionResponse> findByPharmacyIdInOrRequestPatientIdIn(
            @Param("pharmacyIds") Collection<UUID> pharmacyIds, @Param("patientIds") Collection<UUID> patientIds);
}
