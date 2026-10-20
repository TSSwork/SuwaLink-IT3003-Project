package com.suwalink.service.impl;

import com.suwalink.dto.response.MedicineDetailResponse;
import com.suwalink.dto.response.MedicineSearchResult;
import com.suwalink.dto.response.OfferResponse;
import com.suwalink.dto.response.PageResponse;
import com.suwalink.entity.District;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.MedicineStatus;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.service.MedicineSearchService;
import com.suwalink.service.PharmacyVisibilityService;
import com.suwalink.util.GeoUtils;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MedicineSearchServiceImpl implements MedicineSearchService {

    private final InventoryRepository inventoryRepository;
    private final MedicineMasterRepository medicineMasterRepository;
    private final PharmacyVisibilityService pharmacyVisibilityService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MedicineSearchResult> search(
            String q, UUID categoryId, District district, BigDecimal lat, BigDecimal lng, int page, int size) {

        List<Inventory> offers = findOffers(q, categoryId, null, district);
        boolean hasLocation = lat != null && lng != null;

        Comparator<MedicineSearchResult> order = hasLocation
                ? Comparator.comparing(MedicineSearchResult::getNearestDistanceKm)
                : Comparator.comparingInt(MedicineSearchResult::getPharmacyCount).reversed();
        order = order.thenComparing(MedicineSearchResult::getBrandName)
                .thenComparing(r -> r.getMedicineId().toString());

        List<MedicineSearchResult> sorted = groupByMedicine(offers).values().stream()
                .map(group -> toSearchResult(group, lat, lng))
                .sorted(order)
                .toList();

        int totalPages = (int) Math.ceil(sorted.size() / (double) size);
        int from = (int) Math.min((long) page * size, sorted.size());
        int to = Math.min(from + size, sorted.size());
        return new PageResponse<>(sorted.subList(from, to), page, size, sorted.size(), totalPages);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicineDetailResponse getMedicine(UUID id) {
        MedicineMaster m = medicineMasterRepository.findById(id)
                .filter(med -> med.getStatus() == MedicineStatus.APPROVED)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + id));
        return MedicineDetailResponse.builder()
                .medicineId(m.getId())
                .brandName(m.getBrandName())
                .genericName(m.getGenericName())
                .dosageForm(m.getDosageForm())
                .strength(m.getStrength())
                .category(m.getTherapeuticCategory().getName())
                .manufacturer(m.getManufacturer().getName())
                .legalCategory(m.getLegalCategory())
                .requiresPrescription(m.getLegalCategory() != PrescriptionStatus.OTC)
                .imageUrl(m.getImageUrl())
                .description(m.getDescription())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfferResponse> getOffers(
            UUID medicineId, District district, BigDecimal lat, BigDecimal lng, String sort) {

        boolean hasLocation = lat != null && lng != null;
        boolean byDistance = hasLocation && !"price".equalsIgnoreCase(sort);

        Comparator<OfferResponse> byPriceThenName = Comparator.comparing(OfferResponse::getUnitPrice)
                .thenComparing(o -> o.getPharmacy().getName());
        Comparator<OfferResponse> order = byDistance
                ? Comparator.comparing(OfferResponse::getDistanceKm).thenComparing(byPriceThenName)
                : byPriceThenName;

        return findOffers(null, null, medicineId, district).stream()
                .map(inv -> toOffer(inv, lat, lng))
                .sorted(order)
                .toList();
    }

    private List<Inventory> findOffers(String q, UUID categoryId, UUID medicineId, District district) {
        return inventoryRepository.findOffers(
                blankToNull(q), categoryId, medicineId, district,
                pharmacyVisibilityService.includeDemo(), LocalDate.now());
    }

    private Map<UUID, List<Inventory>> groupByMedicine(List<Inventory> offers) {
        return offers.stream().collect(Collectors.groupingBy(
                inv -> inv.getMedicineMaster().getId(), LinkedHashMap::new, Collectors.toList()));
    }

    private MedicineSearchResult toSearchResult(List<Inventory> group, BigDecimal lat, BigDecimal lng) {
        MedicineMaster m = group.get(0).getMedicineMaster();
        Inventory cheapest = group.stream().min(Comparator.comparing(Inventory::getUnitPrice)).orElseThrow();
        Double nearest = group.stream()
                .map(inv -> distanceKm(inv.getPharmacy(), lat, lng))
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
        return MedicineSearchResult.builder()
                .medicineId(m.getId())
                .brandName(m.getBrandName())
                .genericName(m.getGenericName())
                .dosageForm(m.getDosageForm())
                .strength(m.getStrength())
                .category(m.getTherapeuticCategory().getName())
                .manufacturer(m.getManufacturer().getName())
                .legalCategory(m.getLegalCategory())
                .requiresPrescription(m.getLegalCategory() != PrescriptionStatus.OTC)
                .imageUrl(m.getImageUrl())
                .pharmacyCount((int) group.stream().map(inv -> inv.getPharmacy().getId()).distinct().count())
                .lowestPrice(cheapest.getUnitPrice())
                .currency(cheapest.getCurrency())
                .nearestDistanceKm(nearest)
                .build();
    }

    private OfferResponse toOffer(Inventory inv, BigDecimal lat, BigDecimal lng) {
        Pharmacy p = inv.getPharmacy();
        return OfferResponse.builder()
                .inventoryId(inv.getId())
                .unitPrice(inv.getUnitPrice())
                .currency(inv.getCurrency())
                .stockQuantity(inv.getStockQuantity())
                .expireDate(inv.getExpireDate())
                .distanceKm(distanceKm(p, lat, lng))
                .pharmacy(OfferResponse.PharmacySummary.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .phone(p.getPhone())
                        .address(p.getAddress())
                        .district(p.getDistrict())
                        .city(p.getCity())
                        .latitude(p.getLatitude())
                        .longitude(p.getLongitude())
                        .openingHours(p.getOpeningHours())
                        .build())
                .build();
    }

    /** Distance from the caller to the pharmacy rounded to 0.1 km, or null when no location was given. */
    private Double distanceKm(Pharmacy pharmacy, BigDecimal lat, BigDecimal lng) {
        if (lat == null || lng == null) {
            return null;
        }
        double km = GeoUtils.haversineKm(lat.doubleValue(), lng.doubleValue(),
                pharmacy.getLatitude().doubleValue(), pharmacy.getLongitude().doubleValue());
        return BigDecimal.valueOf(km).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
