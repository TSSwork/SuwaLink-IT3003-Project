package com.suwalink.security;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Value;
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
    private final int maxEntries;

    public RateLimiter(Clock clock, @Value("${app.rate-limit.max-entries:100000}") int maxEntries) {
        this.clock = clock;
        this.maxEntries = maxEntries;
        this.lastSweep = new AtomicLong(clock.millis());
    }

    /** Counts one attempt; returns false (without counting further) once the window's limit is used up. */
    public boolean tryAcquire(String bucket, String key, int limit, Duration window) {
        long now = clock.millis();
        sweep(now, false);
        if (windows.size() >= maxEntries) {
            sweep(now, true);
        }
        boolean[] allowed = {false};
        windows.compute(bucket + '|' + key, (k, w) -> {
            if (w == null && windows.size() >= maxEntries) {
                return null; // table full of live windows: refuse new keys instead of growing
            }
            Window current = (w == null || w.endMillis <= now) ? new Window(now + window.toMillis()) : w;
            if (current.count < limit) {
                current.count++;
                allowed[0] = true;
            }
            return current;
        });
        return allowed[0];
    }

    /**
     * True when (bucket, key) still has room in its current window, without counting anything.
     * A key with no live window is refused only when the table is full (as {@link #tryAcquire} would).
     */
    public boolean hasRemaining(String bucket, String key, int limit) {
        long now = clock.millis();
        Window w = windows.get(bucket + '|' + key);
        if (w == null || w.endMillis <= now) {
            return windows.size() < maxEntries || w != null;
        }
        return w.count < limit;
    }

    /** Counts one attempt regardless of the limit (used after the fact, e.g. for a failed login). */
    public void record(String bucket, String key, Duration window) {
        tryAcquire(bucket, key, Integer.MAX_VALUE, window);
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

    int size() {
        return windows.size();
    }

    private void sweep(long now, boolean force) {
        long last = lastSweep.get();
        if (force || (now - last >= SWEEP_INTERVAL_MS && lastSweep.compareAndSet(last, now))) {
            windows.values().removeIf(w -> w.endMillis <= now);
        }
    }
}
