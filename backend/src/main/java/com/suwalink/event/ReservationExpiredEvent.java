package com.suwalink.event;

import java.util.UUID;

/** The hold ran out before pickup and the stock was released; both sides are told. */
public class ReservationExpiredEvent {

    private final UUID reservationId;

    public ReservationExpiredEvent(Object source, UUID reservationId) {
        this.reservationId = reservationId;
    }

    public UUID getReservationId() {
        return reservationId;
    }
}
