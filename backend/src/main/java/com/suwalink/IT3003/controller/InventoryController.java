package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.request.CreateInventoryRequest;
import com.suwalink.IT3003.dto.request.UpdateAvailabilityRequest;
import com.suwalink.IT3003.dto.request.UpdateInventoryRequest;
import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.InventoryResponse;
import com.suwalink.IT3003.service.InventoryService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PHARMACY_ADMIN')")
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping
    public ResponseEntity<ApiResponse<InventoryResponse>> addInventoryItem(
            @Valid @RequestBody CreateInventoryRequest request) {
        InventoryResponse response = inventoryService.addInventoryItem(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Inventory item added", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<InventoryResponse>>> listMyInventory() {
        return ResponseEntity.ok(ApiResponse.success("Inventory items", inventoryService.listMyInventory()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryResponse>> getInventoryItem(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Inventory item", inventoryService.getInventoryItem(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryResponse>> updateInventoryItem(
            @PathVariable UUID id, @Valid @RequestBody UpdateInventoryRequest request) {
        InventoryResponse response = inventoryService.updateInventoryItem(id, request);
        return ResponseEntity.ok(ApiResponse.success("Inventory item updated", response));
    }

    @PatchMapping("/{id}/availability")
    public ResponseEntity<ApiResponse<InventoryResponse>> setAvailability(
            @PathVariable UUID id, @Valid @RequestBody UpdateAvailabilityRequest request) {
        InventoryResponse response = inventoryService.setAvailability(id, request.getAvailable());
        return ResponseEntity.ok(ApiResponse.success("Inventory item availability updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> removeInventoryItem(@PathVariable UUID id) {
        inventoryService.removeInventoryItem(id);
        return ResponseEntity.ok(ApiResponse.success("Inventory item removed"));
    }
}
