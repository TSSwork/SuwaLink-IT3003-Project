package com.suwalink.repository;

import com.suwalink.entity.Reservation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    List<Reservation> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    List<Reservation> findByPharmacyIdOrderByCreatedAtDesc(UUID pharmacyId);

    boolean existsByPrescriptionResponseItem_PrescriptionResponse_Id(UUID responseId);

    void deleteByPharmacyId(UUID pharmacyId);
}
