package com.suwalink.dto.response;

import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.MedicineStatus;
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
    private final MedicineStatus status;
    private final String rejectionReason;
    private final String suggestedByPharmacyName;

    public static MedicineMasterResponse of(MedicineMaster medicine) {
        return MedicineMasterResponse.builder()
            .id(medicine.getId())
            .brandName(medicine.getBrandName())
            .genericName(medicine.getGenericName())
            .dosageForm(medicine.getDosageForm())
            .strength(medicine.getStrength())
            .unitOfMeasure(medicine.getUnitOfMeasure())
            .description(medicine.getDescription())
            .legalCategory(medicine.getLegalCategory())
            .imageUrl(medicine.getImageUrl())
            .therapeuticCategoryId(medicine.getTherapeuticCategory().getId())
            .therapeuticCategoryName(medicine.getTherapeuticCategory().getName())
            .manufacturerId(medicine.getManufacturer().getId())
            .manufacturerName(medicine.getManufacturer().getName())
            .status(medicine.getStatus())
            .rejectionReason(medicine.getRejectionReason())
            .suggestedByPharmacyName(medicine.getSuggestedByPharmacy() != null
                ? medicine.getSuggestedByPharmacy().getName() : null)
            .build();
    }
}
