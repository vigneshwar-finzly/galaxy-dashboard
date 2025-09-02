package com.finzly.bankos.dashboard.dto.request;

import com.finzly.bankos.dashboard.entity.Widget;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateWidgetRequest {

    @NotBlank(message = "Widget name is required")
    private String name;

    private String description;

    @NotNull(message = "Chart type is required")
    private Widget.ChartType chartType;

    @NotBlank(message = "Data source is required")
    private String dataSource;

    @Min(value = 10, message = "Refresh interval must be at least 10 seconds")
    private Integer refreshInterval;

    private String groupFields; // JSON string

    private String measureFields; // JSON string

    private String filterCriteria; // JSON string

    private String widgetConfig; // JSON string for additional configurations

    private String searchFields; // JSON string (aggregator-compatible)
}
