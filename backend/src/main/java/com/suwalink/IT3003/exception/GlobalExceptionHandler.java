package com.suwalink.IT3003.exception;

import com.suwalink.IT3003.dto.response.ApiErrorResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

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

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiErrorResponse.builder()
                .message("Invalid email or password")
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
}
