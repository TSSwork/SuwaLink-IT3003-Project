package com.suwalink.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateReservationRequest {

    @NotEmpty(message = "lines must contain at least one item")
    @Size(max = 20, message = "A reservation can have at most 20 items")
    private List<@NotNull(message = "lines must not contain empty entries") @Valid Line> lines;

    @Getter
    @Setter
    public static class Line {

        @NotNull(message = "inventoryItemId is required")
        private UUID inventoryItemId;

        @NotNull(message = "quantity is required")
        @Positive(message = "quantity must be greater than 0")
        @Max(value = 100, message = "quantity must be at most 100")
        private Integer quantity;

        /** Optional: reserve at the price quoted in this prescription response item. */
        private UUID prescriptionResponseItemId;
    }
}
