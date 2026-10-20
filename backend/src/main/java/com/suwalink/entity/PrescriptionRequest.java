package com.suwalink.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GenerationType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A patient's request asking nearby pharmacies who has their prescribed medicines in stock.
 * The uploaded prescription photo is stored via the shared {@link Image} entity/ImageService
 * (local disk, metadata-only in MySQL - see CONTEXT/SPECS.md); this table just references it.
 *
 * The customer picks a {@link TargetScope}; the matching pharmacies are computed once at creation
 * and stored in {@code prescription_request_targets}. Only those pharmacies can see the request.
 */
@Entity
@Table(name = "prescription_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionRequest extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "image_id", nullable = false)
    private Image image;

    @Column(name = "patient_age", nullable = false)
    private Integer patientAge;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PrescriptionRequestStatus status = PrescriptionRequestStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_scope", nullable = false, length = 20)
    private TargetScope targetScope;

    /** Customer location; stored only for {@link TargetScope#RADIUS_10KM}. */
    @Column(name = "latitude", precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 9, scale = 6)
    private BigDecimal longitude;

    /** Chosen district; stored only for {@link TargetScope#DISTRICT}. */
    @Enumerated(EnumType.STRING)
    @Column(name = "district", length = 20)
    private District district;

    /** When the customer agreed to share the prescription with the target pharmacies. */
    @Column(name = "consent_at", nullable = false)
    private LocalDateTime consentAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** The pharmacies this request was sent to, fixed when it is created. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "prescription_request_targets",
        joinColumns = @JoinColumn(name = "request_id"),
        inverseJoinColumns = @JoinColumn(name = "pharmacy_id"))
    @Builder.Default
    private Set<Pharmacy> targetPharmacies = new HashSet<>();
}
