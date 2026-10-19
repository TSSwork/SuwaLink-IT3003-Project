package com.suwalink.repository;

import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PharmacyRepository extends JpaRepository<Pharmacy, UUID> {

    boolean existsByLicenceNo(String licenceNo);

    Optional<Pharmacy> findByUserId(UUID userId);
    long countByStatus(PharmacyStatus status);
    List<Pharmacy> findByStatus(PharmacyStatus status);
}