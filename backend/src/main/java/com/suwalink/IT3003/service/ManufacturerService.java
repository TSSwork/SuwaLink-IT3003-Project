package com.suwalink.IT3003.service;

import com.suwalink.IT3003.dto.request.ManufacturerRequest;
import com.suwalink.IT3003.dto.response.ManufacturerResponse;
import java.util.List;
import java.util.UUID;

public interface ManufacturerService {

    ManufacturerResponse create(ManufacturerRequest request);

    List<ManufacturerResponse> list();

    ManufacturerResponse get(UUID id);

    ManufacturerResponse update(UUID id, ManufacturerRequest request);

    void delete(UUID id);
}
