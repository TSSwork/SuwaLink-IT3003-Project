package com.suwalink.IT3003.dto.response;

import com.suwalink.IT3003.entity.PrescriptionRequestStatus;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class PrescriptionRequestResponse {

    private final UUID id;
    private final UUID patientId;
    private final String patientName;
    private final Integer patientAge;
    private final String note;
    private final PrescriptionRequestStatus status;
    private final String imageUrl;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
}
