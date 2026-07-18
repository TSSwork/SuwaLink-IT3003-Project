package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.request.ManufacturerRequest;
import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.ManufacturerResponse;
import com.suwalink.IT3003.service.ManufacturerService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/manufacturers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ManufacturerController {

    private final ManufacturerService manufacturerService;

    @PostMapping
    public ResponseEntity<ApiResponse<ManufacturerResponse>> create(@Valid @RequestBody ManufacturerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Manufacturer created", manufacturerService.create(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ManufacturerResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Manufacturers", manufacturerService.list()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ManufacturerResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Manufacturer", manufacturerService.get(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ManufacturerResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody ManufacturerRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Manufacturer updated", manufacturerService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        manufacturerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Manufacturer deleted"));
    }
}
