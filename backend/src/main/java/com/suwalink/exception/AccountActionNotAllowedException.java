package com.suwalink.exception;

/** Thrown when an account action is refused for the target (admins, self, deleted). */
public class AccountActionNotAllowedException extends RuntimeException {

    public AccountActionNotAllowedException(String message) {
        super(message);
    }
}
