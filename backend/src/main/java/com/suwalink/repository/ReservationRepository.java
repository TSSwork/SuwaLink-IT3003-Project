package com.suwalink.repository;

import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    /** Items, pharmacy and customer are fetched with the rows, so mapping a list doesn't lazy-load per reservation. */
    @EntityGraph(attributePaths = {"items", "pharmacy", "patient"})
    List<Reservation> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    @EntityGraph(attributePaths = {"items", "pharmacy", "patient"})
    List<Reservation> findByPharmacyIdOrderByCreatedAtDesc(UUID pharmacyId);

    @EntityGraph(attributePaths = {"items", "pharmacy", "patient"})
    Optional<Reservation> findByPickupCode(String pickupCode);

    @EntityGraph(attributePaths = {"items"})
    List<Reservation> findByStatusAndExpiresAtBefore(ReservationStatus status, LocalDateTime time);

    boolean existsByPickupCode(String pickupCode);

    @EntityGraph(attributePaths = {"items"})
    List<Reservation> findByPatientIdAndStatus(UUID patientId, ReservationStatus status);

    boolean existsByPharmacyIdAndStatus(UUID pharmacyId, ReservationStatus status);

    boolean existsByPrescriptionRequestId(UUID prescriptionRequestId);

    void deleteByPharmacyId(UUID pharmacyId);
}
