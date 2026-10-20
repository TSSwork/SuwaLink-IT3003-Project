package com.suwalink.config;

import java.util.concurrent.RejectedExecutionHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** Bounded executor for sending email off the request thread. */
@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig {

    public static final String MAIL_EXECUTOR = "mailExecutor";

    /** {@code app.async.synchronous=true} (test profile) runs async work on the caller's thread. */
    @Bean(name = MAIL_EXECUTOR)
    public TaskExecutor mailExecutor(
            @Value("${app.async.synchronous:false}") boolean synchronous,
            @Value("${app.async.mail.core-pool-size:2}") int core,
            @Value("${app.async.mail.max-pool-size:4}") int max,
            @Value("${app.async.mail.queue-capacity:100}") int queue) {
        if (synchronous) {
            return new SyncTaskExecutor();
        }
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(core);
        executor.setMaxPoolSize(max);
        executor.setQueueCapacity(queue);
        executor.setThreadNamePrefix("mail-");
        executor.setRejectedExecutionHandler(dropAndWarn());
        return executor;
    }

    /**
     * A saturated executor must not throw into the publisher's after-commit callback (the business
     * transaction has already committed); the email is dropped and the notification stays in-app.
     */
    static RejectedExecutionHandler dropAndWarn() {
        return (task, pool) -> log.warn("Notification email dropped: executor saturated");
    }
}
