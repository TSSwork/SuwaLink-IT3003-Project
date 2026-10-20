package com.suwalink.entity;

/**
 * Lifecycle of a patient's prescription request. Not to be confused with {@link PrescriptionStatus},
 * which classifies a medicine's legal category (OTC/prescription/controlled) on {@link MedicineMaster}.
 */
public enum PrescriptionRequestStatus {
    /** Just submitted by the patient, awaiting pharmacy responses. */
    PENDING,
    /** At least one pharmacy has tagged inventory against this request (future module). */
    RESPONDED,
    /** Patient has reserved/collected medicines and considers this request done (future module). */
    CLOSED,
    /** Passed its expiry date while still open; pharmacies no longer see it. */
    EXPIRED
}
