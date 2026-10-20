package com.suwalink.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(RateLimitTest.ClockConfig.class)
@TestPropertySource(properties = {
    "app.rate-limit.login.ip=10",
    "app.rate-limit.login.email=5",
    "app.rate-limit.forgot-password.email=3",
    "app.rate-limit.forgot-password.ip=10"
})
class RateLimitTest {

    static final class MutableClock extends Clock {
        private volatile Instant now = Instant.parse("2026-01-01T00:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    @TestConfiguration
    static class ClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock();
        }
    }

    @Autowired MockMvc mockMvc;
    @Autowired MutableClock clock;

    private ResultActions postJson(String path, String ip, String json) throws Exception {
        return mockMvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json)
            .with(r -> { r.setRemoteAddr(ip); return r; }));
    }

    private ResultActions login(String ip, String email) throws Exception {
        return postJson("/api/auth/login", ip, "{\"email\":\"%s\",\"password\":\"WrongPass123\"}".formatted(email));
    }

    @Test
    void sixthLoginForSameEmailIs429() throws Exception {
        for (int i = 0; i < 5; i++) {
            login("10.0.0." + i, "victim.a@example.com").andExpect(status().isUnauthorized());
        }
        // same address in a different case / padded still hits the same bucket
        login("10.0.0.99", "  Victim.A@Example.com ").andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"))
            .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void manyEmailsFromOneIpHitIpLimit() throws Exception {
        for (int i = 0; i < 10; i++) {
            login("10.1.0.1", "ip.user" + i + "@example.com").andExpect(status().isUnauthorized());
        }
        login("10.1.0.1", "ip.user10@example.com").andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        login("10.1.0.2", "ip.user10@example.com").andExpect(status().isUnauthorized());
    }

    @Test
    void forgotPasswordLimitedPerEmail() throws Exception {
        String body = "{\"email\":\"forgot.a@example.com\"}";
        for (int i = 0; i < 3; i++) {
            postJson("/api/auth/forgot-password", "10.2.0." + i, body).andExpect(status().isOk());
        }
        postJson("/api/auth/forgot-password", "10.2.0.9", body).andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"));
    }

    @Test
    void windowResets() throws Exception {
        for (int i = 0; i < 5; i++) {
            login("10.3.0." + i, "reset.a@example.com").andExpect(status().isUnauthorized());
        }
        login("10.3.0.9", "reset.a@example.com").andExpect(status().isTooManyRequests());
        clock.advance(Duration.ofMinutes(5).plusSeconds(1));
        login("10.3.0.9", "reset.a@example.com").andExpect(status().isUnauthorized());
    }
}
