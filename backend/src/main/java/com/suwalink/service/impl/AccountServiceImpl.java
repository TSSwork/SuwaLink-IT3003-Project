package com.suwalink.service.impl;

import com.suwalink.dto.request.DeleteAccountRequest;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Notification;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.exception.AccountActionNotAllowedException;
import com.suwalink.exception.InvalidPasswordException;
import com.suwalink.exception.OpenReservationsException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.BookmarkRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.AccountService;
import com.suwalink.service.ImageService;
import com.suwalink.service.ReservationService;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    static final String DELETED_NAME = "Deleted user";
    static final String DELETED_PHONE = "0000000000";
    static final String DELETION_CANCEL_REASON = "Account deleted";

    private static final Set<PrescriptionRequestStatus> OPEN_REQUEST_STATUSES =
            EnumSet.of(PrescriptionRequestStatus.PENDING, PrescriptionRequestStatus.RESPONDED);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PharmacyRepository pharmacyRepository;
    private final InventoryRepository inventoryRepository;
    private final ReservationRepository reservationRepository;
    private final PrescriptionRequestRepository prescriptionRequestRepository;
    private final NotificationRepository notificationRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ReservationService reservationService;
    private final ImageService imageService;
    private final CurrentUserProvider currentUserProvider;
    private final PasswordEncoder passwordEncoder;

    /** READ_COMMITTED: the open-reservation check runs after taking row locks and must see rows committed meanwhile. */
    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteMyAccount(DeleteAccountRequest request) {
        User user = currentUserProvider.getCurrentUser();
        requireNotAdmin(user, "Admin accounts can't be deleted");
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidPasswordException("Incorrect password");
        }
        delete(user);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteUser(UUID id) {
        User user = findLiveUser(id);
        requireNotAdmin(user, "Admin accounts can't be deleted");
        delete(user);
    }

    @Override
    @Transactional
    public void suspend(UUID id) {
        User user = findLiveUser(id);
        requireNotAdmin(user, "Admin accounts can't be suspended");
        user.setSuspended(true);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void reactivate(UUID id) {
        User user = findLiveUser(id);
        requireNotAdmin(user, "Admin accounts can't be suspended or reactivated");
        user.setSuspended(false);
        userRepository.save(user);
    }

    private void delete(User user) {
        if (user.getRole() == Role.PHARMACY_OWNER) {
            deactivatePharmacy(user);
        } else {
            removeCustomerData(user);
            renameInOtherNotifications(user);
        }
        notificationRepository.deleteByRecipient_Id(user.getId());
        anonymise(user);
    }

    private void removeCustomerData(User customer) {
        UUID customerId = customer.getId();
        reservationService.cancelConfirmedForPatient(customerId, DELETION_CANCEL_REASON);
        for (PrescriptionRequest request : prescriptionRequestRepository.findByPatientIdOrderByCreatedAtDesc(customerId)) {
            if (OPEN_REQUEST_STATUSES.contains(request.getStatus())) {
                request.setStatus(PrescriptionRequestStatus.CLOSED);
            }
            // Free text and location could identify the customer; the age may stay.
            request.setNote(null);
            request.setLatitude(null);
            request.setLongitude(null);
            request.setDistrict(null);
            prescriptionRequestRepository.save(request);
            imageService.purgeFile(request.getImage());
        }
        bookmarkRepository.deleteByUserId(customerId);
    }

    /** Pharmacies' notifications about this customer (new reservation, cancellation, expiry) stop naming them. */
    private void renameInOtherNotifications(User customer) {
        for (Notification notification : notificationRepository.findMentioningCustomer(customer.getId().toString())) {
            Map<String, String> params = new LinkedHashMap<>(notification.getParams());
            params.put("customer", DELETED_NAME);
            notification.setParams(params);
            notificationRepository.save(notification);
        }
    }

    /**
     * Locks the pharmacy's inventory rows first (the same id-ordered locks a reservation create takes),
     * so a reservation can't be created between the open-reservation check and marking stock unavailable.
     */
    private void deactivatePharmacy(User owner) {
        pharmacyRepository.findByUserId(owner.getId()).ifPresent(pharmacy -> {
            List<UUID> inventoryIds = inventoryRepository.findByPharmacyId(pharmacy.getId()).stream()
                    .map(Inventory::getId)
                    .toList();
            List<Inventory> locked = inventoryIds.isEmpty() ? List.of() : inventoryRepository.lockAllById(inventoryIds);
            if (reservationRepository.existsByPharmacyIdAndStatus(pharmacy.getId(), ReservationStatus.CONFIRMED)) {
                throw new OpenReservationsException("Complete or cancel open reservations first");
            }
            pharmacy.setStatus(PharmacyStatus.DEACTIVATED);
            pharmacyRepository.save(pharmacy);
            for (Inventory inventory : locked) {
                inventory.setAvailable(false);
            }
        });
    }

    private void anonymise(User user) {
        user.setName(DELETED_NAME);
        user.setEmail("deleted-" + user.getId() + "@deleted.suwalink.invalid");
        user.setPhone(DELETED_PHONE);
        user.setPassword(passwordEncoder.encode(randomSecret()));
        user.setDistrict(null);
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);
        user.setSuspended(false);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    private static String randomSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    private static void requireNotAdmin(User user, String message) {
        if (user.getRole() == Role.ADMIN) {
            throw new AccountActionNotAllowedException(message);
        }
    }

    private User findLiveUser(UUID id) {
        return userRepository.findById(id)
                .filter(user -> user.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }
}
