package com.suwalink.controller;

import com.suwalink.dto.request.CreateInventoryRequest;
import com.suwalink.dto.request.UpdateAvailabilityRequest;
import com.suwalink.dto.request.UpdateInventoryRequest;
import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.InventoryResponse;
import com.suwalink.service.InventoryService;
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
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<InventoryResponse>>
    addInventoryItem(@Valid @RequestBody CreateInventoryRequest request) {
        InventoryResponse response = inventoryService.addInventoryItem(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Inventory item added", response));
    }

    @GetMapping
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<List<InventoryResponse>>>
    listMyInventory() {
        return ResponseEntity.ok(ApiResponse.success("Inventory items", inventoryService.listMyInventory()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<InventoryResponse>>
    getInventoryItem(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Inventory item", inventoryService.getInventoryItem(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<InventoryResponse>>
    updateInventoryItem(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateInventoryRequest request
    ) {
        InventoryResponse response = inventoryService.updateInventoryItem(id, request);
        return ResponseEntity.ok(ApiResponse.success("Inventory item updated", response));
    }

    @PatchMapping("/{id}/availability")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<InventoryResponse>>
    setAvailability(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAvailabilityRequest request
    ) {
        InventoryResponse response = inventoryService.setAvailability(id, request.getAvailable());
        return ResponseEntity.ok(ApiResponse.success("Inventory item availability updated", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<Void>>
    removeInventoryItem(@PathVariable UUID id) {
        inventoryService.removeInventoryItem(id);
        return ResponseEntity.ok(ApiResponse.success("Inventory item removed"));
    }
}