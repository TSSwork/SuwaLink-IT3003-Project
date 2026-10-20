package com.suwalink.service;

import com.suwalink.dto.response.ImageContent;
import com.suwalink.dto.response.ImageResponse;
import com.suwalink.entity.ImageType;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

public interface ImageService {

    ImageResponse upload(MultipartFile file, ImageType imageType);

    /** Serves a non-prescription image by its generated filename; prescription images are never public. */
    ImageContent loadPublic(String generatedFilename);

    /** Serves an image to the current user if they may see it (see prescription access rules). */
    ImageContent loadForCurrentUser(UUID imageId);
}
