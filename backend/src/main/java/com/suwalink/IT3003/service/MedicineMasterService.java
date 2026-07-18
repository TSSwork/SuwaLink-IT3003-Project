package com.suwalink.IT3003.service;

import com.suwalink.IT3003.dto.request.MedicineMasterRequest;
import com.suwalink.IT3003.dto.response.MedicineMasterResponse;
import java.util.List;
import java.util.UUID;

public interface MedicineMasterService {

    MedicineMasterResponse create(MedicineMasterRequest request);

    List<MedicineMasterResponse> list();

    MedicineMasterResponse get(UUID id);

    MedicineMasterResponse update(UUID id, MedicineMasterRequest request);

    void delete(UUID id);
}
