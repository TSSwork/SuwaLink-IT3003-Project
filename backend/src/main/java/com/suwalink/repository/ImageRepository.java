package com.suwalink.repository;

import com.suwalink.entity.Image;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImageRepository extends JpaRepository<Image, UUID> {

    @Modifying
    @Query("UPDATE Image i SET i.uploadedByUserId = NULL WHERE i.uploadedByUserId = :userId")
    void clearUploadedBy(@Param("userId") UUID userId);
}
