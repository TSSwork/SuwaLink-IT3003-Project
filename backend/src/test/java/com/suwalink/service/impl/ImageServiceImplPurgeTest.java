package com.suwalink.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.suwalink.entity.Image;
import com.suwalink.entity.ImageType;
import com.suwalink.repository.ImageRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

class ImageServiceImplPurgeTest {

    @TempDir Path tmp;

    @Test
    void purgeFileLeavesFilesOutsideTheUploadDirAndDoesNotMarkPurged() throws Exception {
        Path uploads = Files.createDirectory(tmp.resolve("uploads"));
        Path outside = Files.writeString(tmp.resolve("elsewhere.webp"), "x");
        ImageRepository repository = mock(ImageRepository.class);
        ImageServiceImpl service = new ImageServiceImpl(repository, null, null, null, null);
        ReflectionTestUtils.setField(service, "uploadDir", uploads.toString());
        Image image = Image.builder().id(UUID.randomUUID()).filePath(outside.toString())
                .imageType(ImageType.PRESCRIPTION).build();

        service.purgeFile(image);

        assertThat(outside).exists();
        assertThat(image.getPurgedAt()).isNull();
        verifyNoInteractions(repository);
    }
}
