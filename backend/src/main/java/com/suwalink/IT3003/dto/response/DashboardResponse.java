package com.suwalink.IT3003.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class DashboardResponse {
    private long totalCustomers;
    private long totalPharmacies;
    private long verifiedPharmacies;
    private long pendingPharmacies;
}
