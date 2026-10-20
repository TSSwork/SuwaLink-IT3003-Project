package com.suwalink.service;

import com.suwalink.dto.request.MedicineMasterRequest;
import com.suwalink.dto.response.MedicineMasterResponse;
import java.util.List;
import java.util.UUID;

public interface MedicineMasterService {

    MedicineMasterResponse create(MedicineMasterRequest request);

    List<MedicineMasterResponse> list();

    /** Catalog entries pharmacies may stock (status APPROVED). */
    List<MedicineMasterResponse> listApproved();

    MedicineMasterResponse get(UUID id);

    MedicineMasterResponse update(UUID id, MedicineMasterRequest request);

    void delete(UUID id);
}
