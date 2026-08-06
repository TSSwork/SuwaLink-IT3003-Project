package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.Reservation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    List<Reservation> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    List<Reservation> findByPharmacyIdOrderByCreatedAtDesc(UUID pharmacyId);

    void deleteByPharmacyId(UUID pharmacyId);
}
