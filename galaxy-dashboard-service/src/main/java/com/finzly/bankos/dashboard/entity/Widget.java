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
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Entity representing a dashboard widget configuration.
 * Stores visualization configuration, data source and filtering details.
 */
@Entity
@Table(name = "widgets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Widget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "chart_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ChartType chartType;

    @Column(name = "data_source", nullable = false, length = 100)
    private String dataSource;

    @Column(name = "refresh_interval", nullable = false)
    private Integer refreshInterval = 30; // in seconds

    @Column(name = "group_fields", columnDefinition = "JSON")
    private String groupFields; // JSON string

    @Column(name = "measure_fields", columnDefinition = "JSON")
    private String measureFields; // JSON string

    @Column(name = "filter_criteria", columnDefinition = "JSON")
    private String filterCriteria; // JSON string

    /**
     * Aggregator-compatible search fields JSON used for server-side filtering.
     * Expected formats:
     *  - {"fieldName":"status","operator":"EQUALS","fieldValue":"FAILED"}
     *  - {"rules":[{"fieldName":"status","operator":"EQUALS","fieldValue":"FAILED"}, ...]}
     */
    @Column(name = "search_fields", columnDefinition = "JSON")
    private String searchFields;

    @Column(name = "widget_config", columnDefinition = "JSON")
    private String widgetConfig; // JSON string for additional configurations

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

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // Relationships
    @OneToMany(mappedBy = "widget", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DashboardWidget> dashboardWidgets;

    public enum ChartType {
        TABLE, PIE, DONUT, VERTICAL_BAR, HORIZONTAL_BAR, COUNT, LINE_CHART, AREA_CHART, RADAR_CHART
    }
}
