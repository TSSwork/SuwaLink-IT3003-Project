package com.suwalink.config;

import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Stops startup when app.frontend.base-url (FRONTEND_BASE_URL) is not an absolute http(s) URL.
 * Links in emails are built from it, and a bare domain (e.g. SITE_ADDRESS=suwalink.example.lk,
 * which compose copies into FRONTEND_BASE_URL) would make every link scheme-less and unusable.
 */
@Component
public class FrontendBaseUrlCheck {

    private static final Pattern HTTP_URL = Pattern.compile("(?i)^https?://[^/\\s]+.*");

    public FrontendBaseUrlCheck(@Value("${app.frontend.base-url}") String baseUrl) {
        if (baseUrl == null || !HTTP_URL.matcher(baseUrl.trim()).matches()) {
            throw new IllegalStateException("FRONTEND_BASE_URL must start with http:// or https://, got '"
                    + baseUrl + "'. It defaults to SITE_ADDRESS: write the scheme there,"
                    + " e.g. SITE_ADDRESS=https://suwalink.example.lk");
        }
    }
}
