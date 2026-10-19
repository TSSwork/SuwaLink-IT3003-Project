package com.suwalink.event;

import com.suwalink.entity.CancelledBy;
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
