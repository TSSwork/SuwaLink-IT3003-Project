package com.suwalink.dto.response;

import org.springframework.core.io.Resource;

/** A stored image ready to stream; {@code isPrivate} images must not be cached by shared caches. */
public record ImageContent(Resource resource, String mimeType, boolean isPrivate) {
}
