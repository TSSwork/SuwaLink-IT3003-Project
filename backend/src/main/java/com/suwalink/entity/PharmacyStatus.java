package com.suwalink.entity;

public enum PharmacyStatus {
    PENDING,
    VERIFIED,
    REJECTED,
    /** The owner deleted their account: hidden everywhere, existing records kept. */
    DEACTIVATED
}
