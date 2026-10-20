package com.suwalink.service.impl;

import com.suwalink.service.PrescriptionRequestService;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodic jobs that move overdue records to {@code EXPIRED}. */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExpiryJobs {

    private final PrescriptionRequestService prescriptionRequestService;

    @Scheduled(cron = "${app.jobs.expiry-cron:0 */15 * * * *}")
    void expirePrescriptionRequests() {
        int expired = prescriptionRequestService.expireOverdue(LocalDateTime.now());
        if (expired > 0) {
            log.info("Expired {} overdue prescription request(s)", expired);
        }
    }
}
