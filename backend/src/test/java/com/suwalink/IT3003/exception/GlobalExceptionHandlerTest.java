package com.suwalink.IT3003.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.suwalink.IT3003.dto.response.ApiErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailSendException;
import org.springframework.security.access.AccessDeniedException;

/**
 * Plain unit tests (no Spring context) for the exception-handling gaps found and fixed here:
 * DataIntegrityViolationException, MailException, AccessDeniedException, and unexpected
 * exceptions used to fall through to Spring's default whitelabel error page instead of the
 * app's standard {@link ApiErrorResponse} shape.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleDataIntegrityViolation_returnsConflict() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleDataIntegrityViolation(new DataIntegrityViolationException("FK violation"));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(
            "This action can't be completed because related data still references it",
            response.getBody().getMessage());
    }

    @Test
    void handleMailFailure_returnsBadGateway_notServerError() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleMailFailure(new MailSendException("SMTP auth failed"));

        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Could not send the email. Please try again shortly.", response.getBody().getMessage());
    }

    @Test
    void handleAccessDenied_returnsForbidden() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleAccessDenied(new AccessDeniedException("not allowed"));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void handleUnexpected_returnsInternalServerError_withGenericMessage() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleUnexpected(new IllegalStateException("something exploded"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Something went wrong. Please try again.", response.getBody().getMessage());
    }

    @Test
    void handleInvalidOtp_returnsBadRequest_withOriginalMessage() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleInvalidOtp(new InvalidOtpException("Invalid code"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Invalid code", response.getBody().getMessage());
    }
}
