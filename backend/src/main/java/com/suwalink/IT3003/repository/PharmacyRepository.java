package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.Pharmacy;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PharmacyRepository extends JpaRepository<Pharmacy, UUID> {

    boolean existsByLicenceNo(String licenceNo);

    Optional<Pharmacy> findByUserId(UUID userId);
}
