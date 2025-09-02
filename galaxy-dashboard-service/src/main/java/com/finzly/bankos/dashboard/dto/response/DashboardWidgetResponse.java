package com.finzly.bankos.dashboard.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardWidgetResponse {

    private Long id;
    private Long dashboardId;
    private Long widgetId;
    private WidgetResponse widget;
    private Integer positionX;
    private Integer positionY;
    private Integer width;
    private Integer height;
    private Integer widgetOrder;
    private String layoutConfig;
    private LocalDateTime createdDateTime;
    private LocalDateTime updatedDateTime;
    private String createdBy;
}
