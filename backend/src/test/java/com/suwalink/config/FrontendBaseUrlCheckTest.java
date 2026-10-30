package com.suwalink.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class FrontendBaseUrlCheckTest {

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost", "http://localhost:8088", "https://suwalink.example.lk",
                            "HTTPS://suwalink.example.lk/"})
    void acceptsAbsoluteHttpUrls(String url) {
        assertThatCode(() -> new FrontendBaseUrlCheck(url)).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"suwalink.example.lk", "localhost:8088", "ftp://suwalink.example.lk", "https://", " "})
    void rejectsUrlsWithoutHttpScheme(String url) {
        assertThatThrownBy(() -> new FrontendBaseUrlCheck(url))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("FRONTEND_BASE_URL")
            .hasMessageContaining("http://")
            .hasMessageContaining("SITE_ADDRESS");
    }

    @Test
    void rejectsMissingUrl() {
        assertThatThrownBy(() -> new FrontendBaseUrlCheck(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("FRONTEND_BASE_URL");
    }
}
