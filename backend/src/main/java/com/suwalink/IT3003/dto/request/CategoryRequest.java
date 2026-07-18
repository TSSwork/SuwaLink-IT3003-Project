package com.suwalink.IT3003.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategoryRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    private UUID parentCategoryId;
}
