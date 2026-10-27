package com.suwalink.dto.response;

import com.suwalink.entity.CancelledBy;
import com.suwalink.entity.District;
import com.suwalink.entity.ReservationStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ReservationResponse {

    private final UUID id;
    private final String pickupCode;
    private final ReservationStatus status;
    private final LocalDateTime expiresAt;
    private final LocalDateTime createdAt;
    private final String cancelReason;
    private final CancelledBy cancelledBy;
    private final UUID prescriptionRequestId;
    /** True when any line needs a prescription at pickup. */
    private final boolean requiresPrescription;
    private final BigDecimal total;
    private final PharmacySummary pharmacy;
    private final CustomerSummary customer;
    private final List<Item> items;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PharmacySummary {
        private final UUID id;
        private final String name;
        private final String phone;
        private final String address;
        private final String city;
        private final District district;
        private final BigDecimal latitude;
        private final BigDecimal longitude;
        private final String openingHours;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class CustomerSummary {
        private final UUID id;
        private final String name;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Item {
        private final UUID id;
        private final UUID inventoryItemId;
        private final String medicineName;
        private final Integer quantity;
        private final BigDecimal unitPrice;
        private final BigDecimal lineTotal;
        private final boolean requiresPrescription;
    }
}
