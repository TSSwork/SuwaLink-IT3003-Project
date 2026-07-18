package com.suwalink.IT3003.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import org.hibernate.envers.Audited;
import org.hibernate.envers.RelationTargetAuditMode;

@Entity
@Audited // This allows you to see the history of price/stock changes
@Table(name = "inventory")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Inventory extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_master_id", nullable = false)
    private MedicineMaster medicineMaster;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pharmacy_id", nullable = false)
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    private Pharmacy pharmacy;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice; // BigDecimal is best for money

    @Column(name = "expire_date", nullable = false)
    private LocalDate expireDate;

    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity;

    @ManyToOne(fetch = FetchType.LAZY) // Many items could share one product image
    @JoinColumn(name = "image_id")
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    private Image image;

    @Enumerated(EnumType.STRING)
    @Column(name = "abc_category", nullable = false)
    @Builder.Default
    private AbcCategory abcCategory = AbcCategory.C; // Default to Cheap

    @Column(name = "reorder_level", nullable = false)
    @Builder.Default
    private Integer reorderLevel = 10; // Minimum stock before system warns the user

    @Column(name = "ideal_stock_level")
    private Integer idealStockLevel; // Maximum stock to avoid wastage
}
