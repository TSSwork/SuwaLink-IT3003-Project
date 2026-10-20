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

    ReservationResponse getById(UUID id);

    ReservationResponse getByPickupCode(String code);

    int expireOverdue(LocalDateTime now);
}
