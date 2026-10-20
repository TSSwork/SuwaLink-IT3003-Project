package com.suwalink.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Supported UI/notification languages. Serialized as the lowercase code ("en", "si", "ta") in JSON and the DB. */
public enum Language {
    EN("en"),
    SI("si"),
    TA("ta");

    private final String code;

    Language(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    public Locale toLocale() {
        return Locale.forLanguageTag(code);
    }

    @JsonCreator
    public static Language fromCode(String value) {
        for (Language language : values()) {
            if (language.code.equalsIgnoreCase(value)) {
                return language;
            }
        }
        throw new IllegalArgumentException("Unsupported language: " + value);
    }
}
