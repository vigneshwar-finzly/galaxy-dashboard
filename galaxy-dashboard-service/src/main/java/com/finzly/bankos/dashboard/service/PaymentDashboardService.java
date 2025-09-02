package com.finzly.bankos.dashboard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finzly.bankos.dashboard.dto.request.WidgetDataRequest;
import com.finzly.bankos.dashboard.dto.response.WidgetDataResponse;
import com.finzly.bankos.dashboard.entity.DashboardDatasourceConfig;
import com.finzly.bankos.dashboard.repository.DashboardDatasourceConfigRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service to handle payment dashboard data processing.
 * Implements the business logic for retrieving and formatting payment data
 * for dashboard widgets.
 */
@Service
@RequiredArgsConstructor
public class PaymentDashboardService {

    private static final Logger log = LoggerFactory.getLogger(PaymentDashboardService.class);
    private final DashboardDatasourceConfigRepository datasourceConfigRepository;
    private final ObjectMapper objectMapper;

    /**
     * Executes the widget data request and returns formatted data
     * 
     * @param request Widget data request
     * @return WidgetDataResponse with processed data
     */
    public WidgetDataResponse execute(WidgetDataRequest request) {
        log.info("Executing payment dashboard data request for widget: {}", request.getWidgetId());
        
        try {
            long startTime = System.currentTimeMillis();
            
            // Get datasource configuration
            DashboardDatasourceConfig config = datasourceConfigRepository
                .findByAppCodeAndName("finzly.payment", "Payment")
                .orElseThrow(() -> new RuntimeException("Payment datasource configuration not found"));

            // Parse request parameters
            List<String> groupFields = parseJsonArray(request.getGroupFields());
            List<String> measureFields = parseJsonArray(request.getMeasureFields());
            Map<String, Object> searchCriteria = normalizeSearchCriteria(request.getSearchFields());

            // Generate and execute query
            String query = buildQuery(config, groupFields, measureFields, searchCriteria);
            Object data = executeQuery(query, groupFields, measureFields);

            // Build metadata
            long executionTime = System.currentTimeMillis() - startTime;
            WidgetDataResponse.WidgetMetadata metadata = buildMetadata(groupFields, measureFields, 
                searchCriteria, executionTime, data);

            return WidgetDataResponse.success(
                request.getWidgetId(),
                request.getDataSource(),
                "PAYMENT_CHART", // This could be determined from widget config
                data,
                metadata
            );

        } catch (Exception e) {
            log.error("Error executing payment dashboard request", e);
            return WidgetDataResponse.error(request.getWidgetId(), request.getDataSource(), 
                "Error executing query: " + e.getMessage());
        }
    }

    /**
     * Builds SQL query based on datasource configuration and request parameters
     */
    private String buildQuery(DashboardDatasourceConfig config, List<String> groupFields, 
                             List<String> measureFields, Map<String, Object> searchCriteria) {
        
        try {
            // Use table name from config
            String tableName = config.getTableName();
            if (tableName == null || tableName.trim().isEmpty()) {
                tableName = "payments"; // Default fallback
            }
            
            // Build SELECT clause
            StringBuilder selectClause = new StringBuilder("SELECT ");
            
            // Add group fields
            for (int i = 0; i < groupFields.size(); i++) {
                if (i > 0) selectClause.append(", ");
                String columnName = getColumnName(groupFields.get(i), config);
                selectClause.append(columnName);
            }
            
            // Add measure fields (with aggregation)
            for (String measureField : measureFields) {
                selectClause.append(", ");
                String columnName = getColumnName(measureField, config);
                
                // Default to COUNT for measures
                if ("Payment Id".equals(measureField) || measureField.toLowerCase().contains("count")) {
                    selectClause.append("COUNT(").append(columnName).append(") as ").append(measureField.replace(" ", "_"));
                } else if ("Sender Amount".equals(measureField) || "Fee Amount".equals(measureField)) {
                    selectClause.append("SUM(").append(columnName).append(") as ").append(measureField.replace(" ", "_"));
                } else {
                    selectClause.append("COUNT(").append(columnName).append(") as ").append(measureField.replace(" ", "_"));
                }
            }
            
            // Build query
            StringBuilder query = new StringBuilder(selectClause.toString());
            query.append(" FROM ").append(tableName);
            
            // Add WHERE clause based on search criteria
            if (!searchCriteria.isEmpty()) {
                query.append(" WHERE 1=1");
                // Basic example applying EQUALS and GREATER_THAN/LESS_THAN for numeric/date fields
                applyWhereClauses(query, searchCriteria, config);
            }
            
            // Add GROUP BY clause
            if (!groupFields.isEmpty()) {
                query.append(" GROUP BY ");
                for (int i = 0; i < groupFields.size(); i++) {
                    if (i > 0) query.append(", ");
                    String columnName = getColumnName(groupFields.get(i), config);
                    query.append(columnName);
                }
            }
            
            // Add ORDER BY for consistent results
            query.append(" ORDER BY ");
            if (!measureFields.isEmpty()) {
                String measureColumn = measureFields.get(0).replace(" ", "_");
                query.append(measureColumn).append(" DESC");
            } else if (!groupFields.isEmpty()) {
                String groupColumn = getColumnName(groupFields.get(0), config);
                query.append(groupColumn);
            } else {
                query.append("1");
            }
            
            log.info("Generated query: {}", query.toString());
            return query.toString();
            
        } catch (Exception e) {
            log.error("Error building query", e);
            throw new RuntimeException("Error building query: " + e.getMessage(), e);
        }
    }

    /**
     * Gets the database column name for a display field name
     */
    private String getColumnName(String displayFieldName, DashboardDatasourceConfig config) {
        try {
            // Parse group fields to find column mapping
            List<Map<String, Object>> groupFields = objectMapper.readValue(config.getGroupFields(), 
                new TypeReference<List<Map<String, Object>>>() {});
            
            for (Map<String, Object> field : groupFields) {
                if (displayFieldName.equals(field.get("name"))) {
                    return (String) field.get("column");
                }
            }
            
            // Parse measure fields to find column mapping
            List<Map<String, Object>> measureFields = objectMapper.readValue(config.getMeasureFields(), 
                new TypeReference<List<Map<String, Object>>>() {});
                
            for (Map<String, Object> field : measureFields) {
                if (displayFieldName.equals(field.get("name"))) {
                    return (String) field.get("column");
                }
            }
            
            // Default fallback
            return displayFieldName.toLowerCase().replace(" ", "_");
            
        } catch (Exception e) {
            log.warn("Error getting column name for field: {}, using default", displayFieldName, e);
            return displayFieldName.toLowerCase().replace(" ", "_");
        }
    }

    /**
     * Executes the query and returns formatted data
     * For demo purposes, this returns mock data. In production, this would execute against the actual database.
     */
    private Object executeQuery(String query, List<String> groupFields, List<String> measureFields) {
        log.info("Executing query (mock implementation): {}", query);
        
        // Enhanced mock data for comprehensive demo purposes
        Map<String, Object> mockData = new HashMap<>();
        
        // Determine chart type based on field combinations
        if (groupFields.isEmpty() && measureFields.size() == 1) {
            // COUNT/KPI type widget
            String measure = measureFields.get(0);
            if (measure.toLowerCase().contains("count") || measure.toLowerCase().contains("id")) {
                mockData.put("total", 1847);
            } else if (measure.toLowerCase().contains("amount") || measure.toLowerCase().contains("value")) {
                mockData.put("total", 2400000.75);
            } else if (measure.toLowerCase().contains("time")) {
                mockData.put("total", 2.3);
            } else if (measure.toLowerCase().contains("rate")) {
                mockData.put("total", 98.7);
            } else {
                mockData.put("total", 215);
            }
        } else if (groupFields.contains("Payment Status") || groupFields.contains("PaymentStatus")) {
            // Payment status distribution for pie/donut charts
            mockData.put("COMPLETED", 1560);
            mockData.put("PROCESSED", 187);
            mockData.put("PENDING", 45);
            mockData.put("VALIDATION_FAILED", 23);
            mockData.put("FAILED", 12);
            mockData.put("CANCELLED", 8);
            mockData.put("BLOCKED", 5);
            mockData.put("REJECTED", 7);
        } else if (groupFields.contains("Delivery Method") || groupFields.contains("DeliveryMethod")) {
            // Payment methods for bar/pie charts
            if (measureFields.contains("Sender Amount") || measureFields.contains("amount")) {
                mockData.put("ACH", 1250000.50);
                mockData.put("FEDNOW", 420000.25);
                mockData.put("FEDWIRE", 890500.75);
                mockData.put("RTP", 340200.00);
                mockData.put("SWIFT", 156750.00);
            } else {
                mockData.put("ACH", 850);
                mockData.put("FEDNOW", 320);
                mockData.put("FEDWIRE", 480);
                mockData.put("RTP", 240);
                mockData.put("SWIFT", 157);
            }
        } else if (groupFields.contains("Channel")) {
            // Channel distribution
            if (measureFields.contains("Sender Amount") || measureFields.contains("amount")) {
                mockData.put("API", 1800000.00);
                mockData.put("TELLER", 450000.50);
                mockData.put("CASHOS", 320000.25);
                mockData.put("WIRE", 180000.75);
            } else {
                mockData.put("API", 1240);
                mockData.put("TELLER", 380);
                mockData.put("CASHOS", 127);
                mockData.put("WIRE", 100);
            }
        } else if (groupFields.contains("Department")) {
            // Department-wise data
            mockData.put("Treasury", 420);
            mockData.put("Commercial Banking", 380);
            mockData.put("Retail Banking", 520);
            mockData.put("Corporate Banking", 340);
            mockData.put("International", 187);
        } else if (groupFields.contains("Book")) {
            // Book-wise distribution
            mockData.put("GALAXY_OUTGOING", 1200);
            mockData.put("GALAXY_INCOMING", 647);
        } else if (groupFields.contains("Payment Date") || groupFields.contains("date")) {
            // Time series data for line/area charts
            Map<String, Object> timeSeriesData = new LinkedHashMap<>();
            
            // Generate 30 days of mock data
            for (int i = 1; i <= 30; i++) {
                String date = String.format("2024-01-%02d", i);
                if (measureFields.contains("Sender Amount") || measureFields.contains("amount")) {
                    // Daily payment volumes
                    timeSeriesData.put(date, 50000 + (Math.random() * 100000));
                } else if (measureFields.contains("rate") || measureFields.contains("Rate")) {
                    // Success rates
                    timeSeriesData.put(date, 85 + (Math.random() * 10));
                } else {
                    // Payment counts
                    timeSeriesData.put(date, (int)(50 + (Math.random() * 100)));
                }
            }
            return timeSeriesData;
        } else if (groupFields.contains("Hour") || groupFields.contains("time")) {
            // Hourly data for time-based analysis
            Map<String, Object> hourlyData = new LinkedHashMap<>();
            for (int hour = 0; hour < 24; hour++) {
                String timeLabel = String.format("%02d:00", hour);
                if (measureFields.contains("amount")) {
                    hourlyData.put(timeLabel, 20000 + (Math.random() * 80000));
                } else {
                    hourlyData.put(timeLabel, (int)(10 + (Math.random() * 100)));
                }
            }
            return hourlyData;
        } else if (groupFields.contains("Memo Post Status") || groupFields.contains("MemoPostStatus")) {
            // Memo posting status
            mockData.put("POSTED", 1650);
            mockData.put("NOT_POSTED", 120);
            mockData.put("FAILURE", 15);
            mockData.put("NOT_APPLICABLE", 62);
        } else if (groupFields.contains("Currency") || groupFields.contains("SenderCurrency")) {
            // Currency distribution
            mockData.put("USD", 1450);
            mockData.put("EUR", 240);
            mockData.put("GBP", 120);
            mockData.put("CAD", 87);
            mockData.put("JPY", 50);
        } else if (groupFields.contains("IOType") || groupFields.contains("IoType")) {
            // Incoming vs Outgoing
            mockData.put("IN", 980);
            mockData.put("OUT", 867);
        } else if (groupFields.size() > 1) {
            // Multi-dimensional grouping - create combined keys
            mockData.put("ACH-COMPLETED", 720);
            mockData.put("ACH-PENDING", 25);
            mockData.put("FEDWIRE-COMPLETED", 450);
            mockData.put("FEDWIRE-PENDING", 15);
            mockData.put("FEDNOW-COMPLETED", 380);
            mockData.put("FEDNOW-PENDING", 8);
        } else {
            // Default fallback data
            mockData.put("Category A", 420);
            mockData.put("Category B", 380);
            mockData.put("Category C", 280);
            mockData.put("Category D", 180);
            mockData.put("Category E", 120);
        }
        
        log.info("Generated mock data with {} entries for groups: {} and measures: {}", 
                mockData.size(), groupFields, measureFields);
        
        return mockData;
    }

    /**
     * Builds metadata for the response
     */
    private WidgetDataResponse.WidgetMetadata buildMetadata(List<String> groupFields, 
                                                           List<String> measureFields,
                                                           Map<String, Object> searchCriteria, 
                                                           long executionTime, Object data) {
        return WidgetDataResponse.WidgetMetadata.builder()
            .totalRecords(getTotalRecords(data))
            .fieldNames(groupFields)
            .groupBy(groupFields)
            .measures(measureFields)
            .filters(searchCriteria)
            .executionTimeMs(executionTime)
            .aggregationType("SUM") // This could be dynamic based on measure fields
            .build();
    }

    /**
     * Gets total record count from data
     */
    private Long getTotalRecords(Object data) {
        if (data instanceof Map) {
            return (long) ((Map<?, ?>) data).size();
        }
        return 1L;
    }

    /**
     * Parses JSON array string to List
     */
    private List<String> parseJsonArray(String jsonString) {
        try {
            if (jsonString == null || jsonString.trim().isEmpty()) {
                return new ArrayList<>();
            }
            return objectMapper.readValue(jsonString, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Error parsing JSON array: {}, returning empty list", jsonString, e);
            return new ArrayList<>();
        }
    }

    /**
     * Parses JSON object string to Map
     */
    private Map<String, Object> parseJsonObject(String jsonString) {
        try {
            if (jsonString == null || jsonString.trim().isEmpty()) {
                return new HashMap<>();
            }
            return objectMapper.readValue(jsonString, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Error parsing JSON object: {}, returning empty map", jsonString, e);
            return new HashMap<>();
        }
    }

    /**
     * Normalizes search criteria to aggregator-compatible map structure.
     * Accepts either legacy key-value object or aggregator formats with a single rule or rules array.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> normalizeSearchCriteria(String searchFieldsJson) {
        Map<String, Object> result = new HashMap<>();
        if (searchFieldsJson == null || searchFieldsJson.trim().isEmpty()) {
            return result;
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(searchFieldsJson, new TypeReference<Map<String, Object>>() {});
            // If contains rules array, convert to map keyed by fieldName
            if (parsed.containsKey("rules") && parsed.get("rules") instanceof List) {
                List<Map<String, Object>> rules = (List<Map<String, Object>>) parsed.get("rules");
                for (Map<String, Object> rule : rules) {
                    String field = String.valueOf(rule.get("fieldName"));
                    result.put(field, rule);
                }
                return result;
            }
            // If contains aggregator single rule keys
            if (parsed.containsKey("fieldName") && parsed.containsKey("operator") && parsed.containsKey("fieldValue")) {
                String field = String.valueOf(parsed.get("fieldName"));
                result.put(field, parsed);
                return result;
            }
            // Treat as legacy flat filter map
            return parsed;
        } catch (Exception e) {
            log.warn("Error normalizing search fields JSON, using empty criteria. JSON: {}", searchFieldsJson, e);
            return result;
        }
    }

    /**
     * Applies simple WHERE clauses based on normalized search criteria map.
     */
    private void applyWhereClauses(StringBuilder query, Map<String, Object> searchCriteria, DashboardDatasourceConfig config) {
        try {
            for (Map.Entry<String, Object> entry : searchCriteria.entrySet()) {
                String displayField = entry.getKey();
                String column = getColumnName(displayField, config);
                Object valueObj = entry.getValue();
                if (valueObj instanceof Map) {
                    Map<?, ?> rule = (Map<?, ?>) valueObj;
                    Object operatorObj = rule.get("operator");
                    String operator = operatorObj != null ? String.valueOf(operatorObj) : "EQUALS";
                    Object fieldValue = rule.get("fieldValue");
                    switch (operator) {
                        case "EQUALS":
                            query.append(" AND ").append(column).append(" = '").append(fieldValue).append("'");
                            break;
                        case "NOT_EQUALS":
                            query.append(" AND ").append(column).append(" <> '").append(fieldValue).append("'");
                            break;
                        case "GREATER_THAN":
                            query.append(" AND ").append(column).append(" > '").append(fieldValue).append("'");
                            break;
                        case "LESS_THAN":
                            query.append(" AND ").append(column).append(" < '").append(fieldValue).append("'");
                            break;
                        case "LIKE":
                            query.append(" AND ").append(column).append(" LIKE '%").append(fieldValue).append("%'");
                            break;
                        default:
                            query.append(" AND ").append(column).append(" = '").append(fieldValue).append("'");
                    }
                } else {
                    // Legacy simple equality
                    query.append(" AND ").append(column).append(" = '").append(valueObj).append("'");
                }
            }
        } catch (Exception e) {
            log.warn("Failed to apply WHERE clauses from search criteria: {}", e.getMessage());
        }
    }
}
