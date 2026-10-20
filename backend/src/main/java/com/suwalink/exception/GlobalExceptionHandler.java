package com.suwalink.exception;

import com.suwalink.dto.response.ApiErrorResponse;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mail.MailException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ApiErrorResponse> handleEmailAlreadyExists(EmailAlreadyExistsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(PharmacyNotVerifiedException.class)
    public ResponseEntity<ApiErrorResponse> handlePharmacyNotVerified(PharmacyNotVerifiedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateResource(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InventoryAccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleInventoryAccessDenied(InventoryAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(PrescriptionAccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handlePrescriptionAccessDenied(PrescriptionAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(PrescriptionRequestClosedException.class)
    public ResponseEntity<ApiErrorResponse> handlePrescriptionRequestClosed(PrescriptionRequestClosedException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(NoPharmaciesInScopeException.class)
    public ResponseEntity<ApiErrorResponse> handleNoPharmaciesInScope(NoPharmaciesInScopeException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ApiErrorResponse> handleInsufficientStock(InsufficientStockException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(ItemUnavailableException.class)
    public ResponseEntity<ApiErrorResponse> handleItemUnavailable(ItemUnavailableException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InvalidReservationRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidReservationRequest(InvalidReservationRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(ReservationAccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleReservationAccessDenied(ReservationAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InvalidReservationStateException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidReservationState(InvalidReservationStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidFile(InvalidFileException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(FileStorageException.class)
    public ResponseEntity<ApiErrorResponse> handleFileStorage(FileStorageException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiErrorResponse.builder()
                .message("Could not process the uploaded image")
                .build());
    }

    @ExceptionHandler(InvalidOtpException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidOtp(InvalidOtpException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiErrorResponse.builder()
                .message("Invalid email or password")
                .build());
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiErrorResponse> handleDisabled(DisabledException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .message("Demo accounts are currently disabled")
                .build());
    }

    @ExceptionHandler(MailException.class)
    public ResponseEntity<ApiErrorResponse> handleMailFailure(MailException ex) {
        log.error("Failed to send an email", ex);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(ApiErrorResponse.builder()
                .message("Could not send the email. Please try again shortly.")
                .build());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .message("This action can't be completed because related data still references it")
                .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .message("You don't have permission to perform this action")
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiErrorResponse.builder()
                .message("Something went wrong. Please try again.")
                .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        List<ApiErrorResponse.FieldErrorDetail> errors = ex.getBindingResult().getFieldErrors().stream()
            .map(fieldError -> ApiErrorResponse.FieldErrorDetail.builder()
                .field(fieldError.getField())
                .message(fieldError.getDefaultMessage())
                .build())
            .toList();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .message("Validation failed")
                .errors(errors)
                .build());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .message("Malformed or invalid request body")
                .build());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .message("Invalid value for parameter '" + ex.getName() + "'")
                .build());
    }
}
