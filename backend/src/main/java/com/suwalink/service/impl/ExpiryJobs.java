package com.suwalink.service.impl;

import com.suwalink.service.ImageService;
import com.suwalink.service.PrescriptionRequestService;
import com.suwalink.service.ReservationService;
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
    private final ReservationService reservationService;
    private final ImageService imageService;

    @Scheduled(cron = "${app.jobs.expiry-cron:0 */15 * * * *}")
    void expirePrescriptionRequests() {
        int expired = prescriptionRequestService.expireOverdue(LocalDateTime.now());
        if (expired > 0) {
            log.info("Expired {} overdue prescription request(s)", expired);
        }
    }

    @Scheduled(cron = "${app.jobs.expiry-cron:0 */15 * * * *}")
    void expireReservations() {
        int expired = reservationService.expireOverdue(LocalDateTime.now());
        if (expired > 0) {
            log.info("Expired {} overdue reservation(s); their stock was released", expired);
        }
    }

    @Scheduled(cron = "${app.jobs.retention-cron:0 30 3 * * *}")
    void purgeOldPrescriptionImages() {
        int purged = imageService.purgeOldPrescriptionImages(LocalDateTime.now());
        if (purged > 0) {
            log.info("Purged {} prescription image(s) past the retention period", purged);
        }
    }
}
