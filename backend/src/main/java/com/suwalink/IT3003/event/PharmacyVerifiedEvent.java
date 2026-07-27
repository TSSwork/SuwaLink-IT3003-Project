package com.suwalink.IT3003.event;

import org.springframework.context.ApplicationEvent;

public class PharmacyVerifiedEvent extends ApplicationEvent {
    
    private final Long pharmacyUserId; 

    public PharmacyVerifiedEvent(Object source, Long pharmacyUserId) {
        super(source);
        this.pharmacyUserId = pharmacyUserId;
    }

    public Long getPharmacyUserId() {
        return pharmacyUserId;
    }
}
