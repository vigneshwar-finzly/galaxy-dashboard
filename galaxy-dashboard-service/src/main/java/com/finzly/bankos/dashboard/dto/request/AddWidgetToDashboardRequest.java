package com.finzly.bankos.dashboard.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddWidgetToDashboardRequest {

    @NotNull(message = "Widget ID is required")
    private Long widgetId;

    @Min(value = 0, message = "Position X must be non-negative")
    private Integer positionX = 0;

    @Min(value = 0, message = "Position Y must be non-negative")
    private Integer positionY = 0;

    @Min(value = 1, message = "Width must be at least 1")
    private Integer width = 2;

    @Min(value = 1, message = "Height must be at least 1")
    private Integer height = 2;

    private String layoutConfig; // JSON for additional layout configurations
}
