package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.request.MedicineMasterRequest;
import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.MedicineMasterResponse;
import com.suwalink.IT3003.service.MedicineMasterService;
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
@RequestMapping("/api/admin/medicines")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class MedicineMasterController {

    private final MedicineMasterService medicineMasterService;

    @PostMapping
    public ResponseEntity<ApiResponse<MedicineMasterResponse>> create(
            @Valid @RequestBody MedicineMasterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Medicine created", medicineMasterService.create(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MedicineMasterResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Medicines", medicineMasterService.list()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MedicineMasterResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Medicine", medicineMasterService.get(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MedicineMasterResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody MedicineMasterRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Medicine updated", medicineMasterService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        medicineMasterService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Medicine deleted"));
    }
}
