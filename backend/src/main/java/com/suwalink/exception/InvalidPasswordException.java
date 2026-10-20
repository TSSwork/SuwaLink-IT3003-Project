package com.suwalink.exception;

/** The password given to confirm a sensitive action is wrong. */
public class InvalidPasswordException extends RuntimeException {

    public InvalidPasswordException(String message) {
        super(message);
    }
}
