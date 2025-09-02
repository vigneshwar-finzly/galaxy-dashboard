package com.finzly.bankos.dashboard.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "dashboard")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Dashboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "viewer_type", nullable = false, columnDefinition = "ENUM('DEPARTMENT','GLOBAL','PRIVATE','USERS')")
    @Enumerated(EnumType.STRING)
    private ViewerType viewerType;

    @Column(name = "editor_type", nullable = false, columnDefinition = "ENUM('DEPARTMENT','GLOBAL','PRIVATE','USERS')")
    @Enumerated(EnumType.STRING)
    private EditorType editorType;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private DashboardStatus status;

    @Column(name = "is_system_dashboard", nullable = false)
    private Boolean isSystemDashboard = false;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "created_date_time", nullable = false)
    private LocalDateTime createdDateTime;

    @UpdateTimestamp
    @Column(name = "updated_date_time")
    private LocalDateTime updatedDateTime;

    @Column(name = "is_active", nullable = false, columnDefinition = "BIT(1)")
    private Boolean isActive = true;

    @Column(name = "is_default", nullable = false, columnDefinition = "BIT(1)")
    private Boolean isDefault = false;

    // Relationships
    @OneToMany(mappedBy = "dashboard", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DashboardUserPermission> userPermissions;

    @OneToMany(mappedBy = "dashboard", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DashboardWidget> dashboardWidgets;

    public enum ViewerType {
        DEPARTMENT, GLOBAL, PRIVATE, USERS
    }

    public enum EditorType {
        DEPARTMENT, GLOBAL, PRIVATE, USERS
    }

    public enum DashboardStatus {
        DRAFT, ACTIVE, PUBLISHED
    }
}
