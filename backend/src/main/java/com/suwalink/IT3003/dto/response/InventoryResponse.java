package com.suwalink.IT3003.dto.response;

import com.suwalink.IT3003.entity.Currency;
import com.suwalink.IT3003.entity.PrescriptionStatus;
import com.suwalink.IT3003.entity.UnitOfMeasure;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class InventoryResponse {

    private final UUID id;
    private final BigDecimal unitPrice;
    private final Currency currency;
    private final Integer stockQuantity;
    private final LocalDate expireDate;
    private final boolean available;
    private final String imageUrl;
    private final MedicineSummary medicine;
    private final PharmacySummary pharmacy;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PharmacySummary {
        private final UUID id;
        private final String name;
        private final String address;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class MedicineSummary {
        private final UUID id;
        private final String brandName;
        private final String genericName;
        private final String dosageForm;
        private final String strength;
        private final UnitOfMeasure unitOfMeasure;
        private final PrescriptionStatus legalCategory;
        private final String category;
        private final String manufacturer;
    }
}
