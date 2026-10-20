package com.suwalink.service;

import com.suwalink.dto.request.CancelReservationRequest;
import com.suwalink.dto.request.CreateReservationRequest;
import com.suwalink.dto.response.ReservationResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ReservationService {

    ReservationResponse create(CreateReservationRequest request);

    List<ReservationResponse> getMyReservations();

    List<ReservationResponse> getPharmacyReservations();

    ReservationResponse cancel(UUID id, CancelReservationRequest request);

    ReservationResponse complete(UUID id);

    /**
     * Cancels every CONFIRMED reservation of the patient as cancelled by the patient (stock released,
     * pharmacy notified), joining the caller's transaction. Used when the patient deletes their account.
     */
    void cancelConfirmedForPatient(UUID patientId, String reason);

    ReservationResponse getById(UUID id);

    ReservationResponse getByPickupCode(String code);

    int expireOverdue(LocalDateTime now);
}
