package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.MedicineMaster;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicineMasterRepository extends JpaRepository<MedicineMaster, UUID> {
}
