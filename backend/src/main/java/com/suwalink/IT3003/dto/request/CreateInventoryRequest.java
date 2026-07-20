package com.suwalink.IT3003.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateInventoryRequest {

    @NotNull(message = "medicineMasterId is required")
    private UUID medicineMasterId;

    @NotNull(message = "unitPrice is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "unitPrice must be greater than 0")
    private BigDecimal unitPrice;

    @NotNull(message = "stockQuantity is required")
    @PositiveOrZero(message = "stockQuantity cannot be negative")
    private Integer stockQuantity;

    @NotNull(message = "expireDate is required")
    @Future(message = "expireDate must be in the future")
    private LocalDate expireDate;

    private UUID imageId;
}
