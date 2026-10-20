package com.suwalink.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AppSettingsResponse {
    private final boolean demoModePublic;
    /** Demo logins for the login page; empty when demo mode is off. */
    private final List<DemoAccountResponse> demoAccounts;
}
