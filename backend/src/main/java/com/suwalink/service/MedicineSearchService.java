package com.suwalink.service;

import com.suwalink.dto.response.MedicineDetailResponse;
import com.suwalink.dto.response.MedicineSearchResult;
import com.suwalink.dto.response.OfferResponse;
import com.suwalink.dto.response.PageResponse;
import com.suwalink.entity.District;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface MedicineSearchService {

    PageResponse<MedicineSearchResult> search(
            String q, UUID categoryId, District district, BigDecimal lat, BigDecimal lng, int page, int size);

    MedicineDetailResponse getMedicine(UUID id);

    /** @param sort "distance" or "price"; distance needs lat and lng, otherwise price is used */
    List<OfferResponse> getOffers(UUID medicineId, District district, BigDecimal lat, BigDecimal lng, String sort);
}
