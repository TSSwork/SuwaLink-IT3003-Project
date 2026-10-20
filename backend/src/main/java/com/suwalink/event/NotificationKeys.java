package com.suwalink.event;

/**
 * Message keys of every notification. Each key has {@code <key>.title} and {@code <key>.body} in the
 * en/si/ta bundles (enforced by a test that reads these constants).
 */
public final class NotificationKeys {

    public static final String PHARMACY_REGISTERED = "notify.pharmacy.registered";
    public static final String PHARMACY_APPROVED = "notify.pharmacy.approved";
    public static final String PHARMACY_REJECTED = "notify.pharmacy.rejected";

    public static final String PRESCRIPTION_SENT = "notify.prescription.sent";
    public static final String PRESCRIPTION_NEW = "notify.prescription.new";
    public static final String PRESCRIPTION_RESPONDED = "notify.prescription.responded";
    public static final String PRESCRIPTION_RESPONSE_UPDATED = "notify.prescription.response-updated";
    public static final String PRESCRIPTION_EXPIRED = "notify.prescription.expired";

    public static final String RESERVATION_CONFIRMED = "notify.reservation.confirmed";
    public static final String RESERVATION_NEW = "notify.reservation.new";
    public static final String RESERVATION_CANCELLED_BY_CUSTOMER = "notify.reservation.cancelled-by-customer";
    public static final String RESERVATION_CANCELLED_BY_PHARMACY = "notify.reservation.cancelled-by-pharmacy";
    public static final String RESERVATION_COMPLETED = "notify.reservation.completed";
    public static final String RESERVATION_EXPIRED = "notify.reservation.expired";

    /** Published by the medicine-suggestion review (Phase 1C Task 6). */
    public static final String MEDICINE_APPROVED = "notify.medicine.approved";
    public static final String MEDICINE_REJECTED = "notify.medicine.rejected";

    private NotificationKeys() {
    }
}
