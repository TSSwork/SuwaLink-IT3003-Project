package com.suwalink.IT3003.exception;

public class ReservationAccessDeniedException extends RuntimeException {

    public ReservationAccessDeniedException() {
        super("This reservation does not belong to you");
    }
}
