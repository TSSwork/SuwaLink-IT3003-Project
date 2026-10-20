package com.suwalink.dto.request;

import com.suwalink.entity.District;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdatePharmacyProfileRequest {

    @NotBlank(message = "Pharmacy name is required")
    @Size(max = 120, message = "Pharmacy name must be at most 120 characters")
    private String name;

    @NotBlank(message = "Phone is required")
    private String phone;

    @NotBlank(message = "Address is required")
    private String address;

    @NotNull(message = "District is required")
    private District district;

    @NotBlank(message = "City is required")
    @Size(max = 80, message = "City must be at most 80 characters")
    private String city;

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "5.85", message = "Latitude must be within Sri Lanka")
    @DecimalMax(value = "9.90", message = "Latitude must be within Sri Lanka")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "79.50", message = "Longitude must be within Sri Lanka")
    @DecimalMax(value = "81.95", message = "Longitude must be within Sri Lanka")
    private BigDecimal longitude;

    @Size(max = 255, message = "Opening hours must be at most 255 characters")
    private String openingHours;
}
