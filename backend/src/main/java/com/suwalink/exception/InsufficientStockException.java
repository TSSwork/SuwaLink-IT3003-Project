package com.suwalink.exception;

public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(int available, int requested) {
        super("Only " + available + " units in stock, cannot reserve " + requested);
    }
}
