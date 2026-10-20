package com.suwalink.dto.response;

import com.suwalink.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** A demo login shown on the login page while demo mode is on. */
@Getter
@AllArgsConstructor
public class DemoAccountResponse {
    private final Role role;
    private final String email;
    private final String password;
}
