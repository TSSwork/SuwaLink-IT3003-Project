package com.suwalink.dto.response;

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
public class PrescriptionResponseResponse {

    private final UUID id;
    private final UUID prescriptionRequestId;
    private final UUID pharmacyId;
    private final String pharmacyName;
    private final String message;
    private final List<ResponseItemSummary> items;
    private final LocalDateTime createdAt;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ResponseItemSummary {
        private final UUID id;
        private final UUID inventoryItemId;
        private final String medicineBrandName;
        private final Integer quantity;
        private final BigDecimal unitPrice;
    }
}
