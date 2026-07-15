package com.suwalink.IT3003.exception;

public class PharmacyNotVerifiedException extends RuntimeException {

    public PharmacyNotVerifiedException() {
        super("Your pharmacy account is awaiting verification");
    }
}
