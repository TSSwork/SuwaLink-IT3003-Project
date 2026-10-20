package com.suwalink.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.User;
import com.suwalink.event.PrescriptionRequestExpiredEvent;
import com.suwalink.repository.PrescriptionRequestRepository;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;

@ExtendWith(MockitoExtension.class)
class PrescriptionRequestServiceImplTest {

    @Mock private PrescriptionRequestRepository prescriptionRequestRepository;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private PrescriptionRequestServiceImpl service;

    @Test
    void expireOverdueKeepsGoingWhenOneRequestFails() {
        LocalDateTime now = LocalDateTime.now();
        PrescriptionRequest broken = request(now.minusMinutes(5));
        PrescriptionRequest fine = request(now.minusMinutes(1));

        when(prescriptionRequestRepository.findByStatusInAndExpiresAtBefore(
                EnumSet.of(PrescriptionRequestStatus.PENDING, PrescriptionRequestStatus.RESPONDED), now))
                .thenReturn(List.of(broken, fine));
        when(prescriptionRequestRepository.findById(broken.getId())).thenThrow(new IllegalStateException("boom"));
        when(prescriptionRequestRepository.findById(fine.getId())).thenReturn(Optional.of(fine));

        assertThat(service.expireOverdue(now)).isEqualTo(1);

        assertThat(fine.getStatus()).isEqualTo(PrescriptionRequestStatus.EXPIRED);
        assertThat(broken.getStatus()).isEqualTo(PrescriptionRequestStatus.PENDING);

        ArgumentCaptor<PrescriptionRequestExpiredEvent> event = ArgumentCaptor.forClass(PrescriptionRequestExpiredEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().getRequestId()).isEqualTo(fine.getId());
        assertThat(event.getValue().getCustomerUserId()).isEqualTo(fine.getPatient().getId());
    }

    private static PrescriptionRequest request(LocalDateTime expiresAt) {
        return PrescriptionRequest.builder()
                .id(UUID.randomUUID())
                .patient(User.builder().id(UUID.randomUUID()).build())
                .status(PrescriptionRequestStatus.PENDING)
                .expiresAt(expiresAt)
                .build();
    }
}
