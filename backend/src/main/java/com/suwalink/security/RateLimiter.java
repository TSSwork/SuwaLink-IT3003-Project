package com.suwalink.security;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

/**
 * In-memory fixed-window limiter, keyed by (bucket, key). Single-instance only; state is lost on
 * restart. Expired windows are swept at most once a minute from the acquire path.
 */
@Component
public class RateLimiter {

    private static final long SWEEP_INTERVAL_MS = 60_000;

    private static final class Window {
        final long endMillis;
        int count;

        Window(long endMillis) {
            this.endMillis = endMillis;
        }
    }

    private final Clock clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicLong lastSweep;

    public RateLimiter(Clock clock) {
        this.clock = clock;
        this.lastSweep = new AtomicLong(clock.millis());
    }

    /** Counts one attempt; returns false (without counting further) once the window's limit is used up. */
    public boolean tryAcquire(String bucket, String key, int limit, Duration window) {
        long now = clock.millis();
        sweep(now);
        boolean[] allowed = {false};
        windows.compute(bucket + '|' + key, (k, w) -> {
            Window current = (w == null || w.endMillis <= now) ? new Window(now + window.toMillis()) : w;
            if (current.count < limit) {
                current.count++;
                allowed[0] = true;
            }
            return current;
        });
        return allowed[0];
    }

    /** Seconds until the current window for (bucket, key) ends; at least 1. */
    public long retryAfterSeconds(String bucket, String key) {
        Window w = windows.get(bucket + '|' + key);
        if (w == null) {
            return 1;
        }
        long remaining = w.endMillis - clock.millis();
        return Math.max(1, (remaining + 999) / 1000);
    }

    private void sweep(long now) {
        long last = lastSweep.get();
        if (now - last >= SWEEP_INTERVAL_MS && lastSweep.compareAndSet(last, now)) {
            windows.values().removeIf(w -> w.endMillis <= now);
        }
    }
}
