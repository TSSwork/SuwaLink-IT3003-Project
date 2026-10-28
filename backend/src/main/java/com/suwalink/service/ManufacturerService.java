package com.suwalink.service;

import com.suwalink.dto.request.ManufacturerRequest;
import com.suwalink.dto.response.ManufacturerResponse;
import java.util.List;
import java.util.UUID;

public interface ManufacturerService {

    ManufacturerResponse create(ManufacturerRequest request);

    List<ManufacturerResponse> list();

    List<ManufacturerResponse> listActive();

    ManufacturerResponse get(UUID id);

    ManufacturerResponse update(UUID id, ManufacturerRequest request);

    void delete(UUID id);
}
