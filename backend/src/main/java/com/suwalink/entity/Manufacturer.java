package com.suwalink.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;
import java.util.UUID;

@Entity
@Audited
@Table(name = "manufacturers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Manufacturer extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false, unique = true)
    private String name; // e.g., "State Pharmaceuticals Manufacturing Corporation"

    @Column(name = "license_number")
    private String licenseNumber; // NMRA license // NMRA License

    @Column(name = "country", nullable = false)
    private String country; // e.g., "Sri Lanka", "India", "UK"

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "phone")
    private String phone;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;
}
