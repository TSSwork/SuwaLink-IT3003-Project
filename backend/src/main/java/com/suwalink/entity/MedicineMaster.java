package com.suwalink.entity;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.hibernate.envers.Audited;
import org.hibernate.envers.RelationTargetAuditMode;

@Entity
@Audited
@Table(name = "medicine_master")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicineMaster extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID id;

    @Column(name = "brand_name", nullable = false)
    private String brandName;

    @Column(name = "generic_name", nullable = false)
    private String genericName;

    @Column(name = "dosage_form", nullable = false)
    private String dosageForm;

    @Column(name = "strength", nullable = false)
    private String strength;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_of_measure", nullable = false)
    private UnitOfMeasure unitOfMeasure; // what Inventory.stockQuantity counts in

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "therapeutic_category_id", nullable = false)
    private Category therapeuticCategory; // clinical grouping, separate from legalCategory below

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_id", nullable = false)
    private Manufacturer manufacturer;

    @Enumerated(EnumType.STRING)
    @Column(name = "legal_category", nullable = false)
    private PrescriptionStatus legalCategory; // OTC vs prescription-required

    @Column(name = "image_url")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private MedicineStatus status = MedicineStatus.APPROVED;

    /** The pharmacy that suggested this medicine; null for admin-created entries. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "suggested_by_pharmacy_id")
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    private Pharmacy suggestedByPharmacy;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;
}
