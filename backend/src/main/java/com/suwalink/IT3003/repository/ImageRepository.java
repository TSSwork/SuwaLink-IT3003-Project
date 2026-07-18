package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.Image;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageRepository extends JpaRepository<Image, UUID> {
}
