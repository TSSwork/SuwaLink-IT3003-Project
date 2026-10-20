package com.suwalink.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Properties;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** A translation that drops or renames a {placeholder} would silently render wrong text. */
class MessageBundlesTest {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{([A-Za-z0-9_-]+)}");

    @Test
    void placeholderNamesMatchAcrossLanguagesForEveryKey() throws Exception {
        Properties en = load("messages");
        for (String bundle : new String[] {"messages_si", "messages_ta"}) {
            Properties other = load(bundle);
            for (String key : en.stringPropertyNames()) {
                assertThat(placeholders(other.getProperty(key)))
                        .as(bundle + ": placeholders of " + key)
                        .isEqualTo(placeholders(en.getProperty(key)));
            }
        }
    }

    private static Set<String> placeholders(String text) {
        Set<String> names = new HashSet<>();
        if (text != null) {
            Matcher matcher = PLACEHOLDER.matcher(text);
            while (matcher.find()) {
                names.add(matcher.group(1));
            }
        }
        return names;
    }

    private Properties load(String bundle) throws Exception {
        Properties properties = new Properties();
        try (var in = getClass().getResourceAsStream("/i18n/" + bundle + ".properties")) {
            properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return properties;
    }
}
