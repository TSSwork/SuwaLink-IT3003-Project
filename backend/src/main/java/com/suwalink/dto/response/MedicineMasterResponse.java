package com.suwalink.dto.response;

import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.UnitOfMeasure;
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
