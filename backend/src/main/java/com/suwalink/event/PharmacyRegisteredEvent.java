package com.suwalink.event;

import java.util.UUID;

/** A pharmacy signed up and awaits review; every admin is told. */
public class PharmacyRegisteredEvent {

    private final UUID pharmacyId;
    private final String pharmacyName;

    public PharmacyRegisteredEvent(Object source, UUID pharmacyId, String pharmacyName) {
        this.pharmacyId = pharmacyId;
        this.pharmacyName = pharmacyName;
    }

    public UUID getPharmacyId() {
        return pharmacyId;
    }

    public String getPharmacyName() {
        return pharmacyName;
    }
}
