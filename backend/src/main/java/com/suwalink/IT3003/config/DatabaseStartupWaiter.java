package com.suwalink.IT3003.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.Ordered;
import org.springframework.core.env.Environment;

/**
 * Polls MySQL before Spring wires anything up, so a database that is merely
 * slow to start no longer takes the whole app down with a Liquibase/Hikari
 * stack trace. This is the normal case in Docker (MySQL is still initialising
 * when the backend container starts) and locally (running the backend a second
 * after {@code docker compose up -d}).
 *
 * <p>Registered by hand in {@code It3003Application#main}, so tests — which run
 * against in-memory H2 — never go through it.
 */
public class DatabaseStartupWaiter implements ApplicationListener<ApplicationEnvironmentPreparedEvent>, Ordered {

    private static final Logger log = LoggerFactory.getLogger(DatabaseStartupWaiter.class);

    /** Keeps a single probe from hanging when the host is unreachable rather than refusing. */
    private static final int PROBE_CONNECT_TIMEOUT_MS = 5000;

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        Environment env = event.getEnvironment();

        String url = env.getProperty("spring.datasource.url", "");
        if (!url.startsWith("jdbc:mysql")) {
            return;
        }

        Duration timeout = env.getProperty("app.datasource.wait-timeout", Duration.class, Duration.ofSeconds(60));
        if (timeout.isZero() || timeout.isNegative()) {
            return;
        }
        Duration interval = env.getProperty("app.datasource.wait-interval", Duration.class, Duration.ofSeconds(2));

        String username = env.getProperty("spring.datasource.username");
        String password = env.getProperty("spring.datasource.password");
        String probeUrl = withConnectTimeout(url);

        long deadline = System.nanoTime() + timeout.toNanos();
        int attempt = 0;
        SQLException lastFailure;

        while (true) {
            attempt++;
            try (Connection ignored = DriverManager.getConnection(probeUrl, username, password)) {
                if (attempt > 1) {
                    log.info("Database is up (took {} attempt(s)). Continuing startup.", attempt);
                }
                return;
            } catch (SQLException e) {
                lastFailure = e;
            }

            if (System.nanoTime() >= deadline) {
                break;
            }
            log.warn("Database not reachable yet (attempt {}), retrying in {}s...", attempt, interval.toSeconds());
            try {
                Thread.sleep(interval.toMillis());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }

        // Every endpoint needs the database and Liquibase has to run before the
        // app can serve anything, so there's no useful degraded mode to fall
        // back to. Exit with a readable message instead of the 200-line trace
        // Spring would otherwise print.
        log.error("""

                ***************************
                DATABASE NOT AVAILABLE
                ***************************

                Gave up connecting to {} after {}s ({} attempts).

                Start the database, then run the backend again:
                    docker compose up -d mysql

                Last error: {}
                """, url, timeout.toSeconds(), attempt, lastFailure.getMessage());
        System.exit(1);
    }

    private static String withConnectTimeout(String url) {
        if (url.contains("connectTimeout=")) {
            return url;
        }
        return url + (url.contains("?") ? "&" : "?") + "connectTimeout=" + PROBE_CONNECT_TIMEOUT_MS;
    }

    @Override
    public int getOrder() {
        // After Boot's own listeners, so logging is configured by the time we log.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
