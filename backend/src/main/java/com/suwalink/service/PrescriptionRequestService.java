package com.suwalink.service;

import com.suwalink.dto.request.CreatePrescriptionRequest;
import com.suwalink.dto.request.UpdatePrescriptionRequest;
import com.suwalink.dto.response.PrescriptionRequestResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface PrescriptionRequestService {

    PrescriptionRequestResponse create(CreatePrescriptionRequest request);

    List<PrescriptionRequestResponse> getMyRequests();

    PrescriptionRequestResponse getById(UUID id);

    PrescriptionRequestResponse update(UUID id, UpdatePrescriptionRequest request);

    void delete(UUID id);

    /** Open requests that target the current user's pharmacy, newest first. */
    List<PrescriptionRequestResponse> listForMyPharmacy();

    PrescriptionRequestResponse close(UUID id);

    /** Marks open requests whose {@code expiresAt} is before {@code now} as EXPIRED; returns how many. */
    int expireOverdue(LocalDateTime now);
}
