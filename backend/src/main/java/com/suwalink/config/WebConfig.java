package com.suwalink.config;

import com.suwalink.entity.District;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, District.class,
            source -> District.valueOf(source.trim().toUpperCase().replace(' ', '_')));
    }
}
