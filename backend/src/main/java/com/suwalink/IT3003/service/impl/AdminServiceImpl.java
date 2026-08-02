package com.suwalink.IT3003.service.impl;

import com.suwalink.IT3003.dto.response.DashboardResponse;
import com.suwalink.IT3003.dto.response.PharmacyResponse;
import com.suwalink.IT3003.dto.response.UserResponse;
import com.suwalink.IT3003.entity.Pharmacy;
import com.suwalink.IT3003.entity.PharmacyStatus;
import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.exception.ResourceNotFoundException;
import com.suwalink.IT3003.repository.PharmacyRepository;
import com.suwalink.IT3003.repository.UserRepository;
import com.suwalink.IT3003.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.suwalink.IT3003.event.PharmacyRejectedEvent;
import com.suwalink.IT3003.event.PharmacyVerifiedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {
    private final UserRepository userRepository;
    private final PharmacyRepository pharmacyRepository;
    private final ApplicationEventPublisher eventPublisher;
    @Override
    public DashboardResponse getDashboard(){
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
                        .pharmacyName(pharmacy.getUser().getName())
                        .email(pharmacy.getUser().getEmail())
                        .licenceNo(pharmacy.getLicenceNo())
                        .address(pharmacy.getAddress())
                        .status(pharmacy.getStatus().name())
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
        eventPublisher.publishEvent(new PharmacyVerifiedEvent(this, pharmacy.getUser().getId()));
    }
    @Override
    @Transactional
    public void rejectPharmacy(UUID pharmacyId) {

        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy not found: " + pharmacyId));

        pharmacy.setStatus(PharmacyStatus.REJECTED);

        pharmacyRepository.save(pharmacy);
        eventPublisher.publishEvent(new PharmacyRejectedEvent(this, pharmacy.getUser().getId()));
    }
    @Override
    public List<UserResponse> getAllUsers() {

        return userRepository.findAll()
                .stream()
                .map(user -> UserResponse.builder()
                        .id(user.getId().toString())
                        .name(user.getName())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .role(user.getRole().name())
                        .build())
                .toList();
    }
    @Override
    public void deleteUser(UUID id) {

        userRepository.deleteById(id);

    }

}
