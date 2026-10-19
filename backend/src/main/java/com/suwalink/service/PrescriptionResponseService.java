package com.suwalink.service;

import com.suwalink.dto.request.CreatePrescriptionResponseRequest;
import com.suwalink.dto.response.PrescriptionResponseResponse;
import java.util.List;
import java.util.UUID;

public interface PrescriptionResponseService {

    PrescriptionResponseResponse create(UUID requestId, CreatePrescriptionResponseRequest request);

    List<PrescriptionResponseResponse> listForRequest(UUID requestId);

    List<PrescriptionResponseResponse> listMyResponses();
}
