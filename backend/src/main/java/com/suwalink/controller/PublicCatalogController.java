package com.suwalink.controller;

import com.suwalink.dto.response.ApiResponse;
import com.suwalink.service.CategoryService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only catalogue data open to anonymous visitors. */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class PublicCatalogController {

    public record CategoryOption(UUID id, String name) {}

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryOption>>> listCategories() {
        List<CategoryOption> options = categoryService.listActive().stream()
            .map(category -> new CategoryOption(category.getId(), category.getName()))
            .toList();
        return ResponseEntity.ok(ApiResponse.success("Categories", options));
    }
}
