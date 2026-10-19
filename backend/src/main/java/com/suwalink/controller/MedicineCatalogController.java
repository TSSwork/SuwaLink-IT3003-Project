package com.suwalink.controller;

import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.MedicineDetailResponse;
import com.suwalink.dto.response.MedicineMasterResponse;
import com.suwalink.dto.response.MedicineSearchResult;
import com.suwalink.dto.response.OfferResponse;
import com.suwalink.dto.response.PageResponse;
import com.suwalink.entity.District;
import com.suwalink.service.MedicineMasterService;
import com.suwalink.service.MedicineSearchService;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
public class MedicineCatalogController {

    private static final int MAX_PAGE_SIZE = 50;

    private final MedicineMasterService medicineMasterService;
    private final MedicineSearchService medicineSearchService;

    @GetMapping
    @PreAuthorize("hasRole('PHARMACY_OWNER')")
    public ResponseEntity<ApiResponse<List<MedicineMasterResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Medicine catalog", medicineMasterService.list()));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<MedicineSearchResult>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) District district,
            @RequestParam(required = false) BigDecimal lat,
            @RequestParam(required = false) BigDecimal lng,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        return ResponseEntity.ok(ApiResponse.success("Medicine search",
                medicineSearchService.search(q, categoryId, district, lat, lng, safePage, safeSize)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MedicineDetailResponse>> detail(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Medicine", medicineSearchService.getMedicine(id)));
    }

    @GetMapping("/{id}/offers")
    public ResponseEntity<ApiResponse<List<OfferResponse>>> offers(
            @PathVariable UUID id,
            @RequestParam(required = false) District district,
            @RequestParam(required = false) BigDecimal lat,
            @RequestParam(required = false) BigDecimal lng,
            @RequestParam(required = false) String sort) {
        return ResponseEntity.ok(ApiResponse.success("Medicine offers",
                medicineSearchService.getOffers(id, district, lat, lng, sort)));
    }
}
