package com.suwalink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.hibernate.envers.Audited;
import org.hibernate.envers.RelationTargetAuditMode;

@Entity
@Audited
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    private User recipient;

    /** Bundle key prefix; the text is {@code messageKey + ".title"} / {@code ".body"}. */
    @Column(name = "message_key", length = 100, nullable = false)
    private String messageKey;

    /** Values for the {@code {name}} placeholders, stored as a JSON object. */
    @Convert(converter = StringMapJsonConverter.class)
    @Column(name = "params", columnDefinition = "TEXT", nullable = false)
    @Builder.Default
    private Map<String, String> params = new HashMap<>();

    /** Frontend route the notification opens, e.g. {@code /reservations/{id}}. */
    @Column(name = "link", length = 255)
    private String link;

    @Column(name = "emailed_at")
    private LocalDateTime emailedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private NotificationType type;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;
}
