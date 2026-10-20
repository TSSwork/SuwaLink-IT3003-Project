package com.suwalink.service.impl;

import com.suwalink.dto.response.ImageContent;
import com.suwalink.dto.response.ImageResponse;
import com.suwalink.entity.Image;
import com.suwalink.entity.ImageType;
import com.suwalink.exception.FileStorageException;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.exception.InvalidFileException;
import com.suwalink.exception.PrescriptionAccessDeniedException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.ImageRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.security.CurrentUserProvider;
import com.suwalink.service.ImageService;
import dev.matrixlab.webp4j.WebPCodec;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ImageServiceImpl implements ImageService {

    private static final float WEBP_QUALITY = 80.0f;

    private final ImageRepository imageRepository;
    private final CurrentUserProvider currentUserProvider;
    private final PrescriptionRequestRepository prescriptionRequestRepository;
    private final PharmacyRepository pharmacyRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Override
    @Transactional
    public ImageResponse upload(MultipartFile file, ImageType imageType) {
        if (file.isEmpty()) {
            throw new InvalidFileException("Uploaded file is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new InvalidFileException("Uploaded file must be an image");
        }

        BufferedImage bufferedImage = readImage(file);
        byte[] webpBytes = encodeToWebP(bufferedImage);

        String generatedFilename = UUID.randomUUID() + ".webp";
        writeToDisk(generatedFilename, webpBytes);

        Image image = Image.builder()
            .url("/api/images/public/" + generatedFilename)
            .originalFilename(file.getOriginalFilename())
            .generatedFilename(generatedFilename)
            .filePath(uploadDir + "/" + generatedFilename)
            .mimeType("image/webp")
            .imageType(imageType)
            .uploadedByUserId(currentUserProvider.getCurrentUser().getId())
            .build();

        Image saved = imageRepository.save(image);
        if (imageType == ImageType.PRESCRIPTION) {
            saved.setUrl("/api/images/" + saved.getId() + "/content");
            saved = imageRepository.save(saved);
        }
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ImageContent loadPublic(String generatedFilename) {
        Image image = imageRepository.findByGeneratedFilename(generatedFilename)
            .filter(i -> i.getImageType() != ImageType.PRESCRIPTION)
            .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
        return toContent(image);
    }

    @Override
    @Transactional(readOnly = true)
    public ImageContent loadForCurrentUser(UUID imageId) {
        Image image = imageRepository.findById(imageId)
            .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
        if (image.getImageType() == ImageType.PRESCRIPTION && !canViewPrescriptionImage(image)) {
            throw new PrescriptionAccessDeniedException();
        }
        return toContent(image);
    }

    private boolean canViewPrescriptionImage(Image image) {
        User user = currentUserProvider.getCurrentUser();
        if (user.getRole() == Role.ADMIN || user.getId().equals(image.getUploadedByUserId())) {
            return true;
        }
        Optional<PrescriptionRequest> request = prescriptionRequestRepository.findByImageId(image.getId());
        if (request.isEmpty()) {
            return false;
        }
        if (request.get().getPatient().getId().equals(user.getId())) {
            return true;
        }
        return pharmacyRepository.findByUserId(user.getId())
            .map(pharmacy -> prescriptionRequestRepository
                .existsByIdAndTargetPharmacies_Id(request.get().getId(), pharmacy.getId()))
            .orElse(false);
    }

    /** Resolves the stored file, refusing anything that is not inside the upload directory. */
    private ImageContent toContent(Image image) {
        Path base = Path.of(uploadDir).toAbsolutePath().normalize();
        Path file = Path.of(image.getFilePath()).toAbsolutePath().normalize();
        if (!file.startsWith(base) || !Files.isRegularFile(file)) {
            throw new ResourceNotFoundException("Image not found");
        }
        Resource resource = new FileSystemResource(file);
        return new ImageContent(resource, image.getMimeType(), image.getImageType() == ImageType.PRESCRIPTION);
    }

    private BufferedImage readImage(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            BufferedImage image = ImageIO.read(inputStream);
            if (image == null) {
                throw new InvalidFileException("Uploaded file is not a readable image");
            }
            return image;
        } catch (IOException e) {
            throw new FileStorageException("Failed to read uploaded image", e);
        }
    }

    private byte[] encodeToWebP(BufferedImage image) {
        try {
            return WebPCodec.encodeImage(image, WEBP_QUALITY);
        } catch (IOException e) {
            throw new FileStorageException("Failed to encode image to WebP", e);
        }
    }

    private void writeToDisk(String generatedFilename, byte[] bytes) {
        try {
            Path dir = Path.of(uploadDir);
            Files.createDirectories(dir);
            Files.write(dir.resolve(generatedFilename), bytes);
        } catch (IOException e) {
            throw new FileStorageException("Failed to save uploaded image", e);
        }
    }

    private ImageResponse toResponse(Image image) {
        return ImageResponse.builder()
            .id(image.getId())
            .url(image.getUrl())
            .imageType(image.getImageType())
            .originalFilename(image.getOriginalFilename())
            .mimeType(image.getMimeType())
            .build();
    }
}
