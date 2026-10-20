package com.suwalink.entity;

/** Catalog state of a medicine: only APPROVED ones can be stocked or appear in search. */
public enum MedicineStatus {
    APPROVED, PENDING, REJECTED
}
