package com.suwalink.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.suwalink.SuwaLinkApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;

class ProdProfileConfigTest {

    @Test
    void prodFailsToStartWithoutJwtSecret() {
        var app = new SpringApplicationBuilder(SuwaLinkApplication.class)
            .profiles("prod").web(WebApplicationType.NONE)
            .properties("DB_URL=jdbc:h2:mem:prodcheck", "DB_USERNAME=sa", "DB_PASSWORD=",
                        "MAIL_HOST=localhost", "ADMIN_EMAIL=a@b.lk", "ADMIN_PASSWORD=long-enough-pass");

        // Command-line args outrank application.properties; builder properties do not.
        Throwable t = catchThrowable(() -> app.run(
            "--JWT_SECRET=",
            "--spring.datasource.driverClassName=org.h2.Driver",
            "--spring.liquibase.enabled=false",
            "--spring.jpa.hibernate.ddl-auto=create-drop"));

        assertThat(t).isNotNull();
        assertThat(rootCauseMessages(t)).contains("JWT_SECRET");
    }

    private static String rootCauseMessages(Throwable t) {
        StringBuilder sb = new StringBuilder();
        for (Throwable c = t; c != null; c = c.getCause()) {
            sb.append(c.getMessage()).append('\n');
        }
        return sb.toString();
    }
}
