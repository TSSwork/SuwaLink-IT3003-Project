package com.suwalink.IT3003.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateAvailabilityRequest {

    @NotNull(message = "available is required")
    private Boolean available;
}
