package com.suwalink.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.suwalink.dto.response.ApiErrorResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailSendException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

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

    /** Lock timeouts and lost optimistic-lock races surface as 409 through the real @ExceptionHandler dispatch. */
    @Test
    void lockingFailures_returnConflict_withRetryMessage() throws Exception {
        List<RuntimeException> failures = List.of(
            new PessimisticLockingFailureException("lock wait timeout"),
            new CannotAcquireLockException("deadlock"),
            new ObjectOptimisticLockingFailureException(Object.class, "id"),
            new jakarta.persistence.LockTimeoutException("timeout"),
            new jakarta.persistence.PessimisticLockException("locked"));

        for (RuntimeException failure : failures) {
            MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ThrowingController(failure))
                .setControllerAdvice(handler)
                .build();

            mockMvc.perform(get("/throw"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This item was just updated by someone else. Please try again."));
        }
    }

    @Test
    void everyHandlerSetsStableCode() {
        assertEquals("INTERNAL_ERROR", handler.handleUnexpected(new IllegalStateException("x")).getBody().getCode());
        assertEquals("ACCESS_DENIED", handler.handleAccessDenied(new AccessDeniedException("x")).getBody().getCode());
        assertEquals("NOT_FOUND", handler.handleResourceNotFound(new ResourceNotFoundException("x")).getBody().getCode());
        assertEquals("EMAIL_TAKEN",
            handler.handleEmailAlreadyExists(new EmailAlreadyExistsException("x")).getBody().getCode());
        assertEquals("DEMO_DISABLED",
            handler.handleDisabled(new org.springframework.security.authentication.DisabledException("x"))
                .getBody().getCode());
        assertEquals("UNAUTHENTICATED",
            handler.handleBadCredentials(new org.springframework.security.authentication.BadCredentialsException("x"))
                .getBody().getCode());
        assertEquals("CONCURRENT_UPDATE",
            handler.handleConcurrentUpdate(new PessimisticLockingFailureException("x")).getBody().getCode());
        assertEquals("DUPLICATE", handler.handleDuplicateResource(new DuplicateResourceException("x")).getBody().getCode());
    }

    @Test
    void duplicatePrescriptionResponseMapsTo409Duplicate() {
        ResponseEntity<ApiErrorResponse> response = handler.handleDataIntegrityViolation(
            new DataIntegrityViolationException("could not execute statement",
                new RuntimeException("Duplicate entry for key 'prescription_responses.UK_presc_responses_request_pharmacy'")));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("DUPLICATE", response.getBody().getCode());
        assertEquals("You have already responded; update your response instead", response.getBody().getMessage());
    }

    @Test
    void duplicateInventoryLineMapsTo409Duplicate() {
        // the service guard normally answers first; this is the constraint catching a concurrent add
        ResponseEntity<ApiErrorResponse> response = handler.handleDataIntegrityViolation(
            new DataIntegrityViolationException("could not execute statement",
                new RuntimeException("Duplicate entry for key 'inventory.uk_inventory_pharmacy_medicine'")));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("DUPLICATE", response.getBody().getCode());
        assertEquals("This medicine is already in your stock; edit that item instead", response.getBody().getMessage());
    }

    @Test
    void otherIntegrityViolationKeepsGenericMessageWithCode() {
        assertEquals("DATA_CONFLICT",
            handler.handleDataIntegrityViolation(new DataIntegrityViolationException("FK violation")).getBody().getCode());
    }

    @RestController
    static class ThrowingController {
        private final RuntimeException failure;

        ThrowingController(RuntimeException failure) {
            this.failure = failure;
        }

        @GetMapping("/throw")
        String fail() {
            throw failure;
        }
    }
}
