package com.suwalink.IT3003.dto.response;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ManufacturerResponse {

    private final UUID id;
    private final String name;
    private final String licenseNumber;
    private final String country;
    private final String contactEmail;
    private final String phone;
    private final boolean active;
}
