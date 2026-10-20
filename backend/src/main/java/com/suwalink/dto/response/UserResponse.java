package com.suwalink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private String id;
    private String name;
    private String email;
    private String phone;
    private String role;
    /** ACTIVE, SUSPENDED or DELETED ({@link com.suwalink.entity.AccountStatus}). */
    private String status;
}
