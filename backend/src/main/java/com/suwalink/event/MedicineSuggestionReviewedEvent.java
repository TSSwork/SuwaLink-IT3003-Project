package com.suwalink.event;

import java.util.UUID;

public class MedicineSuggestionReviewedEvent {

    private final UUID pharmacyUserId;
    private final String medicineName;
    private final boolean approved;

    public MedicineSuggestionReviewedEvent(Object source, UUID pharmacyUserId, String medicineName, boolean approved) {
        this.pharmacyUserId = pharmacyUserId;
        this.medicineName = medicineName;
        this.approved = approved;
    }

    public UUID getPharmacyUserId() {
        return pharmacyUserId;
    }

    public String getMedicineName() {
        return medicineName;
    }

    public boolean isApproved() {
        return approved;
    }
}
