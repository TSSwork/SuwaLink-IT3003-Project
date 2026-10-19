package com.suwalink.exception;

public class PrescriptionRequestClosedException extends RuntimeException {

    public PrescriptionRequestClosedException() {
        super("This prescription request is closed and no longer accepting responses");
    }
}
