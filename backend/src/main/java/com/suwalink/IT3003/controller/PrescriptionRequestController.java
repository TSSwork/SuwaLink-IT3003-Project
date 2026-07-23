package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.request.CreatePrescriptionRequest;
import com.suwalink.IT3003.dto.request.UpdatePrescriptionRequest;
import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.PrescriptionRequestResponse;
import com.suwalink.IT3003.service.PrescriptionRequestService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lets a patient submit a prescription request (photo + note + age) and manage their own
 * requests, and lets pharmacies browse pending ones. Tagging pharmacy inventory against a
 * request and notifications are separate modules - not built here (see
 * README/READ_PRESCRIPTION_MODULE.md).
 */
@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionRequestController {

    private final PrescriptionRequestService prescriptionRequestService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PrescriptionRequestResponse>> create(
            @Valid @ModelAttribute CreatePrescriptionRequest request) {
        PrescriptionRequestResponse response = prescriptionRequestService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Prescription request submitted", response));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<PrescriptionRequestResponse>>> myRequests() {
        List<PrescriptionRequestResponse> responses = prescriptionRequestService.getMyRequests();
        return ResponseEntity.ok(ApiResponse.success("Your prescription requests", responses));
    }

    @GetMapping
    @PreAuthorize("hasRole('PHARMACY_ADMIN')")
    public ResponseEntity<ApiResponse<List<PrescriptionRequestResponse>>> listPending() {
        List<PrescriptionRequestResponse> responses = prescriptionRequestService.listPending();
        return ResponseEntity.ok(ApiResponse.success("Pending prescription requests", responses));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'PHARMACY_ADMIN')")
    public ResponseEntity<ApiResponse<PrescriptionRequestResponse>> getById(@PathVariable UUID id) {
        PrescriptionRequestResponse response = prescriptionRequestService.getById(id);
        return ResponseEntity.ok(ApiResponse.success("Prescription request", response));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PrescriptionRequestResponse>> update(
            @PathVariable UUID id, @Valid @ModelAttribute UpdatePrescriptionRequest request) {
        PrescriptionRequestResponse response = prescriptionRequestService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success("Prescription request updated", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        prescriptionRequestService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Prescription request deleted"));
    }
}
