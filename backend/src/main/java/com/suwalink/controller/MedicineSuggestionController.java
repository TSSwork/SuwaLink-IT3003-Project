package com.suwalink.controller;

import com.suwalink.dto.request.MedicineMasterRequest;
import com.suwalink.dto.request.RejectMedicineRequest;
import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.MedicineMasterResponse;
import com.suwalink.entity.MedicineStatus;
import com.suwalink.service.MedicineSuggestionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Pharmacy owners suggest medicines; admins review them. */
@RestController
@RequiredArgsConstructor
public class MedicineSuggestionController {

    private final MedicineSuggestionService suggestionService;

    @PostMapping("/api/medicines/suggestions")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<MedicineMasterResponse>> suggest(
            @Valid @RequestBody MedicineMasterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Medicine suggested", suggestionService.suggest(request)));
    }

    @GetMapping("/api/medicines/suggestions/mine")
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<List<MedicineMasterResponse>>> mine() {
        return ResponseEntity.ok(ApiResponse.success("My suggestions", suggestionService.mySuggestions()));
    }

    @GetMapping("/api/admin/medicines/suggestions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<MedicineMasterResponse>>> list(
            @RequestParam(required = false) MedicineStatus status) {
        return ResponseEntity.ok(ApiResponse.success("Suggestions", suggestionService.listSuggestions(status)));
    }

    @PutMapping("/api/admin/medicines/suggestions/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MedicineMasterResponse>> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Suggestion approved", suggestionService.approve(id)));
    }

    @PutMapping("/api/admin/medicines/suggestions/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MedicineMasterResponse>> reject(
            @PathVariable UUID id, @Valid @RequestBody RejectMedicineRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Suggestion rejected",
            suggestionService.reject(id, request.getReason())));
    }
}
