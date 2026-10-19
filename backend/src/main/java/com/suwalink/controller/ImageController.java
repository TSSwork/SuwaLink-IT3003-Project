package com.suwalink.controller;

import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.ImageResponse;
import com.suwalink.entity.ImageType;
import com.suwalink.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class ImageController {

    private final ImageService imageService;

    @PostMapping
    public ResponseEntity<ApiResponse<ImageResponse>> upload(
            @RequestParam MultipartFile file, @RequestParam ImageType imageType) {
        ImageResponse response = imageService.upload(file, imageType);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Image uploaded", response));
    }
}
