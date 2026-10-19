package com.suwalink.repository;

import com.suwalink.entity.MedicineMaster;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicineMasterRepository extends JpaRepository<MedicineMaster, UUID> {
}
