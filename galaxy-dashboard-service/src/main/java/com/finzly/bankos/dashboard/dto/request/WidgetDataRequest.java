package com.finzly.bankos.dashboard.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WidgetDataRequest {
    
    @JsonProperty("widgetId")
    private Long widgetId;
    
    @JsonProperty("searchFields")
    private String searchFields;  // JSON string containing search criteria
    
    @JsonProperty("groupFields")
    private String groupFields;   // JSON string containing group by fields
    
    @JsonProperty("measureFields")
    private String measureFields; // JSON string containing measure fields
    
    @JsonProperty("measures")
    private String measures;      // JSON string containing measure types (COUNT, SUM, AVG, etc.)
    
    @JsonProperty("dataSource")
    private String dataSource;    // Data source name (Payment, BulkFile, etc.)
    
    @JsonProperty("appCode")
    private String appCode;       // Application code (finzly.payment, finzly.bulkfile, etc.)
    
    /**
     * Converts the request to a SQL query based on the parameters
     * This method should be implemented based on the specific datasource requirements
     */
    public String toQuery() {
        // TODO: Implement SQL query generation based on request parameters
        // This will be specific to each datasource implementation
        return "";
    }
    
    /**
     * Validates the request parameters
     */
    public boolean isValid() {
        return widgetId != null && 
               dataSource != null && !dataSource.trim().isEmpty() &&
               groupFields != null && !groupFields.trim().isEmpty() &&
               measureFields != null && !measureFields.trim().isEmpty();
    }
}
