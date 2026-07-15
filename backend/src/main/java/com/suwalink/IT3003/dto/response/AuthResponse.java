package com.suwalink.IT3003.dto.response;

import com.suwalink.IT3003.entity.Role;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AuthResponse {

    private final String token;
    private final Role role;
    private final UUID id;
    private final String name;
}
