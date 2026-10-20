package com.suwalink.service;

import com.suwalink.dto.response.ImageContent;
import com.suwalink.dto.response.ImageResponse;
import com.suwalink.entity.ImageType;
import com.suwalink.entity.Image;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

public interface ImageService {

    ImageResponse upload(MultipartFile file, ImageType imageType);

    /** Serves a non-prescription image by its generated filename; prescription images are never public. */
    ImageContent loadPublic(String generatedFilename);

    /** Serves an image to the current user if they may see it (see prescription access rules). */
    ImageContent loadForCurrentUser(UUID imageId);

    /**
     * Deletes the stored file of an image and marks it purged (the row stays, so reads answer 410 Gone).
     * Joins the caller's transaction; a no-op if already purged.
     */
    void purgeFile(Image image);

    /**
     * Purges the images of prescription requests that were closed or expired more than
     * {@code app.prescription.image-retention-days} ago. Each image is purged in its own transaction.
     *
     * @return how many images were purged
     */
    int purgeOldPrescriptionImages(LocalDateTime now);
}
