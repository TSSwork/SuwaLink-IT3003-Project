package com.suwalink.dto.request;

import com.suwalink.entity.District;
import com.suwalink.entity.TargetScope;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

/**
 * Bound from a multipart/form-data request: `image` is a file part; the rest are plain text parts.
 * `latitude`/`longitude` are required for {@link TargetScope#RADIUS_10KM}, `district` for
 * {@link TargetScope#DISTRICT}.
 */
@Getter
@Setter
public class CreatePrescriptionRequest {

    private static final BigDecimal MIN_LATITUDE = new BigDecimal("5.85");
    private static final BigDecimal MAX_LATITUDE = new BigDecimal("9.90");
    private static final BigDecimal MIN_LONGITUDE = new BigDecimal("79.50");
    private static final BigDecimal MAX_LONGITUDE = new BigDecimal("81.95");

    @NotNull(message = "Prescription image is required")
    private MultipartFile image;

    @NotNull(message = "Patient age is required")
    @Min(value = 0, message = "Patient age cannot be negative")
    @Max(value = 120, message = "Patient age must be realistic")
    private Integer patientAge;

    @Size(max = 1000, message = "Note must be at most 1000 characters")
    private String note;

    @NotNull(message = "Choose who should receive the request")
    private TargetScope targetScope;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private District district;

    @NotNull(message = "You must agree to share the prescription with the selected pharmacies")
    @AssertTrue(message = "You must agree to share the prescription with the selected pharmacies")
    private Boolean consent;

    @AssertTrue(message = "Location is required for 'Within 10 km'; district is required for 'My district'")
    public boolean isScopeLocationValid() {
        if (targetScope == null) {
            return true; // reported by @NotNull on targetScope
        }
        return switch (targetScope) {
            case RADIUS_10KM -> latitude != null && longitude != null
                && within(latitude, MIN_LATITUDE, MAX_LATITUDE)
                && within(longitude, MIN_LONGITUDE, MAX_LONGITUDE);
            case DISTRICT -> district != null;
            case ALL -> true;
        };
    }

    private static boolean within(BigDecimal value, BigDecimal min, BigDecimal max) {
        return value.compareTo(min) >= 0 && value.compareTo(max) <= 0;
    }
}
