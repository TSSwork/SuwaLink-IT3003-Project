package com.suwalink.repository;

/** Shared JPQL fragments. Keep the public-visibility rule in one place. */
final class VisibilityJpql {

    private VisibilityJpql() {
    }

    /**
     * Publicly visible pharmacy (alias {@code p}): verified, owner neither suspended nor deleted, and
     * not demo unless demo mode is on. Requires an {@code :includeDemo} parameter. Mirrors
     * {@code PharmacyVisibilityServiceImpl.isPubliclyVisible}.
     */
    public static final String VISIBLE_PHARMACY_P =
            "p.status = com.suwalink.entity.PharmacyStatus.VERIFIED AND (p.demo = false OR :includeDemo = true)"
            + " AND p.user.suspended = false AND p.user.deletedAt IS NULL";

    /** Only catalog-approved medicines (alias {@code m}) are offered. */
    public static final String APPROVED_MEDICINE_M = "m.status = com.suwalink.entity.MedicineStatus.APPROVED";
}
