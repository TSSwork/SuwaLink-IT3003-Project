package com.suwalink.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.suwalink.entity.Inventory;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationItem;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.security.CurrentUserProvider;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Stock is given back only through the row-locked inventory returned by
 * {@link InventoryRepository#lockAllById}, never through the reservation's lazy associations, so a
 * release can't interleave with a concurrent create on the same rows.
 */
@ExtendWith(MockitoExtension.class)
class ReservationServiceImplTest {

    @Mock private ReservationRepository reservationRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private CurrentUserProvider currentUserProvider;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private PlatformTransactionManager transactionManager;
    @InjectMocks private ReservationServiceImpl service;

    private final User patient = User.builder().termsAcceptedAt(java.time.LocalDateTime.now()).id(UUID.randomUUID()).name("Pat").role(Role.CUSTOMER).build();
    private final Pharmacy pharmacy = Pharmacy.builder().id(UUID.randomUUID()).name("Pharm").build();

    @Test
    void cancelRestoresStockOnLockedRows() {
        Inventory first = inventory(UUID.randomUUID(), 0);
        Inventory second = inventory(UUID.randomUUID(), 0);
        Reservation reservation = reservation(LocalDateTime.now().plusHours(1), line(first, 2), line(second, 3));
        Inventory lockedFirst = inventory(first.getId(), 10);
        Inventory lockedSecond = inventory(second.getId(), 20);

        when(reservationRepository.findById(reservation.getId())).thenReturn(java.util.Optional.of(reservation));
        when(currentUserProvider.getCurrentUser()).thenReturn(patient);
        when(inventoryRepository.lockAllById(anyCollection())).thenReturn(List.of(lockedFirst, lockedSecond));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.cancel(reservation.getId(), null);

        verify(inventoryRepository).lockAllById(Set.of(first.getId(), second.getId()));
        assertThat(lockedFirst.getStockQuantity()).isEqualTo(12);
        assertThat(lockedSecond.getStockQuantity()).isEqualTo(23);
        assertThat(first.getStockQuantity()).isZero();
        assertThat(second.getStockQuantity()).isZero();
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
    }

    @Test
    void expireOverdueRestoresStockOnLockedRows() {
        LocalDateTime now = LocalDateTime.now();
        Inventory shared = inventory(UUID.randomUUID(), 0);
        Inventory other = inventory(UUID.randomUUID(), 0);
        Reservation a = reservation(now.minusMinutes(5), line(shared, 1), line(other, 4));
        Reservation b = reservation(now.minusMinutes(1), line(shared, 2));
        Inventory lockedShared = inventory(shared.getId(), 5);
        Inventory lockedOther = inventory(other.getId(), 5);

        when(reservationRepository.findByStatusAndExpiresAtBefore(ReservationStatus.CONFIRMED, now))
                .thenReturn(List.of(a, b));
        when(reservationRepository.findById(a.getId())).thenReturn(java.util.Optional.of(a));
        when(reservationRepository.findById(b.getId())).thenReturn(java.util.Optional.of(b));
        when(inventoryRepository.lockAllById(anyCollection())).thenAnswer(invocation -> {
            java.util.Collection<UUID> ids = invocation.getArgument(0);
            return List.of(lockedShared, lockedOther).stream().filter(i -> ids.contains(i.getId())).toList();
        });

        assertThat(service.expireOverdue(now)).isEqualTo(2);

        verify(inventoryRepository).lockAllById(Set.of(shared.getId(), other.getId()));
        verify(inventoryRepository).lockAllById(Set.of(shared.getId()));
        assertThat(lockedShared.getStockQuantity()).isEqualTo(8);
        assertThat(lockedOther.getStockQuantity()).isEqualTo(9);
        assertThat(shared.getStockQuantity()).isZero();
        assertThat(a.getStatus()).isEqualTo(ReservationStatus.EXPIRED);
        assertThat(b.getStatus()).isEqualTo(ReservationStatus.EXPIRED);
    }

    @Test
    void expireOverdueKeepsGoingWhenOneReservationFails() {
        LocalDateTime now = LocalDateTime.now();
        Inventory stocked = inventory(UUID.randomUUID(), 0);
        Reservation broken = reservation(now.minusMinutes(5), line(stocked, 1));
        Reservation fine = reservation(now.minusMinutes(1), line(stocked, 2));
        Inventory locked = inventory(stocked.getId(), 5);

        when(reservationRepository.findByStatusAndExpiresAtBefore(ReservationStatus.CONFIRMED, now))
                .thenReturn(List.of(broken, fine));
        when(reservationRepository.findById(broken.getId())).thenThrow(new IllegalStateException("boom"));
        when(reservationRepository.findById(fine.getId())).thenReturn(java.util.Optional.of(fine));
        when(inventoryRepository.lockAllById(anyCollection())).thenReturn(List.of(locked));

        assertThat(service.expireOverdue(now)).isEqualTo(1);

        assertThat(fine.getStatus()).isEqualTo(ReservationStatus.EXPIRED);
        assertThat(broken.getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(locked.getStockQuantity()).isEqualTo(7);
    }

    private Reservation reservation(LocalDateTime expiresAt, ReservationItem... items) {
        Reservation reservation = Reservation.builder()
                .id(UUID.randomUUID())
                .patient(patient)
                .pharmacy(pharmacy)
                .pickupCode("ABCDEFGHJK")
                .expiresAt(expiresAt)
                .status(ReservationStatus.CONFIRMED)
                .build();
        for (ReservationItem item : items) {
            reservation.addItem(item);
        }
        return reservation;
    }

    private static ReservationItem line(Inventory inventory, int quantity) {
        return ReservationItem.builder()
                .inventoryItem(inventory)
                .quantity(quantity)
                .unitPrice(BigDecimal.ONE)
                .medicineName("Panadol 500mg")
                .build();
    }

    private static Inventory inventory(UUID id, int stock) {
        return Inventory.builder().id(id).stockQuantity(stock).build();
    }
}
