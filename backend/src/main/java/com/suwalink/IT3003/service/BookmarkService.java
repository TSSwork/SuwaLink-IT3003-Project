package com.suwalink.IT3003.service;

import com.suwalink.IT3003.dto.response.BookmarkResponse;
import java.util.List;
import java.util.UUID;

public interface BookmarkService {

    BookmarkResponse addBookmark(UUID inventoryId);

    void removeBookmark(UUID inventoryId);

    List<BookmarkResponse> listMyBookmarks();
}

