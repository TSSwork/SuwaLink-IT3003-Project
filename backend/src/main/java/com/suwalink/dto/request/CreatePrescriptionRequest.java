package com.suwalink.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

/**
 * Bound from a multipart/form-data request: `image` is a file part, `patientAge` and `note`
 * are plain text parts (a textarea and a number input on the frontend).
 */
@Getter
@Setter
public class CreatePrescriptionRequest {

    @NotNull(message = "Prescription image is required")
    private MultipartFile image;

    @NotNull(message = "Patient age is required")
    @Min(value = 0, message = "Patient age cannot be negative")
    @Max(value = 120, message = "Patient age must be realistic")
    private Integer patientAge;

    @Size(max = 1000, message = "Note must be at most 1000 characters")
    private String note;
}
