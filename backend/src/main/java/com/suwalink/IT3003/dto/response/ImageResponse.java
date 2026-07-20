package com.suwalink.IT3003.dto.response;

import com.suwalink.IT3003.entity.ImageType;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ImageResponse {

    private final UUID id;
    private final String url;
    private final ImageType imageType;
    private final String originalFilename;
    private final String mimeType;
}
