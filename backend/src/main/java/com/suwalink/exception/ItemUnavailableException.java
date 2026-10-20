package com.suwalink.exception;

/** A reservation line cannot be honoured right now (unavailable, expired or no longer offered). */
public class ItemUnavailableException extends RuntimeException {

    public ItemUnavailableException(String message) {
        super(message);
    }
}
