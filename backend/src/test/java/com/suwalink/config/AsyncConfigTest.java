package com.suwalink.config;

import static org.assertj.core.api.Assertions.assertThatCode;

import java.util.concurrent.RejectedExecutionHandler;
import org.junit.jupiter.api.Test;

class AsyncConfigTest {

    @Test
    void rejectionHandlerDiscardsWithoutThrowing() {
        RejectedExecutionHandler handler = AsyncConfig.dropAndWarn();
        assertThatCode(() -> handler.rejectedExecution(() -> { }, null)).doesNotThrowAnyException();
    }
}
