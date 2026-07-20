package com.suwalink.IT3003.dto.response;

import com.suwalink.IT3003.entity.PrescriptionStatus;
import com.suwalink.IT3003.entity.UnitOfMeasure;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class MedicineMasterResponse {

    private final UUID id;
    private final String brandName;
    private final String genericName;
    private final String dosageForm;
    private final String strength;
    private final UnitOfMeasure unitOfMeasure;
    private final String description;
    private final PrescriptionStatus legalCategory;
    private final String imageUrl;
    private final UUID therapeuticCategoryId;
    private final String therapeuticCategoryName;
    private final UUID manufacturerId;
    private final String manufacturerName;
}
