package com.suwalink.dto.response;

import com.suwalink.entity.ReservationStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ReservationResponse {

    private final UUID id;
    private final UUID patientId;
    private final String patientName;
    private final UUID pharmacyId;
    private final String pharmacyName;
    private final UUID inventoryItemId;
    private final String medicineBrandName;
    private final Integer quantity;
    private final BigDecimal unitPrice;
    private final ReservationStatus status;
    private final String cancelReason;
    private final LocalDateTime createdAt;
}
