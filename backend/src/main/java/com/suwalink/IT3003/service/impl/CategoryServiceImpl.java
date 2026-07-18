package com.suwalink.IT3003.service.impl;

import com.suwalink.IT3003.dto.request.CategoryRequest;
import com.suwalink.IT3003.dto.response.CategoryResponse;
import com.suwalink.IT3003.entity.Category;
import com.suwalink.IT3003.exception.ResourceNotFoundException;
import com.suwalink.IT3003.repository.CategoryRepository;
import com.suwalink.IT3003.service.CategoryService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        Category category = Category.builder()
            .name(request.getName())
            .description(request.getDescription())
            .parentCategory(resolveParent(request.getParentCategoryId()))
            .build();

        return toResponse(categoryRepository.save(category));
    }

    @Override
    public List<CategoryResponse> list() {
        return categoryRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    public CategoryResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Override
    @Transactional
    public CategoryResponse update(UUID id, CategoryRequest request) {
        Category category = findOrThrow(id);
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setParentCategory(resolveParent(request.getParentCategoryId()));
        return toResponse(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        categoryRepository.delete(findOrThrow(id));
    }

    private Category resolveParent(UUID parentId) {
        if (parentId == null) {
            return null;
        }
        return categoryRepository.findById(parentId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + parentId));
    }

    private Category findOrThrow(UUID id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
    }

    private CategoryResponse toResponse(Category category) {
        Category parent = category.getParentCategory();
        return CategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .description(category.getDescription())
            .parentCategoryId(parent != null ? parent.getId() : null)
            .parentCategoryName(parent != null ? parent.getName() : null)
            .active(category.isActive())
            .build();
    }
}
