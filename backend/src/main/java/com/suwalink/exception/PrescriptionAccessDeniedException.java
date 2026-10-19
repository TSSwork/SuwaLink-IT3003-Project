package com.suwalink.exception;

public class PrescriptionAccessDeniedException extends RuntimeException {

    public PrescriptionAccessDeniedException() {
        super("You do not have access to this prescription request");
    }
}
