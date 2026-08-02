package com.suwalink.IT3003.service;

import com.suwalink.IT3003.dto.request.CreatePrescriptionResponseRequest;
import com.suwalink.IT3003.dto.response.PrescriptionResponseResponse;
import java.util.List;
import java.util.UUID;

public interface PrescriptionResponseService {

    PrescriptionResponseResponse create(UUID requestId, CreatePrescriptionResponseRequest request);

    List<PrescriptionResponseResponse> listForRequest(UUID requestId);

    List<PrescriptionResponseResponse> listMyResponses();
}
