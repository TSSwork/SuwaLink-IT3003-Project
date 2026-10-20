package com.suwalink.repository;

/** Shared JPQL fragments. Keep the public-visibility rule in one place. */
final class VisibilityJpql {

    private VisibilityJpql() {
    }

    /** Publicly visible pharmacy (alias {@code p}); requires an {@code :includeDemo} parameter. */
    public static final String VISIBLE_PHARMACY_P =
            "p.status = com.suwalink.entity.PharmacyStatus.VERIFIED AND (p.demo = false OR :includeDemo = true)";

    /** Only catalog-approved medicines (alias {@code m}) are offered. */
    public static final String APPROVED_MEDICINE_M = "m.status = com.suwalink.entity.MedicineStatus.APPROVED";
}
