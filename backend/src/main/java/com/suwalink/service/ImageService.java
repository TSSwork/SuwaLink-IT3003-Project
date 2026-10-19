package com.suwalink.service;

import com.suwalink.dto.response.ImageResponse;
import com.suwalink.entity.ImageType;
import org.springframework.web.multipart.MultipartFile;

public interface ImageService {

    ImageResponse upload(MultipartFile file, ImageType imageType);
}
