package com.suwalink.IT3003.dto.request;

import com.suwalink.IT3003.entity.PrescriptionStatus;
import com.suwalink.IT3003.entity.UnitOfMeasure;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MedicineMasterRequest {

    @NotBlank(message = "Brand name is required")
    private String brandName;

    @NotBlank(message = "Generic name is required")
    private String genericName;

    @NotBlank(message = "Dosage form is required")
    private String dosageForm;

    @NotBlank(message = "Strength is required")
    private String strength;

    @NotNull(message = "Unit of measure is required")
    private UnitOfMeasure unitOfMeasure;

    private String description;

    @NotNull(message = "therapeuticCategoryId is required")
    private UUID therapeuticCategoryId;

    @NotNull(message = "manufacturerId is required")
    private UUID manufacturerId;

    @NotNull(message = "legalCategory is required")
    private PrescriptionStatus legalCategory;

    private String imageUrl;
}
