package com.suwalink.IT3003.service.impl;

import com.suwalink.IT3003.dto.request.CreatePrescriptionRequest;
import com.suwalink.IT3003.dto.request.UpdatePrescriptionRequest;
import com.suwalink.IT3003.dto.response.ImageResponse;
import com.suwalink.IT3003.dto.response.PrescriptionRequestResponse;
import com.suwalink.IT3003.entity.Image;
import com.suwalink.IT3003.entity.ImageType;
import com.suwalink.IT3003.entity.PrescriptionRequest;
import com.suwalink.IT3003.entity.PrescriptionRequestStatus;
import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.event.PrescriptionAddedEvent;
import com.suwalink.IT3003.exception.PrescriptionAccessDeniedException;
import com.suwalink.IT3003.exception.ResourceNotFoundException;
import com.suwalink.IT3003.repository.ImageRepository;
import com.suwalink.IT3003.repository.PharmacyRepository;
import com.suwalink.IT3003.repository.PrescriptionRequestRepository;
import com.suwalink.IT3003.security.CurrentUserProvider;
import com.suwalink.IT3003.service.ImageService;
import com.suwalink.IT3003.service.PrescriptionRequestService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Lets a patient submit, view, edit, and delete their own prescription requests, and lets
 * pharmacies browse pending ones. Tagging inventory against a request (and notifying
 * pharmacies) is a separate, not-yet-built module - see README/READ_PRESCRIPTION_MODULE.md.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PrescriptionRequestServiceImpl implements PrescriptionRequestService {

    private final PrescriptionRequestRepository prescriptionRequestRepository;
    private final ImageRepository imageRepository;
    private final ImageService imageService;
    private final CurrentUserProvider currentUserProvider;
    private final PharmacyRepository pharmacyRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public PrescriptionRequestResponse create(CreatePrescriptionRequest request) {
        User patient = currentUserProvider.getCurrentUser();
        Image image = uploadImage(request.getImage());

        PrescriptionRequest prescriptionRequest = PrescriptionRequest.builder()
            .patient(patient)
            .image(image)
            .patientAge(request.getPatientAge())
            .note(blankToNull(request.getNote()))
            .status(PrescriptionRequestStatus.PENDING)
            .build();

        PrescriptionRequest saved = prescriptionRequestRepository.save(prescriptionRequest);

        List<UUID> pharmacyUserIds = pharmacyRepository.findByVerifiedTrue().stream()
            .map(pharmacy -> pharmacy.getUser().getId())
            .toList();
        eventPublisher.publishEvent(new PrescriptionAddedEvent(this, pharmacyUserIds));

        return toResponse(saved);
    }

    @Override
    public List<PrescriptionRequestResponse> getMyRequests() {
        User patient = currentUserProvider.getCurrentUser();
        return prescriptionRequestRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId()).stream()
            .map(this::toResponse)
            .toList();
    }

    @Override
    public PrescriptionRequestResponse getById(UUID id) {
        PrescriptionRequest prescriptionRequest = findOrThrow(id);
        User currentUser = currentUserProvider.getCurrentUser();

        boolean isOwner = prescriptionRequest.getPatient().getId().equals(currentUser.getId());
        boolean isPharmacy = currentUser.getRole() == Role.PHARMACY_ADMIN;
        if (!isOwner && !isPharmacy) {
            throw new PrescriptionAccessDeniedException();
        }

        return toResponse(prescriptionRequest);
    }

    @Override
    @Transactional
    public PrescriptionRequestResponse update(UUID id, UpdatePrescriptionRequest request) {
        PrescriptionRequest prescriptionRequest = ownedRequest(id);

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
        Image image = prescriptionRequest.getImage();
        prescriptionRequestRepository.delete(prescriptionRequest);
        prescriptionRequestRepository.flush();
        deleteImage(image);
    }

    @Override
    public List<PrescriptionRequestResponse> listPending() {
        return prescriptionRequestRepository.findByStatusOrderByCreatedAtDesc(PrescriptionRequestStatus.PENDING)
            .stream()
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
        return PrescriptionRequestResponse.builder()
            .id(prescriptionRequest.getId())
            .patientId(prescriptionRequest.getPatient().getId())
            .patientName(prescriptionRequest.getPatient().getName())
            .patientAge(prescriptionRequest.getPatientAge())
            .note(prescriptionRequest.getNote())
            .status(prescriptionRequest.getStatus())
            .imageUrl(prescriptionRequest.getImage().getUrl())
            .createdAt(prescriptionRequest.getCreatedAt())
            .updatedAt(prescriptionRequest.getUpdatedAt())
            .build();
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
