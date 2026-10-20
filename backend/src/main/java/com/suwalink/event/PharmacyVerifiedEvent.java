package com.suwalink.event;

import java.util.UUID;

public class PharmacyVerifiedEvent {

    private final UUID pharmacyUserId;
    private final String pharmacyName;

    public PharmacyVerifiedEvent(Object source, UUID pharmacyUserId, String pharmacyName) {
        this.pharmacyUserId = pharmacyUserId;
        this.pharmacyName = pharmacyName;
    }

    public UUID getPharmacyUserId() {
        return pharmacyUserId;
    }

    public String getPharmacyName() {
        return pharmacyName;
    }
}
