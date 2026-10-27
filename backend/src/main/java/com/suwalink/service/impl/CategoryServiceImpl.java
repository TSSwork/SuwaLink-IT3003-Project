package com.suwalink.service.impl;

import com.suwalink.dto.request.CategoryRequest;
import com.suwalink.dto.response.CategoryResponse;
import com.suwalink.entity.Category;
import com.suwalink.exception.DuplicateResourceException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.service.CategoryService;
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
        if (categoryRepository.existsByName(request.getName())) {
            throw new DuplicateResourceException("A category named '" + request.getName() + "' already exists");
        }

        Category category = Category.builder()
            .name(request.getName())
            .description(request.getDescription())
            .parentCategory(resolveParent(request.getParentCategoryId()))
            .build();

        return toResponse(categoryRepository.save(category));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categoryRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> listActive() {
        return categoryRepository.findByActiveTrueOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Override
    @Transactional
    public CategoryResponse update(UUID id, CategoryRequest request) {
        Category category = findOrThrow(id);
        if (!category.getName().equals(request.getName()) && categoryRepository.existsByName(request.getName())) {
            throw new DuplicateResourceException("A category named '" + request.getName() + "' already exists");
        }
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
