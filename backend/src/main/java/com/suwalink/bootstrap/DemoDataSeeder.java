package com.suwalink.bootstrap;

import com.suwalink.service.DemoDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Seeds the demo dataset on startup when none exists. Off in tests ({@code app.demo.seed-enabled=false}).
 * A seeding failure is logged and never stops the application from starting.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.demo.seed-enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private final DemoDataService demoDataService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            demoDataService.seedIfMissing();
        } catch (RuntimeException e) {
            // class + message only: no stack trace, which could carry row data
            log.error("Demo data seeding failed; continuing without demo data: {}: {}",
                e.getClass().getName(), e.getMessage());
        }
    }
}
