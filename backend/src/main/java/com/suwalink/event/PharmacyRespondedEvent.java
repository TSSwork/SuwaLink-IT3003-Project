package com.suwalink.event;

import java.util.UUID;

public class PharmacyRespondedEvent {

    private final UUID requestId;
    private final UUID patientUserId;
    private final String pharmacyName;
    private final boolean updated;

    public PharmacyRespondedEvent(Object source, UUID requestId, UUID patientUserId, String pharmacyName, boolean updated) {
        this.requestId = requestId;
        this.patientUserId = patientUserId;
        this.pharmacyName = pharmacyName;
        this.updated = updated;
    }

    public UUID getRequestId() {
        return requestId;
    }

    public UUID getPatientUserId() {
        return patientUserId;
    }

    public String getPharmacyName() {
        return pharmacyName;
    }

    public boolean isUpdated() {
        return updated;
    }
}
