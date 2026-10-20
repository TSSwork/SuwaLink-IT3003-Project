package com.suwalink.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.suwalink.config.I18nConfig;
import java.util.Locale;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.NoSuchMessageException;
import org.springframework.context.support.StaticMessageSource;

class MessageRendererTest {

    private final StaticMessageSource source = new StaticMessageSource();
    private final MessageRenderer renderer = new MessageRenderer(source);

    @Test
    void unknownPlaceholderIsLeftAsWritten() {
        source.addMessage("k", Locale.ENGLISH, "Hi {name}, see {other}");
        assertThat(renderer.render("k", Map.of("name", "Sam"), Locale.ENGLISH)).isEqualTo("Hi Sam, see {other}");
    }

    @Test
    void dollarAndBackslashInValuesAreRenderedLiterally() {
        source.addMessage("k", Locale.ENGLISH, "Pay {amount} at {path}");
        assertThat(renderer.render("k", Map.of("amount", "$1.50 and $2", "path", "C:\\temp\\x"), Locale.ENGLISH))
                .isEqualTo("Pay $1.50 and $2 at C:\\temp\\x");
    }

    @Test
    void nullParamsAreTreatedAsEmpty() {
        source.addMessage("k", Locale.ENGLISH, "Hi {name}");
        assertThat(renderer.render("k", null, Locale.ENGLISH)).isEqualTo("Hi {name}");
    }

    @Test
    void missingKeyThrowsNoSuchMessageException() {
        MessageRenderer real = new MessageRenderer(new I18nConfig().messageSource());
        assertThatThrownBy(() -> real.render("no.such.key", Map.of(), Locale.ENGLISH))
                .isInstanceOf(NoSuchMessageException.class);
    }
}
