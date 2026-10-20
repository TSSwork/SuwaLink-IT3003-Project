package com.suwalink.event;

import java.util.UUID;

public class MedicineSuggestionReviewedEvent {

    private final UUID pharmacyUserId;
    private final String medicineName;
    private final boolean approved;
    /** The admin's reason; set when rejected, null when approved. */
    private final String reason;

    public MedicineSuggestionReviewedEvent(Object source, UUID pharmacyUserId, String medicineName, boolean approved,
            String reason) {
        this.pharmacyUserId = pharmacyUserId;
        this.medicineName = medicineName;
        this.approved = approved;
        this.reason = reason;
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

    public String getReason() {
        return reason;
    }
}
