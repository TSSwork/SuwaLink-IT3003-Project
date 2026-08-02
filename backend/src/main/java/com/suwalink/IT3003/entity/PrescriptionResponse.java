package com.suwalink.IT3003.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A pharmacy's offer against one {@link PrescriptionRequest}, made up of one or more
 * {@link PrescriptionResponseItem} lines pulled from that pharmacy's own inventory.
 */
@Entity
@Table(name = "prescription_responses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionResponse extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prescription_request_id", nullable = false)
    private PrescriptionRequest prescriptionRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pharmacy_id", nullable = false)
    private Pharmacy pharmacy;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Builder.Default
    @OneToMany(mappedBy = "prescriptionResponse", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PrescriptionResponseItem> items = new ArrayList<>();
}
