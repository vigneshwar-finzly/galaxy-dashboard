package com.finzly.bankos.dashboard.entity;

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
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "dashboard_user_permissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardUserPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dashboard_id", nullable = false)
    private Dashboard dashboard;

    @Column(name = "permission_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private PermissionType permissionType;

    @Column(name = "access_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private AccessType accessType;

    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "department_id", length = 255)
    private String departmentId;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "is_favourite", nullable = false)
    private Boolean isFavourite = false;

    @Column(name = "created_by", nullable = false, length = 255)
    private String createdBy;

    @Column(name = "updated_by", length = 255)
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "created_date_time", nullable = false)
    private LocalDateTime createdDateTime;

    @UpdateTimestamp
    @Column(name = "updated_date_time")
    private LocalDateTime updatedDateTime;

    public enum PermissionType {
        VIEWER, EDITOR
    }

    public enum AccessType {
        PRIVATE, USERS, DEPARTMENTS
    }
}
