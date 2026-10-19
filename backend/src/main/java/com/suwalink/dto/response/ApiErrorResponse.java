package com.suwalink.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ApiErrorResponse {

    @Builder.Default
    private final boolean success = false;
    private final String message;
    private final List<FieldErrorDetail> errors;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class FieldErrorDetail {
        private final String field;
        private final String message;
    }
}
