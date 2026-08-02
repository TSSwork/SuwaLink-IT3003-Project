package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.MedicineMasterResponse;
import com.suwalink.IT3003.service.MedicineMasterService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
public class MedicineCatalogController {

    private final MedicineMasterService medicineMasterService;

    @GetMapping
    @PreAuthorize("hasRole('PHARMACY_ADMIN')")
    public ResponseEntity<ApiResponse<List<MedicineMasterResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Medicine catalog", medicineMasterService.list()));
    }
}
