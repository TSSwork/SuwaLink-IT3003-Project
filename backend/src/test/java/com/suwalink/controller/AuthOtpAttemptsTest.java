package com.suwalink.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.MailService;
import java.time.LocalDateTime;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Not transactional: the wrong-attempt counter must survive the rejected request's transaction. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthOtpAttemptsTest {

    private static final String EMAIL = "otp.attempts@example.com";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @MockitoBean MailService mailService;

    @AfterEach
    void cleanup() {
        users.findByEmail(EMAIL).ifPresent(users::delete);
    }

    @Test
    void fiveWrongOtpsInvalidateTheCode() throws Exception {
        givenUserWithOtp("123456");
        for (int i = 0; i < 4; i++) {
            reset("000000").andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Invalid code"));
        }
        assertThat(users.findByEmail(EMAIL).orElseThrow().getResetOtpAttempts()).isEqualTo(4);
        reset("000000").andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Invalid code"));
        assertThat(users.findByEmail(EMAIL).orElseThrow().getResetOtp()).isNull();

        reset("123456").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        assertThat(users.findByEmail(EMAIL).orElseThrow().getPassword()).isEqualTo("{noop}unchanged");
    }

    @Test
    void correctOtpAfterFourWrongIsAccepted() throws Exception {
        givenUserWithOtp("123456");
        for (int i = 0; i < 4; i++) {
            reset("000000").andExpect(status().isBadRequest());
        }
        reset("123456").andExpect(status().isOk());
        User user = users.findByEmail(EMAIL).orElseThrow();
        assertThat(user.getResetOtp()).isNull();
        assertThat(user.getResetOtpAttempts()).isZero();
    }

    @Test
    void forgotPasswordResetsTheCounter() throws Exception {
        givenUserWithOtp("123456");
        reset("000000").andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + EMAIL + "\"}"))
            .andExpect(status().isOk());
        assertThat(users.findByEmail(EMAIL).orElseThrow().getResetOtpAttempts()).isZero();
    }

    private void givenUserWithOtp(String otp) {
        users.save(User.builder().name("Otp Test").email(EMAIL).phone("0771234567")
            .password("{noop}unchanged").role(Role.CUSTOMER).termsAcceptedAt(LocalDateTime.now())
            .resetOtp(otp).resetOtpExpiry(LocalDateTime.now().plusMinutes(10)).build());
    }

    private ResultActions reset(String otp) throws Exception {
        return mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"%s\",\"otp\":\"%s\",\"newPassword\":\"NewSecurePass123\"}".formatted(EMAIL, otp)));
    }
}
