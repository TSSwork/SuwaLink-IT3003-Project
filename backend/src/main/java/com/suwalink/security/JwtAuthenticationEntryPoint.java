package com.suwalink.security;

import com.suwalink.dto.response.ApiErrorResponse;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Ensures missing/invalid/expired credentials produce 401 (Unauthorized), not
 * Spring Security's Http403ForbiddenEntryPoint default. Keeps 403 reserved for
 * real authorization denials (e.g. PharmacyNotVerifiedException).
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ApiErrorResponse body = ApiErrorResponse.builder()
            .code("UNAUTHENTICATED")
            .message("Authentication required")
            .build();

        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
