package com.suwalink.IT3003.event;

import com.suwalink.IT3003.entity.CancelledBy;
import java.util.UUID;

public class ReservationCancelledEvent {

    private final UUID reservationId;
    private final CancelledBy cancelledBy;

    public ReservationCancelledEvent(Object source, UUID reservationId, CancelledBy cancelledBy) {
        this.reservationId = reservationId;
        this.cancelledBy = cancelledBy;
    }

    public UUID getReservationId() {
        return reservationId;
    }

    public CancelledBy getCancelledBy() {
        return cancelledBy;
    }
}
