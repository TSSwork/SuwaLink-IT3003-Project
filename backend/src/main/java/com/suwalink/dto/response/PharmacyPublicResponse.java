package com.suwalink.dto.response;

import com.suwalink.entity.Currency;
import com.suwalink.entity.District;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class PharmacyPublicResponse {

    private final UUID id;
    private final String name;
    private final String phone;
    private final String address;
    private final District district;
    private final String city;
    private final BigDecimal latitude;
    private final BigDecimal longitude;
    private final String openingHours;
    private final List<Item> items;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Item {
        private final UUID inventoryId;
        private final UUID medicineId;
        private final String brandName;
        private final String genericName;
        private final String strength;
        private final String dosageForm;
        private final boolean requiresPrescription;
        private final BigDecimal unitPrice;
        private final Currency currency;
        private final Integer stockQuantity;
    }
}
