package com.suwalink.event;

import java.util.UUID;

/** The pharmacy handed over the order; the customer is told it was collected. */
public class ReservationCompletedEvent {

    private final UUID reservationId;

    public ReservationCompletedEvent(Object source, UUID reservationId) {
        this.reservationId = reservationId;
    }

    public UUID getReservationId() {
        return reservationId;
    }
}
