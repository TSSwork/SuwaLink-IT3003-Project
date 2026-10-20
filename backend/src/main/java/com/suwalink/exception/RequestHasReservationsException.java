package com.suwalink.exception;

/** A prescription request referenced by reservations can't be deleted, only closed. */
public class RequestHasReservationsException extends RuntimeException {

    public RequestHasReservationsException(String message) {
        super(message);
    }
}
