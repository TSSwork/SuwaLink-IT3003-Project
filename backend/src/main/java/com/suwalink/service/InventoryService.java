package com.suwalink.service;

import com.suwalink.dto.request.CreateInventoryRequest;
import com.suwalink.dto.request.UpdateInventoryRequest;
import com.suwalink.dto.response.InventoryResponse;
import java.util.List;
import java.util.UUID;

public interface InventoryService {

    InventoryResponse addInventoryItem(CreateInventoryRequest request);

    List<InventoryResponse> listMyInventory();

    InventoryResponse getInventoryItem(UUID id);

    InventoryResponse updateInventoryItem(UUID id, UpdateInventoryRequest request);

    InventoryResponse setAvailability(UUID id, boolean available);

    void removeInventoryItem(UUID id);

}