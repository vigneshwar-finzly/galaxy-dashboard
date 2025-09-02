package com.finzly.bankos.dashboard.dto.request;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDashboardWidgetLayoutRequest {

    @Min(value = 0, message = "Position X must be non-negative")
    private Integer positionX;

    @Min(value = 0, message = "Position Y must be non-negative")
    private Integer positionY;

    @Min(value = 1, message = "Width must be at least 1")
    private Integer width;

    @Min(value = 1, message = "Height must be at least 1")
    private Integer height;

    private Integer widgetOrder;

    private String layoutConfig; // Optional JSON string for layout preferences
}


