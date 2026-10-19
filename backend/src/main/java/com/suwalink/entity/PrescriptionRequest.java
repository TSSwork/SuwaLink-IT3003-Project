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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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
 * Matching a request against pharmacy inventory (tagging) and notifying pharmacies are
 * separate, not-yet-built modules - see README/READ_PRESCRIPTION_MODULE.md.
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
}
