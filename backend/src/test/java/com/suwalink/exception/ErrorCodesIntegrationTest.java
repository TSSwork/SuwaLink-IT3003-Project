package com.suwalink.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.support.TestPayloads;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Spring MVC's own request errors come back in the standard error shape with a stable code. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ErrorCodesIntegrationTest {

    @Autowired MockMvc mockMvc;
    private String token;

    @BeforeEach
    void customer() throws Exception {
        String email = "error.codes@example.com";
        mockMvc.perform(post("/api/auth/register/customer").contentType(MediaType.APPLICATION_JSON)
                .content(TestPayloads.customerRegistration(email)))
            .andExpect(status().isCreated());
        String body = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"SecurePass123\"}".formatted(email)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        token = "Bearer " + JsonPath.read(body, "$.data.token");
    }

    @Test
    void unsupportedMethodIs405() throws Exception {
        mockMvc.perform(delete("/api/auth/login"))
            .andExpect(status().isMethodNotAllowed())
            .andExpect(header().exists("Allow"))
            .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    void unsupportedContentTypeIs415() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.TEXT_PLAIN).content("hello"))
            .andExpect(status().isUnsupportedMediaType())
            .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
    }

    @Test
    void missingRequestParameterIs400() throws Exception {
        mockMvc.perform(multipart("/api/images")
                .file(new MockMultipartFile("file", "a.png", MediaType.IMAGE_PNG_VALUE, new byte[] {1}))
                .header("Authorization", token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("MISSING_PARAMETER"));
    }

    @Test
    void missingMultipartPartIs400() throws Exception {
        mockMvc.perform(multipart("/api/images").param("imageType", "PROFILE").header("Authorization", token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("MISSING_PARAMETER"));
    }

    @Test
    void unknownEndpointIs404() throws Exception {
        mockMvc.perform(get("/api/no-such-endpoint").header("Authorization", token))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
