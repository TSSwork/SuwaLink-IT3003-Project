package com.suwalink.dto.response;

import com.suwalink.entity.District;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.TargetScope;
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
    private final UUID imageId;
    /** Authenticated image endpoint; the raw file is never served publicly. */
    private final String imageUrl;
    private final TargetScope targetScope;
    private final District district;
    private final int targetCount;
    /** Number of pharmacy responses; filled only on the patient's own list ({@code GET /api/prescriptions/me}). */
    private final Integer responseCount;
    private final LocalDateTime expiresAt;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
}
