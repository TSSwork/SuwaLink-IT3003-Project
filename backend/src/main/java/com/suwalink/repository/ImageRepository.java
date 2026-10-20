package com.suwalink.repository;

import com.suwalink.entity.Image;
import com.suwalink.entity.PrescriptionRequestStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImageRepository extends JpaRepository<Image, UUID> {

    Optional<Image> findByGeneratedFilename(String generatedFilename);

    /** Prescription images attached to requests that ended (closed/expired) before the cutoff and are not purged yet. */
    @Query("SELECT i.id FROM PrescriptionRequest r JOIN r.image i "
            + "WHERE r.status IN :statuses AND r.updatedAt < :cutoff AND i.purgedAt IS NULL")
    List<UUID> findPurgeableImageIds(
            @Param("statuses") Collection<PrescriptionRequestStatus> statuses,
            @Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("UPDATE Image i SET i.uploadedByUserId = NULL WHERE i.uploadedByUserId = :userId")
    void clearUploadedBy(@Param("userId") UUID userId);

    List<Image> findByUploadedByUserIdIn(Collection<UUID> userIds);
}
