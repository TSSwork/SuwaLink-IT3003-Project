package com.suwalink.controller;

import com.suwalink.dto.request.CreatePrescriptionResponseRequest;
import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.PrescriptionResponseResponse;
import com.suwalink.service.PrescriptionResponseService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionResponseController {

    private final PrescriptionResponseService prescriptionResponseService;

    @PostMapping("/{requestId}/responses")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<PrescriptionResponseResponse>> create(
            @PathVariable UUID requestId,
            @Valid @RequestBody CreatePrescriptionResponseRequest request) {
        PrescriptionResponseResponse response = prescriptionResponseService.create(requestId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Response submitted", response));
    }

    @PutMapping("/{requestId}/responses/mine")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<PrescriptionResponseResponse>> updateMine(
            @PathVariable UUID requestId,
            @Valid @RequestBody CreatePrescriptionResponseRequest request) {
        PrescriptionResponseResponse response = prescriptionResponseService.updateMine(requestId, request);
        return ResponseEntity.ok(ApiResponse.success("Response updated", response));
    }

    @GetMapping("/{requestId}/responses")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'PHARMACY_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<PrescriptionResponseResponse>>> listForRequest(
            @PathVariable UUID requestId) {
        List<PrescriptionResponseResponse> responses = prescriptionResponseService.listForRequest(requestId);
        return ResponseEntity.ok(ApiResponse.success("Responses", responses));
    }

    @GetMapping("/responses/me")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<List<PrescriptionResponseResponse>>> listMyResponses() {
        List<PrescriptionResponseResponse> responses = prescriptionResponseService.listMyResponses();
        return ResponseEntity.ok(ApiResponse.success("Your responses", responses));
    }
}
