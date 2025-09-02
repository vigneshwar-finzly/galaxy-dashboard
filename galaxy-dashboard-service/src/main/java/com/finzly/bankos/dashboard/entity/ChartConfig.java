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
@Table(name = "chart_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChartConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chart_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ChartType chartType;

    @Column(name = "field_rules", columnDefinition = "JSON", nullable = false)
    private String fieldRules; // JSON containing groupFields and measureFields rules

    @Column(name = "ui_constraints", columnDefinition = "JSON")
    private String uiConstraints; // JSON containing UI specific constraints

    @Column(name = "display_config", columnDefinition = "JSON")
    private String displayConfig; // JSON containing display configurations

    @CreationTimestamp
    @Column(name = "created_date_time", nullable = false)
    private LocalDateTime createdDateTime;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public enum ChartType {
        TABLE, PIE, DONUT, VERTICAL_BAR, HORIZONTAL_BAR, COUNT, LINE_CHART, AREA_CHART, RADAR_CHART
    }
}
