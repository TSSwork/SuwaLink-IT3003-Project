package com.suwalink.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A customer holding stock at one pharmacy: one or more {@link ReservationItem lines}, collected
 * with a pickup code before {@code expiresAt}. Lines may come from a search result or from a
 * pharmacy's prescription quote. Auto-confirmed on creation; the pharmacy or customer can cancel
 * later, and the pharmacy marks it COMPLETED once picked up.
 */
@Entity
@Table(name = "reservations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservation extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pharmacy_id", nullable = false)
    private Pharmacy pharmacy;

    /** Set when any line was reserved from a prescription quote. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_request_id")
    private PrescriptionRequest prescriptionRequest;

    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("medicineName ASC")
    @Builder.Default
    private List<ReservationItem> items = new ArrayList<>();

    @Column(name = "pickup_code", nullable = false, unique = true, length = 10)
    private String pickupCode;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.CONFIRMED;

    @Column(name = "cancel_reason")
    private String cancelReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancelled_by")
    private CancelledBy cancelledBy;

    /** Copied from the pharmacy at creation, so demo data can be told apart. */
    @Column(name = "is_demo", nullable = false)
    @Builder.Default
    private boolean demo = false;

    public void addItem(ReservationItem item) {
        item.setReservation(this);
        items.add(item);
    }
}
