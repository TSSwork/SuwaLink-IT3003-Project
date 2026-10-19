package com.suwalink.event;

import java.util.UUID;

public class PharmacyRespondedEvent {

    private final UUID patientUserId; 
    private final String pharmacyName; 

    public PharmacyRespondedEvent(Object source, UUID patientUserId, String pharmacyName) {
        this.patientUserId = patientUserId;
        this.pharmacyName = pharmacyName;
    }

    public UUID getPatientUserId() {
        return patientUserId;
    }

    public String getPharmacyName() {
        return pharmacyName;
    }
}
