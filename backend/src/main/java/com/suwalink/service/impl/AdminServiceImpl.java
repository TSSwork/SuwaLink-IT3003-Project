package com.suwalink.service.impl;

import com.suwalink.dto.response.DashboardResponse;
import com.suwalink.dto.response.PharmacyResponse;
import com.suwalink.dto.response.UserResponse;
import com.suwalink.entity.AccountStatus;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.Role;
import com.suwalink.event.PharmacyRejectedEvent;
import com.suwalink.event.PharmacyVerifiedEvent;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.AdminService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {
    private final UserRepository userRepository;
    private final PharmacyRepository pharmacyRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        return DashboardResponse.builder()
                .totalCustomers(userRepository.countByRole(Role.CUSTOMER))
                .totalPharmacies(pharmacyRepository.count())
                .verifiedPharmacies(pharmacyRepository.countByStatus(PharmacyStatus.VERIFIED))
                .pendingPharmacies(pharmacyRepository.countByStatus(PharmacyStatus.PENDING))
                .rejectedPharmacies(pharmacyRepository.countByStatus(PharmacyStatus.REJECTED))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyResponse> getAllPharmacies() {
        return pharmacyRepository.findAll()
                .stream()
                .map(pharmacy -> PharmacyResponse.builder()
                        .id(pharmacy.getId().toString())
                        .pharmacyName(pharmacy.getName())
                        .email(pharmacy.getUser().getEmail())
                        .licenceNo(pharmacy.getLicenceNo())
                        .address(pharmacy.getAddress())
                        .status(pharmacy.getStatus().name())
                        .phone(pharmacy.getPhone())
                        .district(pharmacy.getDistrict())
                        .city(pharmacy.getCity())
                        .latitude(pharmacy.getLatitude())
                        .longitude(pharmacy.getLongitude())
                        .openingHours(pharmacy.getOpeningHours())
                        .demo(pharmacy.isDemo())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void approvePharmacy(UUID pharmacyId) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy not found: " + pharmacyId));

        pharmacy.setStatus(PharmacyStatus.VERIFIED);

        pharmacyRepository.save(pharmacy);
        eventPublisher.publishEvent(new PharmacyVerifiedEvent(this, pharmacy.getUser().getId(), pharmacy.getName()));
    }

    @Override
    @Transactional
    public void rejectPharmacy(UUID pharmacyId) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy not found: " + pharmacyId));

        pharmacy.setStatus(PharmacyStatus.REJECTED);

        pharmacyRepository.save(pharmacy);
        eventPublisher.publishEvent(new PharmacyRejectedEvent(this, pharmacy.getUser().getId(), pharmacy.getName()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getUsers(String q, AccountStatus status) {
        String query = (q == null || q.isBlank()) ? null : q.trim();
        boolean deleted = status == AccountStatus.DELETED;
        Boolean suspended = status == null || deleted ? null : status == AccountStatus.SUSPENDED;
        return userRepository.searchForAdmin(query, deleted, suspended)
                .stream()
                .map(user -> UserResponse.builder()
                        .id(user.getId().toString())
                        .name(user.getName())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .role(user.getRole().name())
                        .status(AccountStatus.of(user).name())
                        .build())
                .toList();
    }
}
