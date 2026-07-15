package com.suwalink.IT3003.dto.response;

import com.suwalink.IT3003.entity.Role;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class UserProfileResponse {

    private final UUID id;
    private final String name;
    private final String email;
    private final String phone;
    private final Role role;
    private final PharmacyInfo pharmacy;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PharmacyInfo {
        private final UUID id;
        private final String licenceNo;
        private final String address;
        private final boolean verified;
    }
}
