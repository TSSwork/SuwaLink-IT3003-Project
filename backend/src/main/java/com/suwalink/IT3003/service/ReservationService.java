package com.suwalink.IT3003.service;

import com.suwalink.IT3003.dto.request.CancelReservationRequest;
import com.suwalink.IT3003.dto.request.CreateReservationRequest;
import com.suwalink.IT3003.dto.response.ReservationResponse;
import java.util.List;
import java.util.UUID;

public interface ReservationService {

    ReservationResponse create(CreateReservationRequest request);

    List<ReservationResponse> getMyReservations();

    List<ReservationResponse> getPharmacyReservations();

    ReservationResponse cancel(UUID id, CancelReservationRequest request);

    ReservationResponse complete(UUID id);
}
