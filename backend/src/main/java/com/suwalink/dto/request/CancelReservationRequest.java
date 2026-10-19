package com.suwalink.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CancelReservationRequest {

    @Size(max = 255, message = "reason must be at most 255 characters")
    private String reason;
}
