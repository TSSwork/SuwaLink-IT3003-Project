package com.suwalink.event;

import org.springframework.context.ApplicationEventPublisher;
import java.util.UUID;

public class PharmacyVerifiedEvent {
    
    private final UUID pharmacyUserId; 

    public PharmacyVerifiedEvent(Object source, UUID pharmacyUserId) {
        this.pharmacyUserId = pharmacyUserId;
    }

    public UUID getPharmacyUserId() {
        return pharmacyUserId;
    }
}
