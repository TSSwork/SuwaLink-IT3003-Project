package com.suwalink.IT3003.event;

import java.util.UUID;

public class PharmacyRejectedEvent {

    private final UUID pharmacyUserId;

    public PharmacyRejectedEvent(Object source, UUID pharmacyUserId) {
        this.pharmacyUserId = pharmacyUserId;
    }

    public UUID getPharmacyUserId() {
        return pharmacyUserId;
    }
}
