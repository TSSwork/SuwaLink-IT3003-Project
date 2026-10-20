package com.suwalink.controller;

import com.suwalink.dto.response.ApiResponse;
import com.suwalink.dto.response.ImageContent;
import com.suwalink.dto.response.ImageResponse;
import com.suwalink.entity.ImageType;
import com.suwalink.exception.InvalidFileException;
import com.suwalink.service.ImageService;
import java.util.UUID;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
        if (imageType == ImageType.PRESCRIPTION) {
            throw new InvalidFileException("Prescription images can only be uploaded with a prescription request");
        }
        ImageResponse response = imageService.upload(file, imageType);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Image uploaded", response));
    }

    @GetMapping("/public/{filename}")
    public ResponseEntity<org.springframework.core.io.Resource> servePublic(@PathVariable String filename) {
        ImageContent content = imageService.loadPublic(filename);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(content.mimeType()))
            .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic())
            .body(content.resource());
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<org.springframework.core.io.Resource> serveForCurrentUser(@PathVariable UUID id) {
        ImageContent content = imageService.loadForCurrentUser(id);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(content.mimeType()))
            .cacheControl(CacheControl.noStore().cachePrivate())
            .body(content.resource());
    }
}
