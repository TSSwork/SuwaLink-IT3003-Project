package com.suwalink.security;

import com.suwalink.dto.response.ApiErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Throttles the unauthenticated auth POST endpoints per client IP and (where the body has one) per email.
 * Login is charged only for failed (401) attempts; the other paths are charged per request.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_BODY_BYTES = 16 * 1024;
    private static final int MAX_EMAIL_LENGTH = 254;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(5);
    private static final Duration REGISTER_WINDOW = Duration.ofHours(1);
    private static final Duration FORGOT_WINDOW = Duration.ofHours(1);
    private static final Duration RESET_WINDOW = Duration.ofMinutes(15);

    private final RateLimiter limiter;
    private final ObjectMapper objectMapper;
    private final MessageSource messageSource;

    @Value("${app.rate-limit.enabled:true}")
    private boolean enabled;
    @Value("${app.rate-limit.login.ip:10}")
    private int loginIp;
    @Value("${app.rate-limit.login.email:5}")
    private int loginEmail;
    @Value("${app.rate-limit.register.ip:5}")
    private int registerIp;
    @Value("${app.rate-limit.forgot-password.email:3}")
    private int forgotEmail;
    @Value("${app.rate-limit.forgot-password.ip:10}")
    private int forgotIp;
    @Value("${app.rate-limit.reset-password.email:10}")
    private int resetEmail;
    @Value("${app.rate-limit.reset-password.ip:20}")
    private int resetIp;

    public RateLimitFilter(RateLimiter limiter, ObjectMapper objectMapper, MessageSource messageSource) {
        this.limiter = limiter;
        this.objectMapper = objectMapper;
        this.messageSource = messageSource;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !enabled || !"POST".equals(request.getMethod()) || !isLimitedPath(request.getRequestURI());
    }

    private static boolean isLimitedPath(String path) {
        return path.startsWith("/api/auth/register/") || path.equals("/api/auth/login")
                || path.equals("/api/auth/forgot-password") || path.equals("/api/auth/reset-password");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String ip = request.getRemoteAddr();
        boolean needsEmail = !path.startsWith("/api/auth/register/");

        HttpServletRequest forwarded = request;
        String email = null;
        if (needsEmail) {
            byte[] body = request.getInputStream().readNBytes(MAX_BODY_BYTES + 1);
            if (body.length > MAX_BODY_BYTES) {
                writeError(request, response, 413, "PAYLOAD_TOO_LARGE", "error.payload_too_large", null);
                return;
            }
            forwarded = new CachedBodyRequest(request, body);
            email = extractEmail(body);
        }

        if (path.equals("/api/auth/login")) {
            filterLogin(request, response, chain, forwarded, ip, email);
            return;
        }

        boolean allowed;
        if (path.equals("/api/auth/forgot-password")) {
            allowed = check("forgot-ip", ip, forgotIp, FORGOT_WINDOW)
                    && check("forgot-email", email, forgotEmail, FORGOT_WINDOW);
        } else if (path.equals("/api/auth/reset-password")) {
            allowed = check("reset-ip", ip, resetIp, RESET_WINDOW)
                    && check("reset-email", email, resetEmail, RESET_WINDOW);
        } else {
            allowed = check("register-ip", ip, registerIp, REGISTER_WINDOW);
        }

        if (!allowed) {
            reject(request, response, retryAfter(path, ip, email));
            return;
        }
        chain.doFilter(forwarded, response);
    }

    /**
     * Login counts only failed attempts: refuse up front once a bucket is used up, and charge both
     * buckets only when the attempt comes back 401 (wrong credentials).
     */
    private void filterLogin(HttpServletRequest request, HttpServletResponse response, FilterChain chain,
            HttpServletRequest forwarded, String ip, String email) throws ServletException, IOException {
        boolean allowed = limiter.hasRemaining("login-ip", ip, loginIp)
                && (email == null || limiter.hasRemaining("login-email", email, loginEmail));
        if (!allowed) {
            reject(request, response, retryAfter(request.getRequestURI(), ip, email));
            return;
        }
        chain.doFilter(forwarded, response);
        if (response.getStatus() == HttpServletResponse.SC_UNAUTHORIZED) {
            limiter.record("login-ip", ip, LOGIN_WINDOW);
            if (email != null) {
                limiter.record("login-email", email, LOGIN_WINDOW);
            }
        }
    }

    /** Null keys (no email in body) are not limited. */
    private boolean check(String bucket, String key, int limit, Duration window) {
        return key == null || limiter.tryAcquire(bucket, key, limit, window);
    }

    private long retryAfter(String path, String ip, String email) {
        long max = 1;
        String[][] candidates = switch (path) {
            case "/api/auth/login" -> new String[][] {{"login-ip", ip}, {"login-email", email}};
            case "/api/auth/forgot-password" -> new String[][] {{"forgot-ip", ip}, {"forgot-email", email}};
            case "/api/auth/reset-password" -> new String[][] {{"reset-ip", ip}, {"reset-email", email}};
            default -> new String[][] {{"register-ip", ip}};
        };
        for (String[] c : candidates) {
            if (c[1] != null) {
                max = Math.max(max, limiter.retryAfterSeconds(c[0], c[1]));
            }
        }
        return max;
    }

    private String extractEmail(byte[] body) {
        try {
            JsonNode node = objectMapper.readTree(body).get("email");
            if (node != null && node.isString() && !node.asString().isBlank()) {
                String normalised = node.asString().trim().toLowerCase(Locale.ROOT);
                // oversize "emails" are not valid anyway; limit by IP only so they can't mint buckets
                return normalised.length() > MAX_EMAIL_LENGTH ? null : normalised;
            }
        } catch (RuntimeException ignored) {
            // malformed JSON: let the controller reject it; only the IP limit applies
        }
        return null;
    }

    private void reject(HttpServletRequest request, HttpServletResponse response, long retryAfter) throws IOException {
        writeError(request, response, 429, "RATE_LIMITED", "error.rate_limited", String.valueOf(retryAfter));
    }

    private void writeError(HttpServletRequest request, HttpServletResponse response, int status, String code,
            String messageKey, String retryAfter) throws IOException {
        response.setStatus(status);
        if (retryAfter != null) {
            response.setHeader("Retry-After", retryAfter);
        }
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        ApiErrorResponse body = ApiErrorResponse.builder()
            .code(code)
            .message(messageSource.getMessage(messageKey, null, request.getLocale()))
            .build();
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    /** Replays the already-read body so the controller can still bind it. */
    private static final class CachedBodyRequest extends HttpServletRequestWrapper {
        private final byte[] body;

        CachedBodyRequest(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream in = new ByteArrayInputStream(body);
            return new ServletInputStream() {
                @Override public int read() { return in.read(); }
                @Override public int read(byte[] b, int off, int len) { return in.read(b, off, len); }
                @Override public boolean isFinished() { return in.available() == 0; }
                @Override public boolean isReady() { return true; }
                @Override public void setReadListener(ReadListener listener) { }
            };
        }

        @Override
        public BufferedReader getReader() {
            String enc = getCharacterEncoding();
            java.nio.charset.Charset cs = enc == null ? StandardCharsets.UTF_8 : java.nio.charset.Charset.forName(enc);
            return new BufferedReader(new InputStreamReader(getInputStream(), cs));
        }
    }
}
