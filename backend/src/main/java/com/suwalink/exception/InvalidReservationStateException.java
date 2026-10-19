package com.suwalink.exception;

public class InvalidReservationStateException extends RuntimeException {

    public InvalidReservationStateException(String message) {
        super(message);
    }
}
