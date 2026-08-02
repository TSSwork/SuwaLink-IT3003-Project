package com.suwalink.IT3003.dto.request;

import jakarta.validation.Valid;
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
public class CreatePrescriptionResponseRequest {

    @Size(max = 1000, message = "message must be at most 1000 characters")
    private String message;

    @NotEmpty(message = "items must contain at least one item")
    @Valid
    private List<ResponseItem> items;

    @Getter
    @Setter
    public static class ResponseItem {

        @NotNull(message = "inventoryItemId is required")
        private UUID inventoryItemId;

        @NotNull(message = "quantity is required")
        @Positive(message = "quantity must be greater than 0")
        private Integer quantity;
    }
}
