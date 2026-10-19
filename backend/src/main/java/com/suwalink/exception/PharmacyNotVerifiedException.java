package com.suwalink.exception;

public class PharmacyNotVerifiedException extends RuntimeException {

    public PharmacyNotVerifiedException() {
        super("Your pharmacy account is awaiting verification");
    }

    public PharmacyNotVerifiedException(String message) {
        super(message);
    }
}
