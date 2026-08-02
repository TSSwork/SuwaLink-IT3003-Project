package com.suwalink.IT3003.exception;

public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(int available, int requested) {
        super("Only " + available + " units in stock, cannot reserve " + requested);
    }
}
