package com.suwalink.service;

import com.suwalink.dto.request.CategoryRequest;
import com.suwalink.dto.response.CategoryResponse;
import java.util.List;
import java.util.UUID;

public interface CategoryService {

    CategoryResponse create(CategoryRequest request);

    List<CategoryResponse> list();

    CategoryResponse get(UUID id);

    CategoryResponse update(UUID id, CategoryRequest request);

    void delete(UUID id);
}
