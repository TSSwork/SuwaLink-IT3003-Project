package com.suwalink.exception;

public class InventoryAccessDeniedException extends RuntimeException {

    public InventoryAccessDeniedException() {
        super("This inventory item does not belong to your pharmacy");
    }
}
