package com.finzly.bankos.dashboard.dto.response;

import com.finzly.bankos.dashboard.entity.Widget;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WidgetResponse {

    private Long id;
    private String name;
    private String description;
    private Widget.ChartType chartType;
    private String dataSource;
    private Integer refreshInterval;
    private String groupFields;
    private String measureFields;
    private String filterCriteria;
    private String searchFields;
    private String widgetConfig;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdDateTime;
    private LocalDateTime updatedDateTime;
    
    // New field to include widget data
    private Map<String, Object> widgetData;
    private Boolean dataLoadSuccess;
    private String dataLoadError;
}
