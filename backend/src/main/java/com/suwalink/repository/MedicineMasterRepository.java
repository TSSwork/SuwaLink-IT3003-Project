package com.suwalink.repository;

import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.MedicineStatus;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicineMasterRepository extends JpaRepository<MedicineMaster, UUID> {

    List<MedicineMaster> findByStatus(MedicineStatus status);

    List<MedicineMaster> findBySuggestedByPharmacyIdOrderByCreatedAtDesc(UUID pharmacyId);

    boolean existsByBrandNameIgnoreCaseAndStrengthIgnoreCaseAndDosageFormIgnoreCaseAndStatusIn(
            String brandName, String strength, String dosageForm, Collection<MedicineStatus> statuses);

    List<MedicineMaster> findBySuggestedByPharmacyIdIn(Collection<UUID> pharmacyIds);
}
