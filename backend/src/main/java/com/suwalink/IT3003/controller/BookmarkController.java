package com.suwalink.IT3003.controller;

import com.suwalink.IT3003.dto.response.ApiResponse;
import com.suwalink.IT3003.dto.response.BookmarkResponse;
import com.suwalink.IT3003.service.BookmarkService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @PostMapping("/{inventoryId}")
    public ResponseEntity<ApiResponse<BookmarkResponse>>
    addBookmark(@PathVariable UUID inventoryId) {
        BookmarkResponse response = bookmarkService.addBookmark(inventoryId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Bookmark added", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BookmarkResponse>>>
    listMyBookmarks() {
        return ResponseEntity.ok(ApiResponse.success("Bookmarks", bookmarkService.listMyBookmarks()));
    }

    @DeleteMapping("/{inventoryId}")
    public ResponseEntity<ApiResponse<Void>>
    removeBookmark(@PathVariable UUID inventoryId) {
        bookmarkService.removeBookmark(inventoryId);
        return ResponseEntity.ok(ApiResponse.success("Bookmark removed"));
    }
}
