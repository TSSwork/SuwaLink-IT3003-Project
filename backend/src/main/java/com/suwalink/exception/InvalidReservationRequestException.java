package com.suwalink.exception;

/** The reservation request itself is malformed (e.g. duplicate lines, mixed pharmacies). */
public class InvalidReservationRequestException extends RuntimeException {

    public InvalidReservationRequestException(String message) {
        super(message);
    }
}
