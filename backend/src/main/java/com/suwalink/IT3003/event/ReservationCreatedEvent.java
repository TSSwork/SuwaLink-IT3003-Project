package com.suwalink.IT3003.event;

import java.util.UUID;

public class ReservationCreatedEvent {

    private final UUID reservationId;

    public ReservationCreatedEvent(Object source, UUID reservationId) {
        this.reservationId = reservationId;
    }

    public UUID getReservationId() {
        return reservationId;
    }
}
