package com.suwalink.service;

import com.suwalink.dto.response.BookmarkResponse;
import java.util.List;
import java.util.UUID;

public interface BookmarkService {

    BookmarkResponse addBookmark(UUID inventoryId);

    void removeBookmark(UUID inventoryId);

    List<BookmarkResponse> listMyBookmarks();
}

