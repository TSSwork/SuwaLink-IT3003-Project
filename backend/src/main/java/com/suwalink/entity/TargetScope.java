package com.suwalink.entity;

/** Which pharmacies receive a prescription request. */
public enum TargetScope {
    /** Publicly visible pharmacies within 10 km of the customer's location. */
    RADIUS_10KM,
    /** Publicly visible pharmacies in the chosen district. */
    DISTRICT,
    /** Every publicly visible pharmacy. */
    ALL
}
