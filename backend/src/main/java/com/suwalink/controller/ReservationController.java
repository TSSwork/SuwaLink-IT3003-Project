package com.suwalink.controller;

import com.suwalink.dto.request.CancelReservationRequest;
import com.suwalink.dto.request.CreateReservationRequest;
import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.ReservationResponse;
import com.suwalink.service.ReservationService;
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
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> pharmacyReservations() {
        return ResponseEntity.ok(
                ApiResponse.success("Incoming reservations", reservationService.getPharmacyReservations()));
    }

    /** Customer owner, owning pharmacy or admin; everyone else gets 404. */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReservationResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Reservation", reservationService.getById(id)));
    }

    /** Target of the QR code ({@code /r/<code>}) and of a code typed at the counter. Same access rule as by id. */
    @GetMapping("/by-code/{code}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReservationResponse>> getByPickupCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success("Reservation", reservationService.getByPickupCode(code)));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<ReservationResponse>> cancel(
            @PathVariable UUID id, @Valid @RequestBody(required = false) CancelReservationRequest request) {
        ReservationResponse response = reservationService.cancel(id, request);
        return ResponseEntity.ok(ApiResponse.success("Reservation cancelled", response));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<ReservationResponse>> complete(@PathVariable UUID id) {
        ReservationResponse response = reservationService.complete(id);
        return ResponseEntity.ok(ApiResponse.success("Reservation marked as completed", response));
    }
}
