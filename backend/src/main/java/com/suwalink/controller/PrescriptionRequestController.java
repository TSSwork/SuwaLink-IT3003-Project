package com.suwalink.controller;

import com.suwalink.dto.request.CreatePrescriptionRequest;
import com.suwalink.dto.request.UpdatePrescriptionRequest;
import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.PrescriptionRequestResponse;
import com.suwalink.service.PrescriptionRequestService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lets a patient submit a prescription request (photo, note, age, target scope, consent) and
 * manage their own requests, and lets pharmacies list the open requests sent to them.
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
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<List<PrescriptionRequestResponse>>> listForMyPharmacy() {
        List<PrescriptionRequestResponse> responses = prescriptionRequestService.listForMyPharmacy();
        return ResponseEntity.ok(ApiResponse.success("Open prescription requests sent to your pharmacy", responses));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'PHARMACY_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PrescriptionRequestResponse>> getById(@PathVariable UUID id) {
        PrescriptionRequestResponse response = prescriptionRequestService.getById(id);
        return ResponseEntity.ok(ApiResponse.success("Prescription request", response));
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PrescriptionRequestResponse>> close(@PathVariable UUID id) {
        PrescriptionRequestResponse response = prescriptionRequestService.close(id);
        return ResponseEntity.ok(ApiResponse.success("Prescription request closed", response));
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
