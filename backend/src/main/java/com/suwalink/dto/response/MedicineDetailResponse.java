package com.suwalink.dto.response;

import com.suwalink.entity.PrescriptionStatus;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class MedicineDetailResponse {

    private final UUID medicineId;
    private final String brandName;
    private final String genericName;
    private final String dosageForm;
    private final String strength;
    private final String category;
    private final String manufacturer;
    private final PrescriptionStatus legalCategory;
    private final boolean requiresPrescription;
    private final String imageUrl;
    private final String description;
}
