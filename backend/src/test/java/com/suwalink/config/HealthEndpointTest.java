package com.suwalink.config;

import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** The container healthcheck hits /actuator/health anonymously; nothing else under /actuator is exposed. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthEndpointTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void anonymousHealthIsUpWithoutDetails() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"))
            // probes add a "groups" list; component details must never be shown
            .andExpect(jsonPath("$.components").doesNotExist())
            .andExpect(jsonPath("$.details").doesNotExist());
    }

    @Test
    void envEndpointIsNotReachable() throws Exception {
        mockMvc.perform(get("/actuator/env"))
            .andExpect(status().is(anyOf(is(401), is(404))));
    }
}
