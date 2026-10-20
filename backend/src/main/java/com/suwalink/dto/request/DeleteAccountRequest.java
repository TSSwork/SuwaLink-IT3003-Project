package com.suwalink.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class DeleteAccountRequest {

    @NotBlank(message = "Password is required")
    private String password;
}
