package com.suwalink.IT3003.dto.response;



import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class BookmarkResponse {

    private final UUID id;
    private final LocalDateTime createdAt;
    private final InventoryResponse inventory;
}

