package com.suwalink.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.LinkedHashMap;
import java.util.Map;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** Stores a {@code Map<String,String>} as a JSON object in a TEXT column ({@code {}} when empty). */
@Converter
public class StringMapJsonConverter implements AttributeConverter<Map<String, String>, String> {

    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final TypeReference<LinkedHashMap<String, String>> TYPE = new TypeReference<>() { };

    @Override
    public String convertToDatabaseColumn(Map<String, String> map) {
        return map == null || map.isEmpty() ? "{}" : JSON.writeValueAsString(map);
    }

    @Override
    public Map<String, String> convertToEntityAttribute(String json) {
        return json == null || json.isBlank() ? new LinkedHashMap<>() : JSON.readValue(json, TYPE);
    }
}
