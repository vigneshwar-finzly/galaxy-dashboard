package com.finzly.bankos.dashboard.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WidgetDataResponse {
    
    @JsonProperty("widgetId")
    private Long widgetId;
    
    @JsonProperty("dataSource")
    private String dataSource;
    
    @JsonProperty("chartType")
    private String chartType;
    
    @JsonProperty("data")
    private Object data;  // Flexible data structure to accommodate different chart types
    
    @JsonProperty("metadata")
    private WidgetMetadata metadata;
    
    @JsonProperty("lastUpdated")
    private String lastUpdated;
    
    @JsonProperty("success")
    private Boolean success = true;
    
    @JsonProperty("errorMessage")
    private String errorMessage;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WidgetMetadata {
        @JsonProperty("totalRecords")
        private Long totalRecords;
        
        @JsonProperty("fieldNames")
        private List<String> fieldNames;
        
        @JsonProperty("aggregationType")
        private String aggregationType;
        
        @JsonProperty("groupBy")
        private List<String> groupBy;
        
        @JsonProperty("measures")
        private List<String> measures;
        
        @JsonProperty("filters")
        private Map<String, Object> filters;
        
        @JsonProperty("executionTime")
        private Long executionTimeMs;
    }
    
    /**
     * Creates a success response with data
     */
    public static WidgetDataResponse success(Long widgetId, String dataSource, String chartType, Object data, WidgetMetadata metadata) {
        return WidgetDataResponse.builder()
                .widgetId(widgetId)
                .dataSource(dataSource)
                .chartType(chartType)
                .data(data)
                .metadata(metadata)
                .success(true)
                .lastUpdated(java.time.LocalDateTime.now().toString())
                .build();
    }
    
    /**
     * Creates an error response
     */
    public static WidgetDataResponse error(Long widgetId, String dataSource, String errorMessage) {
        return WidgetDataResponse.builder()
                .widgetId(widgetId)
                .dataSource(dataSource)
                .success(false)
                .errorMessage(errorMessage)
                .lastUpdated(java.time.LocalDateTime.now().toString())
                .build();
    }
}
