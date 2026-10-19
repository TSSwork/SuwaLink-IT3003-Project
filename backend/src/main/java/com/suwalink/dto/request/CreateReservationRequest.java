package com.suwalink.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateReservationRequest {

    @NotNull(message = "inventoryItemId is required")
    private UUID inventoryItemId;

    @NotNull(message = "quantity is required")
    @Positive(message = "quantity must be greater than 0")
    private Integer quantity;

    private UUID prescriptionResponseItemId;
}
