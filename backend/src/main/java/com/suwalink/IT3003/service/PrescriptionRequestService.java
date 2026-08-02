package com.suwalink.IT3003.service;

import com.suwalink.IT3003.dto.request.CreatePrescriptionRequest;
import com.suwalink.IT3003.dto.request.UpdatePrescriptionRequest;
import com.suwalink.IT3003.dto.response.PrescriptionRequestResponse;
import java.util.List;
import java.util.UUID;

public interface PrescriptionRequestService {

    PrescriptionRequestResponse create(CreatePrescriptionRequest request);

    List<PrescriptionRequestResponse> getMyRequests();

    PrescriptionRequestResponse getById(UUID id);

    PrescriptionRequestResponse update(UUID id, UpdatePrescriptionRequest request);

    void delete(UUID id);

    List<PrescriptionRequestResponse> listPending();

    PrescriptionRequestResponse close(UUID id);
}
