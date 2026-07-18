package com.suwalink.IT3003.entity;

public enum PrescriptionStatus {
    OTC,             // Over The Counter (No prescription needed)
    PRESCRIPTION,    // Needs a doctor's note
    CONTROLLED,      // Highly regulated (Dangerous/Addictive)
    SCHEDULE_III     // Specific legal category in Sri Lanka
}
