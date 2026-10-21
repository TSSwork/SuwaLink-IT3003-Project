package com.suwalink.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.User;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.MailService;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * Covers the forgot-password/reset-password flow added in the password_reset merge - no test
 * coverage existed for it before. {@link MailService} is mocked so these tests don't depend on
 * real Gmail SMTP credentials being configured.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthPasswordResetTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private MailService mailService;

    @Test
    void forgotPassword_unknownEmail_stillReturnsGenericSuccess() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "does.not.exist@example.com" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("A password reset code has been sent to your email"));

        verifyNoInteractions(mailService);
    }

    @Test
    void forgotPassword_knownEmail_sendsOtpAndReturnsSameGenericMessage() throws Exception {
        String email = "reset.known@example.com";
        registerCustomer(email);
        doNothing().when(mailService).sendPasswordResetOtp(any(), any());

        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s" }
                    """.formatted(email)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("A password reset code has been sent to your email"));

        verify(mailService).sendPasswordResetOtp(any(), any());

        User user = userRepository.findByEmail(email).orElseThrow();
        org.junit.jupiter.api.Assertions.assertNotNull(user.getResetOtp());
        org.junit.jupiter.api.Assertions.assertNotNull(user.getResetOtpExpiry());
    }

    @Test
    void resetPassword_withCorrectOtp_succeedsAndAllowsNewPasswordLogin() throws Exception {
        String email = "reset.success@example.com";
        registerCustomer(email);
        setOtp(email, "123456", LocalDateTime.now().plusMinutes(10));

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s", "otp": "123456", "newPassword": "NewSecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s", "password": "NewSecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void resetPassword_withWrongOtp_isRejected() throws Exception {
        String email = "reset.wrongotp@example.com";
        registerCustomer(email);
        setOtp(email, "123456", LocalDateTime.now().plusMinutes(10));

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s", "otp": "000000", "newPassword": "NewSecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Invalid code"));
    }

    @Test
    void resetPassword_withExpiredOtp_isRejected() throws Exception {
        String email = "reset.expired@example.com";
        registerCustomer(email);
        setOtp(email, "123456", LocalDateTime.now().minusMinutes(1));

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s", "otp": "123456", "newPassword": "NewSecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.message").value("Invalid code"));
    }

    @Test
    void resetPassword_withoutRequestingOtpFirst_isRejected() throws Exception {
        String email = "reset.norequest@example.com";
        registerCustomer(email);

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s", "otp": "123456", "newPassword": "NewSecurePass123" }
                    """.formatted(email)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.message").value("Invalid code"));
    }

    @Test
    void resetPassword_unknownEmail_answersExactlyLikeAWrongCode() throws Exception {
        String email = "reset.compare@example.com";
        registerCustomer(email);
        setOtp(email, "123456", LocalDateTime.now().plusMinutes(10));

        MvcResult wrongCode = resetWith(email, "000000");
        MvcResult unknownEmail = resetWith("nobody.here@example.com", "000000");

        assertThat(wrongCode.getResponse().getStatus()).isEqualTo(400);
        assertThat(unknownEmail.getResponse().getStatus()).isEqualTo(400);
        String wrongBody = wrongCode.getResponse().getContentAsString();
        String unknownBody = unknownEmail.getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(unknownBody, "$.code")).isEqualTo("VALIDATION_FAILED");
        assertThat(JsonPath.<String>read(unknownBody, "$.code"))
            .isEqualTo(JsonPath.<String>read(wrongBody, "$.code"));
        assertThat(JsonPath.<String>read(unknownBody, "$.message"))
            .isEqualTo(JsonPath.<String>read(wrongBody, "$.message"));
    }

    private MvcResult resetWith(String email, String otp) throws Exception {
        return mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "email": "%s", "otp": "%s", "newPassword": "NewSecurePass123" }
                    """.formatted(email, otp)))
            .andReturn();
    }

    private void registerCustomer(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "name": "Reset Test", "email": "%s", "phone": "0771234567", "password": "SecurePass123", "acceptTerms": true }
                    """.formatted(email)))
            .andExpect(status().isCreated());
    }

    private void setOtp(String email, String otp, LocalDateTime expiry) {
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setResetOtp(otp);
        user.setResetOtpExpiry(expiry);
        userRepository.save(user);
    }
}
