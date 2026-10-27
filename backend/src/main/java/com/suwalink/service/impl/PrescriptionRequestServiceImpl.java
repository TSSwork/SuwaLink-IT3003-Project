package com.suwalink.service.impl;

import com.suwalink.dto.request.CreatePrescriptionRequest;
import com.suwalink.dto.request.UpdatePrescriptionRequest;
import com.suwalink.dto.response.ImageResponse;
import com.suwalink.dto.response.PrescriptionRequestResponse;
import com.suwalink.entity.Image;
import com.suwalink.entity.ImageType;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.District;
import com.suwalink.entity.TargetScope;
import com.suwalink.event.PrescriptionAddedEvent;
import com.suwalink.event.PrescriptionRequestExpiredEvent;
import com.suwalink.exception.NoPharmaciesInScopeException;
import com.suwalink.exception.PrescriptionAccessDeniedException;
import com.suwalink.exception.PrescriptionRequestClosedException;
import com.suwalink.exception.RequestHasReservationsException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.ImageRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.repository.PrescriptionResponseRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.ImageService;
import com.suwalink.service.PrescriptionRequestService;
import com.suwalink.service.PrescriptionTargetingService;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

/**
 * Lets a patient submit, view, edit, and delete their own prescription requests. Each request goes
 * only to the pharmacies picked by its {@link TargetScope}; only those pharmacies (plus the owner
 * and admins) can see it, and it expires after {@code app.prescription.expiry-days}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PrescriptionRequestServiceImpl implements PrescriptionRequestService {

    private final PrescriptionRequestRepository prescriptionRequestRepository;
    private final PrescriptionResponseRepository prescriptionResponseRepository;
    private final ReservationRepository reservationRepository;
    private final ImageRepository imageRepository;
    private final ImageService imageService;
    private final CurrentUserProvider currentUserProvider;
    private final PharmacyRepository pharmacyRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PrescriptionTargetingService targetingService;
    private final PlatformTransactionManager transactionManager;

    @Value("${app.prescription.expiry-days}")
    private int expiryDays;

    private static final Set<PrescriptionRequestStatus> OPEN_STATUSES =
        EnumSet.of(PrescriptionRequestStatus.PENDING, PrescriptionRequestStatus.RESPONDED);

    @Override
    @Transactional
    public PrescriptionRequestResponse create(CreatePrescriptionRequest request) {
        User patient = currentUserProvider.getCurrentUser();
        TargetScope scope = request.getTargetScope();
        BigDecimal latitude = scope == TargetScope.RADIUS_10KM ? request.getLatitude() : null;
        BigDecimal longitude = scope == TargetScope.RADIUS_10KM ? request.getLongitude() : null;
        District district = scope == TargetScope.DISTRICT ? request.getDistrict() : null;

        // Targets first: if nobody would receive the request, fail before writing the image file.
        List<Pharmacy> targets = targetingService.findTargets(scope, latitude, longitude, district);
        if (targets.isEmpty()) {
            throw new NoPharmaciesInScopeException(scope);
        }

        Image image = uploadImage(request.getImage());
        LocalDateTime now = LocalDateTime.now();

        PrescriptionRequest prescriptionRequest = PrescriptionRequest.builder()
            .patient(patient)
            .image(image)
            .patientAge(request.getPatientAge())
            .note(blankToNull(request.getNote()))
            .status(PrescriptionRequestStatus.PENDING)
            .targetScope(scope)
            .latitude(latitude)
            .longitude(longitude)
            .district(district)
            .consentAt(now)
            .expiresAt(now.plusDays(expiryDays))
            .targetPharmacies(new HashSet<>(targets))
            .build();

        PrescriptionRequest saved = prescriptionRequestRepository.save(prescriptionRequest);
        PrescriptionRequestResponse response = toResponse(saved);

        List<UUID> targetUserIds = targets.stream()
            .map(Pharmacy::getUser)
            .map(User::getId)
            .toList();
        eventPublisher.publishEvent(new PrescriptionAddedEvent(this, saved.getId(), patient.getId(), targetUserIds));

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionRequestResponse> getMyRequests() {
        User patient = currentUserProvider.getCurrentUser();
        // One grouped count query for the whole list instead of one per request.
        Map<UUID, Long> responseCounts = prescriptionResponseRepository.countByRequestForPatient(patient.getId())
            .stream()
            .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
        return prescriptionRequestRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId()).stream()
            .map(request -> toResponse(request, responseCounts.getOrDefault(request.getId(), 0L).intValue()))
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PrescriptionRequestResponse getById(UUID id) {
        PrescriptionRequest prescriptionRequest = findOrThrow(id);
        User currentUser = currentUserProvider.getCurrentUser();

        boolean isOwner = prescriptionRequest.getPatient().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin && !isTargetedPharmacy(id, currentUser)) {
            throw new PrescriptionAccessDeniedException();
        }

        return toResponse(prescriptionRequest);
    }

    @Override
    @Transactional
    public PrescriptionRequestResponse update(UUID id, UpdatePrescriptionRequest request) {
        PrescriptionRequest prescriptionRequest = ownedRequest(id);
        if (!OPEN_STATUSES.contains(prescriptionRequest.getStatus())) {
            throw new PrescriptionRequestClosedException();
        }

        prescriptionRequest.setPatientAge(request.getPatientAge());
        prescriptionRequest.setNote(blankToNull(request.getNote()));

        Image oldImage = null;
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            oldImage = prescriptionRequest.getImage();
            prescriptionRequest.setImage(uploadImage(request.getImage()));
        }

        // Flush the new image_id first - deleting the old Image row before the FK is
        // repointed would violate the still-in-place foreign key constraint.
        PrescriptionRequest saved = prescriptionRequestRepository.saveAndFlush(prescriptionRequest);

        if (oldImage != null) {
            deleteImage(oldImage);
        }

        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        PrescriptionRequest prescriptionRequest = ownedRequest(id);
        if (reservationRepository.existsByPrescriptionRequestId(id)) {
            throw new RequestHasReservationsException(
                "This request has reservations and can't be deleted; close it instead");
        }
        Image image = prescriptionRequest.getImage();
        prescriptionRequestRepository.delete(prescriptionRequest);
        prescriptionRequestRepository.flush();
        deleteImage(image);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionRequestResponse> listForMyPharmacy() {
        UUID pharmacyId = pharmacyRepository.findByUserId(currentUserProvider.getCurrentUser().getId())
            .map(Pharmacy::getId)
            .orElseThrow(() -> new ResourceNotFoundException("No pharmacy found for the current user"));
        return prescriptionRequestRepository.findTargetingPharmacy(pharmacyId, OPEN_STATUSES).stream()
            .map(this::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public PrescriptionRequestResponse close(UUID id) {
        PrescriptionRequest prescriptionRequest = ownedRequest(id);
        prescriptionRequest.setStatus(PrescriptionRequestStatus.CLOSED);
        return toResponse(prescriptionRequestRepository.save(prescriptionRequest));
    }

    /** Each request expires in its own transaction, so one failure can't stop the rest. */
    @Override
    public int expireOverdue(LocalDateTime now) {
        TransactionTemplate each = new TransactionTemplate(transactionManager);
        each.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        int expired = 0;
        for (PrescriptionRequest overdue
                : prescriptionRequestRepository.findByStatusInAndExpiresAtBefore(OPEN_STATUSES, now)) {
            UUID id = overdue.getId();
            try {
                if (Boolean.TRUE.equals(each.execute(status -> expireOne(id, now)))) {
                    expired++;
                }
            } catch (RuntimeException e) {
                log.warn("Could not expire prescription request {}: {}", id, e.getClass().getSimpleName());
            }
        }
        return expired;
    }

    private boolean expireOne(UUID id, LocalDateTime now) {
        PrescriptionRequest request = prescriptionRequestRepository.findById(id).orElse(null);
        if (request == null || !OPEN_STATUSES.contains(request.getStatus()) || !request.getExpiresAt().isBefore(now)) {
            return false;
        }
        request.setStatus(PrescriptionRequestStatus.EXPIRED);
        prescriptionRequestRepository.save(request);
        eventPublisher.publishEvent(new PrescriptionRequestExpiredEvent(this, id, request.getPatient().getId()));
        return true;
    }

    private boolean isTargetedPharmacy(UUID requestId, User user) {
        if (user.getRole() != Role.PHARMACY_OWNER) {
            return false;
        }
        return pharmacyRepository.findByUserId(user.getId())
            .map(pharmacy -> prescriptionRequestRepository.existsByIdAndTargetPharmacies_Id(requestId, pharmacy.getId()))
            .orElse(false);
    }

    private Image uploadImage(MultipartFile file) {
        ImageResponse uploaded = imageService.upload(file, ImageType.PRESCRIPTION);
        return imageRepository.findById(uploaded.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Uploaded image not found: " + uploaded.getId()));
    }

    private void deleteImage(Image image) {
        if (image == null) {
            return;
        }
        try {
            Files.deleteIfExists(Path.of(image.getFilePath()));
        } catch (IOException e) {
            log.warn("Could not delete prescription image file at {}", image.getFilePath(), e);
        }
        imageRepository.delete(image);
    }

    private PrescriptionRequest ownedRequest(UUID id) {
        PrescriptionRequest prescriptionRequest = findOrThrow(id);
        User currentUser = currentUserProvider.getCurrentUser();
        if (!prescriptionRequest.getPatient().getId().equals(currentUser.getId())) {
            throw new PrescriptionAccessDeniedException();
        }
        return prescriptionRequest;
    }

    private PrescriptionRequest findOrThrow(UUID id) {
        return prescriptionRequestRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Prescription request not found: " + id));
    }

    private PrescriptionRequestResponse toResponse(PrescriptionRequest prescriptionRequest) {
        return toResponse(prescriptionRequest, null);
    }

    private PrescriptionRequestResponse toResponse(PrescriptionRequest prescriptionRequest, Integer responseCount) {
        return PrescriptionRequestResponse.builder()
            .id(prescriptionRequest.getId())
            .patientId(prescriptionRequest.getPatient().getId())
            .patientName(prescriptionRequest.getPatient().getName())
            .patientAge(prescriptionRequest.getPatientAge())
            .note(prescriptionRequest.getNote())
            .status(prescriptionRequest.getStatus())
            .imageId(prescriptionRequest.getImage().getId())
            .imageUrl("/api/images/" + prescriptionRequest.getImage().getId() + "/content")
            .targetScope(prescriptionRequest.getTargetScope())
            .district(prescriptionRequest.getDistrict())
            .targetCount(prescriptionRequest.getTargetPharmacies().size())
            .responseCount(responseCount)
            .expiresAt(prescriptionRequest.getExpiresAt())
            .createdAt(prescriptionRequest.getCreatedAt())
            .updatedAt(prescriptionRequest.getUpdatedAt())
            .build();
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
