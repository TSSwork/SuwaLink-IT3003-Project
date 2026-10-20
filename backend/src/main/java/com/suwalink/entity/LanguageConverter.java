package com.suwalink.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores {@link Language} as its lowercase code ("en"/"si"/"ta"). */
@Converter
public class LanguageConverter implements AttributeConverter<Language, String> {

    @Override
    public String convertToDatabaseColumn(Language language) {
        return language == null ? null : language.code();
    }

    @Override
    public Language convertToEntityAttribute(String code) {
        return code == null ? null : Language.fromCode(code);
    }
}
