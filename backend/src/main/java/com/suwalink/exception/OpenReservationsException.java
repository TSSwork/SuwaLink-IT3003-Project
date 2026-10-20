package com.suwalink.exception;

/** A pharmacy owner can't delete their account while CONFIRMED reservations remain. */
public class OpenReservationsException extends RuntimeException {

    public OpenReservationsException(String message) {
        super(message);
    }
}
