package com.suwalink.bootstrap;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.suwalink.service.DemoDataService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;

class DemoDataSeederTest {

    @Test
    void seedingFailureIsLoggedAndDoesNotStopStartup() {
        DemoDataService service = mock(DemoDataService.class);
        doThrow(new IllegalStateException("catalog broken")).when(service).seedIfMissing();

        assertThatCode(() -> new DemoDataSeeder(service).run(new DefaultApplicationArguments()))
            .doesNotThrowAnyException();
        verify(service).seedIfMissing();
    }
}
