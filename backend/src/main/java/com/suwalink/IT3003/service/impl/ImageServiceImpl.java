package com.suwalink.IT3003.service.impl;

import com.suwalink.IT3003.dto.response.ImageResponse;
import com.suwalink.IT3003.entity.Image;
import com.suwalink.IT3003.entity.ImageType;
import com.suwalink.IT3003.exception.FileStorageException;
import com.suwalink.IT3003.exception.InvalidFileException;
import com.suwalink.IT3003.repository.ImageRepository;
import com.suwalink.IT3003.security.CurrentUserProvider;
import com.suwalink.IT3003.service.ImageService;
import dev.matrixlab.webp4j.WebPCodec;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ImageServiceImpl implements ImageService {

    private static final float WEBP_QUALITY = 80.0f;

    private final ImageRepository imageRepository;
    private final CurrentUserProvider currentUserProvider;

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
            .url("/uploads/" + generatedFilename)
            .originalFilename(file.getOriginalFilename())
            .generatedFilename(generatedFilename)
            .filePath(uploadDir + "/" + generatedFilename)
            .mimeType("image/webp")
            .imageType(imageType)
            .uploadedByUserId(currentUserProvider.getCurrentUser().getId())
            .build();

        return toResponse(imageRepository.save(image));
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
