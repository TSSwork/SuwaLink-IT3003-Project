package com.suwalink.repository;

import com.suwalink.entity.District;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PharmacyRepository extends JpaRepository<Pharmacy, UUID> {

    boolean existsByLicenceNo(String licenceNo);

    Optional<Pharmacy> findByUserId(UUID userId);
    long countByStatus(PharmacyStatus status);
    List<Pharmacy> findByStatus(PharmacyStatus status);

    @Query("SELECT p FROM Pharmacy p WHERE " + VisibilityJpql.VISIBLE_PHARMACY_P)
    List<Pharmacy> findVisible(@Param("includeDemo") boolean includeDemo);

    @Query("SELECT p FROM Pharmacy p WHERE p.district = :district AND " + VisibilityJpql.VISIBLE_PHARMACY_P)
    List<Pharmacy> findVisibleByDistrict(
            @Param("district") District district, @Param("includeDemo") boolean includeDemo);

    @Query("SELECT p FROM Pharmacy p WHERE p.latitude BETWEEN :minLat AND :maxLat "
            + "AND p.longitude BETWEEN :minLng AND :maxLng AND " + VisibilityJpql.VISIBLE_PHARMACY_P)
    List<Pharmacy> findVisibleInBox(
            @Param("minLat") BigDecimal minLat, @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng, @Param("maxLng") BigDecimal maxLng,
            @Param("includeDemo") boolean includeDemo);
}
