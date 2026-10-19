package com.suwalink.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ManufacturerRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String licenseNumber;

    @NotBlank(message = "Country is required")
    private String country;

    private String contactEmail;

    private String phone;
}
