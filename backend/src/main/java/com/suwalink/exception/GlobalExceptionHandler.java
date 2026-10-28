package com.suwalink.exception;

import com.suwalink.dto.response.ApiErrorResponse;
import jakarta.persistence.LockTimeoutException;
import jakarta.persistence.PessimisticLockException;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mail.MailException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Unique key (request, pharmacy) on prescription_responses; see changeset 006. */
    private static final String DUPLICATE_RESPONSE_CONSTRAINT = "uk_presc_responses_request_pharmacy";
    /** Unique key (pharmacy, medicine) on inventory; see changeset 015. Backs the service guard. */
    private static final String DUPLICATE_INVENTORY_CONSTRAINT = "uk_inventory_pharmacy_medicine";

    private static boolean mentionsConstraint(Throwable ex, String constraint) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t.getMessage() != null && t.getMessage().toLowerCase(Locale.ROOT).contains(constraint)) {
                return true;
            }
        }
        return false;
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ApiErrorResponse> handleEmailAlreadyExists(EmailAlreadyExistsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("EMAIL_TAKEN")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(PharmacyNotVerifiedException.class)
    public ResponseEntity<ApiErrorResponse> handlePharmacyNotVerified(PharmacyNotVerifiedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .code("PHARMACY_NOT_VERIFIED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateResource(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("DUPLICATE")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiErrorResponse.builder()
                .code("NOT_FOUND")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InventoryAccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleInventoryAccessDenied(InventoryAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .code("ACCESS_DENIED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(PrescriptionAccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handlePrescriptionAccessDenied(PrescriptionAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .code("ACCESS_DENIED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(PrescriptionRequestClosedException.class)
    public ResponseEntity<ApiErrorResponse> handlePrescriptionRequestClosed(PrescriptionRequestClosedException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .code("REQUEST_CLOSED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(ImagePurgedException.class)
    public ResponseEntity<ApiErrorResponse> handleImagePurged(ImagePurgedException ex) {
        return ResponseEntity.status(HttpStatus.GONE)
            .body(ApiErrorResponse.builder()
                .code("IMAGE_PURGED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(NoPharmaciesInScopeException.class)
    public ResponseEntity<ApiErrorResponse> handleNoPharmaciesInScope(NoPharmaciesInScopeException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT)
            .body(ApiErrorResponse.builder()
                .code("NO_PHARMACIES_IN_SCOPE")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ApiErrorResponse> handleInsufficientStock(InsufficientStockException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("INSUFFICIENT_STOCK")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(ItemUnavailableException.class)
    public ResponseEntity<ApiErrorResponse> handleItemUnavailable(ItemUnavailableException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("ITEM_UNAVAILABLE")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InvalidReservationRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidReservationRequest(InvalidReservationRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .code("VALIDATION_FAILED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(ReservationAccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleReservationAccessDenied(ReservationAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .code("ACCESS_DENIED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InvalidReservationStateException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidReservationState(InvalidReservationStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("RESERVATION_STATE")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidFile(InvalidFileException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .code("VALIDATION_FAILED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(FileStorageException.class)
    public ResponseEntity<ApiErrorResponse> handleFileStorage(FileStorageException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiErrorResponse.builder()
                .code("INTERNAL_ERROR")
                .message("Could not process the uploaded image")
                .build());
    }

    @ExceptionHandler(InvalidOtpException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidOtp(InvalidOtpException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .code("VALIDATION_FAILED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiErrorResponse.builder()
                .code("UNAUTHENTICATED")
                .message("Invalid email or password")
                .build());
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiErrorResponse> handleDisabled(DisabledException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .code("DEMO_DISABLED")
                .message("Demo accounts are currently disabled")
                .build());
    }

    /** Suspended by an admin; distinct from {@link DisabledException}, which means demo accounts are off. */
    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ApiErrorResponse> handleLocked(LockedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .code("ACCOUNT_SUSPENDED")
                .message("Your account has been suspended")
                .build());
    }

    @ExceptionHandler(InvalidPasswordException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidPassword(InvalidPasswordException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .code("INVALID_PASSWORD")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(AccountActionNotAllowedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccountActionNotAllowed(AccountActionNotAllowedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("ACCOUNT_ACTION_NOT_ALLOWED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(OpenReservationsException.class)
    public ResponseEntity<ApiErrorResponse> handleOpenReservations(OpenReservationsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("OPEN_RESERVATIONS")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(RequestHasReservationsException.class)
    public ResponseEntity<ApiErrorResponse> handleRequestHasReservations(RequestHasReservationsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("REQUEST_HAS_RESERVATIONS")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(AlreadyReviewedException.class)
    public ResponseEntity<ApiErrorResponse> handleAlreadyReviewed(AlreadyReviewedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("ALREADY_REVIEWED")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(MailException.class)
    public ResponseEntity<ApiErrorResponse> handleMailFailure(MailException ex) {
        log.error("Failed to send an email", ex);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(ApiErrorResponse.builder()
                .code("INTERNAL_ERROR")
                .message("Could not send the email. Please try again shortly.")
                .build());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMessage());
        if (mentionsConstraint(ex, DUPLICATE_RESPONSE_CONSTRAINT)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.builder()
                    .code("DUPLICATE")
                    .message("You have already responded; update your response instead")
                    .build());
        }
        if (mentionsConstraint(ex, DUPLICATE_INVENTORY_CONSTRAINT)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.builder()
                    .code("DUPLICATE")
                    .message("This medicine is already in your stock; edit that item instead")
                    .build());
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("DATA_CONFLICT")
                .message("This action can't be completed because related data still references it")
                .build());
    }

    /**
     * A row lock could not be taken in time, or a concurrent transaction changed the row first
     * (version check). Both are safe to retry, so the client gets a 409 rather than a 500.
     */
    @ExceptionHandler({
        PessimisticLockingFailureException.class,
        OptimisticLockingFailureException.class,
        LockTimeoutException.class,
        PessimisticLockException.class
    })
    public ResponseEntity<ApiErrorResponse> handleConcurrentUpdate(Exception ex) {
        log.warn("Concurrent update conflict: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse.builder()
                .code("CONCURRENT_UPDATE")
                .message("This item was just updated by someone else. Please try again.")
                .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse.builder()
                .code("ACCESS_DENIED")
                .message("You don't have permission to perform this action")
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiErrorResponse.builder()
                .code("INTERNAL_ERROR")
                .message("Something went wrong. Please try again.")
                .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        List<ApiErrorResponse.FieldErrorDetail> errors = ex.getBindingResult().getFieldErrors().stream()
            .map(fieldError -> ApiErrorResponse.FieldErrorDetail.builder()
                .field(fieldError.getField())
                .code(fieldError.getCode())
                .message(fieldError.getDefaultMessage())
                .build())
            .toList();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .code("VALIDATION_FAILED")
                .message("Validation failed")
                .errors(errors)
                .build());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .code("MALFORMED_REQUEST")
                .message("Malformed or invalid request body")
                .build());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED);
        if (ex.getSupportedHttpMethods() != null) {
            response.allow(ex.getSupportedHttpMethods().toArray(new HttpMethod[0]));
        }
        return response.body(ApiErrorResponse.builder()
            .code("METHOD_NOT_ALLOWED")
            .message("Request method '" + ex.getMethod() + "' is not supported here")
            .build());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
            .body(ApiErrorResponse.builder()
                .code("UNSUPPORTED_MEDIA_TYPE")
                .message("Unsupported content type")
                .build());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex) {
        return missingParameter(ex.getParameterName());
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingPart(MissingServletRequestPartException ex) {
        return missingParameter(ex.getRequestPartName());
    }

    private static ResponseEntity<ApiErrorResponse> missingParameter(String name) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .code("MISSING_PARAMETER")
                .message("Required parameter '" + name + "' is missing")
                .build());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiErrorResponse.builder()
                .code("NOT_FOUND")
                .message("The requested item was not found")
                .build());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.builder()
                .code("INVALID_PARAMETER")
                .message("Invalid value for parameter '" + ex.getName() + "'")
                .build());
    }
}
