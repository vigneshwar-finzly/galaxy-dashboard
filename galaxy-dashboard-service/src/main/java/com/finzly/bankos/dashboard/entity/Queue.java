package com.finzly.bankos.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "queue")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Queue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "queue_name", nullable = false, length = 100, unique = true)
    private String queueName;

    @Column(name = "queue_code", nullable = false, length = 50, unique = true)
    private String queueCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "queue_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private QueueType queueType;

    @Column(name = "app_code", nullable = false, length = 100)
    private String appCode; // e.g., "finzly.payment"

    @Column(name = "priority", nullable = false)
    private Integer priority = 0;

    @Column(name = "queue_config", columnDefinition = "JSON")
    private String queueConfig; // JSON containing queue specific configurations

    @CreationTimestamp
    @Column(name = "created_date_time", nullable = false)
    private LocalDateTime createdDateTime;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public enum QueueType {
        PAYMENT, VALIDATION, CALLBACK, REPAIR, EXCEPTION, APPROVAL, GENERAL
    }
}
