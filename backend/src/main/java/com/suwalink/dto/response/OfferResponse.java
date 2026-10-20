package com.suwalink.dto.response;

import com.suwalink.entity.Currency;
import com.suwalink.entity.District;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class OfferResponse {

    private final UUID inventoryId;
    private final BigDecimal unitPrice;
    private final Currency currency;
    private final Integer stockQuantity;
    private final LocalDate expireDate;
    private final Double distanceKm;
    private final PharmacySummary pharmacy;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PharmacySummary {
        private final UUID id;
        private final String name;
        private final String phone;
        private final String address;
        private final District district;
        private final String city;
        private final BigDecimal latitude;
        private final BigDecimal longitude;
        private final String openingHours;
    }
}
