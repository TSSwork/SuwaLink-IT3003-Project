package com.suwalink.IT3003.service;

import com.suwalink.IT3003.dto.response.ImageResponse;
import com.suwalink.IT3003.entity.ImageType;
import org.springframework.web.multipart.MultipartFile;

public interface ImageService {

    ImageResponse upload(MultipartFile file, ImageType imageType);
}
