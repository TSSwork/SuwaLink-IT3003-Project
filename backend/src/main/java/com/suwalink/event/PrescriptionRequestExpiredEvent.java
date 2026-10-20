package com.suwalink.event;

import java.util.UUID;

/** An open prescription request passed its expiry; the customer is told. */
public class PrescriptionRequestExpiredEvent {

    private final UUID requestId;
    private final UUID customerUserId;

    public PrescriptionRequestExpiredEvent(Object source, UUID requestId, UUID customerUserId) {
        this.requestId = requestId;
        this.customerUserId = customerUserId;
    }

    public UUID getRequestId() {
        return requestId;
    }

    public UUID getCustomerUserId() {
        return customerUserId;
    }
}
