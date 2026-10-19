package com.suwalink.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.suwalink.entity.Role;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(
        "test-secret-value-that-is-long-enough-for-hmac-sha256-signing",
        86400000L);

    @Test
    void generateToken_thenExtractEmail_returnsOriginalEmail() {
        String token = jwtService.generateToken(UUID.randomUUID(), "nimal@example.com", Role.CUSTOMER);

        assertThat(jwtService.extractEmail(token)).isEqualTo("nimal@example.com");
    }

    @Test
    void isTokenValid_forFreshlyGeneratedToken_returnsTrue() {
        String token = jwtService.generateToken(UUID.randomUUID(), "nimal@example.com", Role.CUSTOMER);

        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    void isTokenValid_forGarbageToken_returnsFalse() {
        assertThat(jwtService.isTokenValid("not.a.valid.token")).isFalse();
    }
}
