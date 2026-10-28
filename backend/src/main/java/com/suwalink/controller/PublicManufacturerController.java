package com.suwalink.controller;

import com.suwalink.dto.response.ApiResponse;
import com.suwalink.service.ManufacturerService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Active manufacturers for the medicine suggestion form, open like the category list. */
@RestController
@RequestMapping("/api/manufacturers")
@RequiredArgsConstructor
public class PublicManufacturerController {

    public record ManufacturerOption(UUID id, String name) {}

    private final ManufacturerService manufacturerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ManufacturerOption>>> listManufacturers() {
        List<ManufacturerOption> options = manufacturerService.listActive().stream()
            .map(manufacturer -> new ManufacturerOption(manufacturer.getId(), manufacturer.getName()))
            .toList();
        return ResponseEntity.ok(ApiResponse.success("Manufacturers", options));
    }
}
