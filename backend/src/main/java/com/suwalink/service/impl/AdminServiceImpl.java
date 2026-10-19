package com.suwalink.service.impl;

import com.suwalink.dto.response.DashboardResponse;
import com.suwalink.dto.response.PharmacyResponse;
import com.suwalink.dto.response.UserResponse;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.Role;
import com.suwalink.event.PharmacyRejectedEvent;
import com.suwalink.event.PharmacyVerifiedEvent;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.BookmarkRepository;
import com.suwalink.repository.ImageRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionResponseRepository;
import com.suwalink.repository.ReservationRepository;
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
    private final ReservationRepository reservationRepository;
    private final BookmarkRepository bookmarkRepository;
    private final PrescriptionResponseRepository prescriptionResponseRepository;
    private final InventoryRepository inventoryRepository;
    private final NotificationRepository notificationRepository;
    private final ImageRepository imageRepository;
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
    @Transactional
    public void deleteUser(UUID id) {
        userRepository.findById(id).ifPresent(user -> {
            if (user.getRole() == Role.PHARMACY_ADMIN) {
                pharmacyRepository.findByUserId(id).ifPresent(this::deletePharmacyData);
            }
        });
        notificationRepository.deleteByRecipient_Id(id);
        imageRepository.clearUploadedBy(id);
        userRepository.deleteById(id);
    }

    // No ON DELETE CASCADE in the schema, so dependents must be removed in FK order first.
    private void deletePharmacyData(Pharmacy pharmacy) {
        UUID pharmacyId = pharmacy.getId();
        reservationRepository.deleteByPharmacyId(pharmacyId);
        bookmarkRepository.deleteByInventory_PharmacyId(pharmacyId);
        prescriptionResponseRepository.deleteByPharmacyId(pharmacyId);
        inventoryRepository.deleteByPharmacyId(pharmacyId);
        pharmacyRepository.delete(pharmacy);
    }
}
