package com.suwalink.IT3003.dto.response;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class CategoryResponse {

    private final UUID id;
    private final String name;
    private final String description;
    private final UUID parentCategoryId;
    private final String parentCategoryName;
    private final boolean active;
}
