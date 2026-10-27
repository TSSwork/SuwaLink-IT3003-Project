package com.suwalink.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.suwalink.entity.Category;
import com.suwalink.repository.CategoryRepository;
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
class PublicCategoriesTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private CategoryRepository categoryRepository;

    @Test
    void anonymousGetsActiveCategoriesSortedByNameWithoutInactiveOnes() throws Exception {
        categoryRepository.save(Category.builder().name("Zz Vitamins").build());
        categoryRepository.save(Category.builder().name("Aa Antibiotics").build());
        categoryRepository.save(Category.builder().name("Mm Retired").active(false).build());

        mockMvc.perform(get("/api/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[?(@.name == 'Mm Retired')]").isEmpty())
            .andExpect(jsonPath("$.data[?(@.name == 'Aa Antibiotics')].id").isNotEmpty())
            .andExpect(jsonPath("$.data[0].description").doesNotExist())
            .andExpect(jsonPath("$.data[-1:].name").value("Zz Vitamins"));
    }
}
