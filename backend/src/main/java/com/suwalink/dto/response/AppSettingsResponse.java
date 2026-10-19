package com.suwalink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AppSettingsResponse {
    private final boolean demoModePublic;
}
