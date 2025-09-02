package com.finzly.bankos.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "dashboard_datasource_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDatasourceConfig {

    @Id
    private String id;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "app_code", length = 100)
    private String appCode;

    @Column(name = "display_name", length = 255)
    private String displayName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "table_name", length = 100)
    private String tableName;

    @Column(name = "search_fields", columnDefinition = "JSON")
    private String searchFields;

    @Column(name = "group_fields", columnDefinition = "JSON")
    private String groupFields;

    @Column(name = "measure_fields", columnDefinition = "JSON")
    private String measureFields;

    @CreationTimestamp
    @Column(name = "created_date_time")
    private LocalDateTime createdDateTime;

    @UpdateTimestamp
    @Column(name = "updated_date_time")
    private LocalDateTime updatedDateTime;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    @Column(name = "updated_by", length = 255)
    private String updatedBy;
}
