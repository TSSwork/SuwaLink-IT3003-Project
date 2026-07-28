package com.suwalink.IT3003.event;

import java.util.List;
import java.util.UUID;

public class PrescriptionAddedEvent {

    private final List<UUID> pharmacyUserIds;

    public PrescriptionAddedEvent(Object source, List<UUID> pharmacyUserIds) {
        this.pharmacyUserIds = pharmacyUserIds;
    }

    public List<UUID> getPharmacyUserIds() {
        return pharmacyUserIds;
    }
}
