package com.suwalink.util;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

/**
 * Looks up a bundle message and fills its named placeholders ({@code {pharmacy}}, {@code {items}}, …).
 * Used for both in-app and email text. Unknown placeholders are left as written.
 */
@Component
@RequiredArgsConstructor
public class MessageRenderer {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{([A-Za-z0-9_-]+)}");

    private final MessageSource messageSource;

    public String render(String key, Map<String, String> params, Locale locale) {
        // No args: the message is returned verbatim (no MessageFormat), so quotes need no escaping.
        String template = messageSource.getMessage(key, null, locale);
        return fill(template, params == null ? Map.of() : params);
    }

    static String fill(String template, Map<String, String> params) {
        Matcher matcher = PLACEHOLDER.matcher(template);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String value = params.get(matcher.group(1));
            matcher.appendReplacement(out, Matcher.quoteReplacement(value != null ? value : matcher.group()));
        }
        matcher.appendTail(out);
        return out.toString();
    }
}
