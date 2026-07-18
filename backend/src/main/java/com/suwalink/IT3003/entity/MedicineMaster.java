package com.suwalink.IT3003.entity;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.hibernate.envers.Audited;

@Entity
@Audited // Tracks full revision history
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

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "therapeutic_category_id", nullable = false)
    private Category therapeuticCategory; // Therapeutic category, e.g., "Painkillers"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_id", nullable = false)
    private Manufacturer manufacturer; // The company that makes the drug (GSK, Cipla)

    @Enumerated(EnumType.STRING)
    @Column(name = "legal_category", nullable = false)
    private PrescriptionStatus legalCategory; // OTC vs Prescription

    @Column(name = "requires_cold_chain", nullable = false)
    @Builder.Default
    private boolean requiresColdChain = false; // For fridge items

    @Enumerated(EnumType.STRING)
    @Column(name = "ved_category", nullable = false)
    @Builder.Default
    private VedCategory vedCategory = VedCategory.E; // Default to Essential

    @Column(name = "image_url")
    private String imageUrl;
}
