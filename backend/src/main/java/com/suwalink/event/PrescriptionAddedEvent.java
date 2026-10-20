package com.suwalink.event;

import java.util.List;
import java.util.UUID;

/** A prescription request was sent: the customer gets a confirmation, each targeted pharmacy a notice. */
public class PrescriptionAddedEvent {

    private final UUID requestId;
    private final UUID customerUserId;
    private final List<UUID> pharmacyUserIds;

    public PrescriptionAddedEvent(Object source, UUID requestId, UUID customerUserId, List<UUID> pharmacyUserIds) {
        this.requestId = requestId;
        this.customerUserId = customerUserId;
        this.pharmacyUserIds = pharmacyUserIds;
    }

    public UUID getRequestId() {
        return requestId;
    }

    public UUID getCustomerUserId() {
        return customerUserId;
    }

    public List<UUID> getPharmacyUserIds() {
        return pharmacyUserIds;
    }
}
