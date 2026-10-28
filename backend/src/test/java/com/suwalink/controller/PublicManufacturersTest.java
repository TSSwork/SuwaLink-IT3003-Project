package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.suwalink.entity.Manufacturer;
import com.suwalink.repository.ManufacturerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PublicManufacturersTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ManufacturerRepository manufacturerRepository;

    @Test
    void anonymousGetsActiveManufacturersSortedByNameAsIdAndNameOnly() throws Exception {
        manufacturerRepository.save(Manufacturer.builder().name("Zz Pharma").country("Sri Lanka")
            .licenseNumber("LIC-Z").contactEmail("z@example.com").build());
        manufacturerRepository.save(Manufacturer.builder().name("Aa Labs").country("India").build());
        manufacturerRepository.save(Manufacturer.builder().name("Mm Closed").country("UK").isActive(false).build());

        mockMvc.perform(get("/api/manufacturers"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[?(@.name == 'Mm Closed')]").isEmpty())
            .andExpect(jsonPath("$.data[?(@.name == 'Aa Labs')].id").isNotEmpty())
            .andExpect(jsonPath("$.data[0].licenseNumber").doesNotExist())
            .andExpect(jsonPath("$.data[0].contactEmail").doesNotExist())
            .andExpect(jsonPath("$.data[-1:].name").value("Zz Pharma"));
    }
}
