package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.request.CancelReservationRequest;
import com.suwalink.IT3003.dto.request.CreateReservationRequest;
import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.ReservationResponse;
import com.suwalink.IT3003.service.ReservationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ReservationResponse>> create(
            @Valid @RequestBody CreateReservationRequest request) {
        ReservationResponse response = reservationService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Reservation confirmed", response));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> myReservations() {
        return ResponseEntity.ok(ApiResponse.success("Your reservations", reservationService.getMyReservations()));
    }

    @GetMapping
    @PreAuthorize("hasRole('PHARMACY_ADMIN')")
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> pharmacyReservations() {
        return ResponseEntity.ok(
                ApiResponse.success("Incoming reservations", reservationService.getPharmacyReservations()));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'PHARMACY_ADMIN')")
    public ResponseEntity<ApiResponse<ReservationResponse>> cancel(
            @PathVariable UUID id, @RequestBody(required = false) CancelReservationRequest request) {
        ReservationResponse response = reservationService.cancel(id, request);
        return ResponseEntity.ok(ApiResponse.success("Reservation cancelled", response));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('PHARMACY_ADMIN')")
    public ResponseEntity<ApiResponse<ReservationResponse>> complete(@PathVariable UUID id) {
        ReservationResponse response = reservationService.complete(id);
        return ResponseEntity.ok(ApiResponse.success("Reservation marked as completed", response));
    }
}
