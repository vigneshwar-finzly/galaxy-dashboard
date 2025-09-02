package com.finzly.bankos.dashboard.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for sending widget configuration data to external services
 * This replaces sending pre-generated SQL queries
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WidgetConfigRequest {
    
    @JsonProperty("widgetId")
    private Long widgetId;
    
    @JsonProperty("widgetName")
    private String widgetName;
    
    @JsonProperty("dataSource")
    private String dataSource;
    
    @JsonProperty("appCode")
    private String appCode;
    
    @JsonProperty("tableName")
    private String tableName;
    
    @JsonProperty("groupFields")
    private String groupFields;   // JSON string containing group by fields
    
    @JsonProperty("measureFields")
    private String measureFields; // JSON string containing measure fields with aggregations
    
    @JsonProperty("searchFields")
    private String searchFields;  // JSON string containing search/filter criteria
    
    @JsonProperty("chartType")
    private String chartType;
    
    @JsonProperty("refreshInterval")
    private Integer refreshInterval;
    
    @JsonProperty("widgetConfig")
    private String widgetConfig;  // JSON string containing widget-specific configuration
    
    /**
     * Validates the request parameters
     */
    public boolean isValid() {
        return widgetId != null && 
               dataSource != null && !dataSource.trim().isEmpty() &&
               tableName != null && !tableName.trim().isEmpty() &&
               ((groupFields != null && !groupFields.trim().isEmpty()) || 
                (measureFields != null && !measureFields.trim().isEmpty()));
    }
}
