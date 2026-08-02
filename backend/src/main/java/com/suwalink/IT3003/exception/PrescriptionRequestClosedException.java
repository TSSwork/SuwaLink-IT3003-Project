package com.suwalink.IT3003.exception;

public class PrescriptionRequestClosedException extends RuntimeException {

    public PrescriptionRequestClosedException() {
        super("This prescription request is closed and no longer accepting responses");
    }
}
