package com.finzly.bankos.dashboard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finzly.bankos.dashboard.entity.DashboardDatasourceConfig;
import com.finzly.bankos.dashboard.entity.Widget;
import com.finzly.bankos.dashboard.exception.ResourceNotFoundException;
import com.finzly.bankos.dashboard.repository.DashboardDatasourceConfigRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SqlQueryGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(SqlQueryGeneratorService.class);

    private final DashboardDatasourceConfigRepository datasourceConfigRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Generates SQL query based on widget configuration
     * @param widget The widget configuration
     * @return Generated SQL query string
     */
    public String generateSqlQuery(Widget widget) {
        log.info("Generating SQL query for widget: {}", widget.getName());
        
        try {
            // Get datasource configuration
            DashboardDatasourceConfig datasourceConfig = getDatasourceConfig(widget.getDataSource());
            
            // Parse widget configuration
            List<GroupFieldConfig> groupFields = parseGroupFields(widget.getGroupFields());
            List<MeasureFieldConfig> measureFields = parseMeasureFields(widget.getMeasureFields());
            List<FilterCriteria> filterCriteria = parseFilterCriteria(widget.getSearchFields());
            
            // Build SQL query
            return buildSqlQuery(datasourceConfig.getTableName(), groupFields, measureFields, filterCriteria);
            
        } catch (Exception e) {
            log.error("Error generating SQL query for widget: {}", widget.getName(), e);
            throw new RuntimeException("Failed to generate SQL query: " + e.getMessage());
        }
    }

    /**
     * Generates SQL query based on individual parameters
     * @param dataSourceName The datasource name
     * @param groupFieldsJson JSON string of group fields
     * @param measureFieldsJson JSON string of measure fields
     * @param filterCriteriaJson JSON string of filter criteria
     * @return Generated SQL query string
     */
    public String generateSqlQuery(String dataSourceName, String groupFieldsJson, String measureFieldsJson, String filterCriteriaJson) {
        log.info("Generating SQL query for datasource: {}", dataSourceName);
        
        try {
            // Get datasource configuration
            DashboardDatasourceConfig datasourceConfig = getDatasourceConfig(dataSourceName);
            
            // Parse configuration
            List<GroupFieldConfig> groupFields = parseGroupFields(groupFieldsJson);
            List<MeasureFieldConfig> measureFields = parseMeasureFields(measureFieldsJson);
            List<FilterCriteria> filterCriteria = parseFilterCriteria(filterCriteriaJson);
            
            // Build SQL query
            return buildSqlQuery(datasourceConfig.getTableName(), groupFields, measureFields, filterCriteria);
            
        } catch (Exception e) {
            log.error("Error generating SQL query for datasource: {}", dataSourceName, e);
            throw new RuntimeException("Failed to generate SQL query: " + e.getMessage());
        }
    }

    private DashboardDatasourceConfig getDatasourceConfig(String dataSourceName) {
        Optional<DashboardDatasourceConfig> configs = datasourceConfigRepository.findByName(dataSourceName);
        if (configs.isEmpty()) {
            throw new ResourceNotFoundException("Datasource configuration not found: " + dataSourceName);
        }
        return configs.get();
    }

    private String buildSqlQuery(String tableName, List<GroupFieldConfig> groupFields, 
                                List<MeasureFieldConfig> measureFields, List<FilterCriteria> filterCriteria) {
        
        StringBuilder sql = new StringBuilder();
        
        // SELECT clause
        sql.append("SELECT ");
        
        // Add group fields
        if (!groupFields.isEmpty()) {
            String groupColumns = groupFields.stream()
                    .map(GroupFieldConfig::getFieldName)
                    .collect(Collectors.joining(", "));
            sql.append(groupColumns);
            
            if (!measureFields.isEmpty()) {
                sql.append(", ");
            }
        }
        
        // Add measure fields with aggregation
        if (!measureFields.isEmpty()) {
            String measureColumns = measureFields.stream()
                    .map(this::buildMeasureField)
                    .collect(Collectors.joining(", "));
            sql.append(measureColumns);
        } else if (groupFields.isEmpty()) {
            // If no measure fields and no group fields, select all columns
            sql.append("*");
        }
        
        // FROM clause
        sql.append(" FROM paymentgalaxy_banka.payment");
        
        // WHERE clause for filters
        if (!filterCriteria.isEmpty()) {
            sql.append(" WHERE ");
            String whereClause = buildWhereClause(filterCriteria);
            sql.append(whereClause);
        }
        
        // GROUP BY clause - always add if we have group fields and measure fields
        if (!groupFields.isEmpty() && !measureFields.isEmpty()) {
            sql.append(" GROUP BY ");
            String groupByColumns = groupFields.stream()
                    .map(GroupFieldConfig::getFieldName)
                    .collect(Collectors.joining(", "));
            sql.append(groupByColumns);
        }
        
        // ORDER BY clause - only add if explicitly requested
        // Most chart libraries handle their own sorting, so we skip automatic ordering
        // This improves performance and gives users control over data presentation
        
        // LIMIT clause for performance
        sql.append(" LIMIT 50");
        
        String finalQuery = sql.toString();
        log.debug("Generated SQL query: {}", finalQuery);
        
        return finalQuery;
    }

    private String buildMeasureField(MeasureFieldConfig measureField) {
        String aggregation = measureField.getAggregation() != null ? measureField.getAggregation().toUpperCase() : "SUM";
        return String.format("%s(%s) AS %s", aggregation, measureField.getFieldName(), 
                measureField.getDisplayName() != null ? measureField.getDisplayName() : measureField.getFieldName());
    }

    private String buildWhereClause(List<FilterCriteria> filterCriteria) {
        return filterCriteria.stream()
                .map(this::buildFilterCondition)
                .collect(Collectors.joining(" AND "));
    }

    private String buildFilterCondition(FilterCriteria filter) {
        String fieldName = filter.getFieldName();
        String operator = filter.getOperator();
        Object fieldValue = filter.getFieldValue();
        
        switch (operator.toUpperCase()) {
            case "EQUALS":
                return String.format("%s = %s", fieldName, formatValue(fieldValue));
            case "NOT_EQUALS":
                return String.format("%s != %s", fieldName, formatValue(fieldValue));
            case "GREATER_THAN":
                return String.format("%s > %s", fieldName, formatValue(fieldValue));
            case "GREATER_THAN_EQUALS":
                return String.format("%s >= %s", fieldName, formatValue(fieldValue));
            case "LESS_THAN":
                return String.format("%s < %s", fieldName, formatValue(fieldValue));
            case "LESS_THAN_EQUALS":
                return String.format("%s <= %s", fieldName, formatValue(fieldValue));
            case "LIKE":
                return String.format("%s LIKE %s", fieldName, formatValue("%" + fieldValue + "%"));
            case "IN":
                if (fieldValue instanceof Collection) {
                    String values = ((Collection<?>) fieldValue).stream()
                            .map(this::formatValue)
                            .collect(Collectors.joining(", "));
                    return String.format("%s IN (%s)", fieldName, values);
                }
                return String.format("%s IN (%s)", fieldName, formatValue(fieldValue));
            case "NOT_IN":
                if (fieldValue instanceof Collection) {
                    String values = ((Collection<?>) fieldValue).stream()
                            .map(this::formatValue)
                            .collect(Collectors.joining(", "));
                    return String.format("%s NOT IN (%s)", fieldName, values);
                }
                return String.format("%s NOT IN (%s)", fieldName, formatValue(fieldValue));
            case "IS_NULL":
                return String.format("%s IS NULL", fieldName);
            case "IS_NOT_NULL":
                return String.format("%s IS NOT NULL", fieldName);
            case "BETWEEN":
                if (fieldValue instanceof Map) {
                    Map<?, ?> betweenMap = (Map<?, ?>) fieldValue;
                    Object start = betweenMap.get("start");
                    Object end = betweenMap.get("end");
                    return String.format("%s BETWEEN %s AND %s", fieldName, formatValue(start), formatValue(end));
                }
                return String.format("%s = %s", fieldName, formatValue(fieldValue));
            default:
                log.warn("Unknown operator: {}, using equals", operator);
                return String.format("%s = %s", fieldName, formatValue(fieldValue));
        }
    }

    private String formatValue(Object value) {
        if (value == null) {
            return "NULL";
        }
        
        if (value instanceof Number) {
            return value.toString();
        }
        
        if (value instanceof Boolean) {
            return value.toString();
        }
        
        // String values need quotes
        return "'" + value.toString().replace("'", "''") + "'";
    }

    private List<GroupFieldConfig> parseGroupFields(String groupFieldsJson) {
        if (groupFieldsJson == null || groupFieldsJson.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        try {
            // First try to parse as simple array of strings
            List<String> fieldNames = objectMapper.readValue(groupFieldsJson, new TypeReference<List<String>>() {});
            return fieldNames.stream()
                    .map(fieldName -> {
                        GroupFieldConfig config = new GroupFieldConfig();
                        config.setFieldName(fieldName);
                        config.setDisplayName(fieldName);
                        return config;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            // If that fails, try to parse as complex objects
            try {
                return objectMapper.readValue(groupFieldsJson, new TypeReference<List<GroupFieldConfig>>() {});
            } catch (Exception e2) {
                log.warn("Failed to parse group fields JSON: {}", groupFieldsJson, e2);
                return new ArrayList<>();
            }
        }
    }

    private List<MeasureFieldConfig> parseMeasureFields(String measureFieldsJson) {
        if (measureFieldsJson == null || measureFieldsJson.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        try {
            // First try to parse as simple array of strings
            List<String> fieldNames = objectMapper.readValue(measureFieldsJson, new TypeReference<List<String>>() {});
            return fieldNames.stream()
                    .map(fieldName -> {
                        MeasureFieldConfig config = new MeasureFieldConfig();
                        config.setFieldName(fieldName);
                        config.setDisplayName(fieldName);
                        config.setAggregation("SUM"); // Default aggregation
                        return config;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            // If that fails, try to parse as complex objects
            try {
                return objectMapper.readValue(measureFieldsJson, new TypeReference<List<MeasureFieldConfig>>() {});
            } catch (Exception e2) {
                log.warn("Failed to parse measure fields JSON: {}", measureFieldsJson, e2);
                return new ArrayList<>();
            }
        }
    }

    private List<FilterCriteria> parseFilterCriteria(String filterCriteriaJson) {
        if (filterCriteriaJson == null || filterCriteriaJson.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        try {
            JsonNode rootNode = objectMapper.readTree(filterCriteriaJson);
            
            // Check if it's a simple filter or complex rules structure
            if (rootNode.has("rules")) {
                // Complex structure with rules
                return parseComplexFilterCriteria(rootNode);
            } else if (rootNode.has("operator") && rootNode.has("fieldName")) {
                // Simple structure - single filter with operator, fieldName, fieldValue
                FilterCriteria filter = objectMapper.treeToValue(rootNode, FilterCriteria.class);
                return filter != null ? List.of(filter) : new ArrayList<>();
            } else {
                // Try to parse as map of fieldName -> {value, condition}
                return parseFieldConditionMap(rootNode);
            }
        } catch (Exception e) {
            log.warn("Failed to parse filter criteria JSON: {}", filterCriteriaJson, e);
            return new ArrayList<>();
        }
    }

    private List<FilterCriteria> parseFieldConditionMap(JsonNode rootNode) {
        List<FilterCriteria> filters = new ArrayList<>();
        
        try {
            Iterator<Map.Entry<String, JsonNode>> fields = rootNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String fieldName = entry.getKey();
                JsonNode fieldConfig = entry.getValue();
                
                if (fieldConfig.has("value") && fieldConfig.has("condition")) {
                    FilterCriteria filter = new FilterCriteria();
                    filter.setFieldName(fieldName);
                    filter.setFieldValue(fieldConfig.get("value").asText());
                    
                    // Map condition to operator
                    String condition = fieldConfig.get("condition").asText();
                    switch (condition.toUpperCase()) {
                        case "EQUALS":
                            filter.setOperator("EQUALS");
                            break;
                        case "AFTER":
                            filter.setOperator("GREATER_THAN");
                            break;
                        case "BEFORE":
                            filter.setOperator("LESS_THAN");
                            break;
                        case "CONTAINS":
                            filter.setOperator("LIKE");
                            break;
                        default:
                            filter.setOperator("EQUALS");
                    }
                    
                    filters.add(filter);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse field condition map", e);
        }
        
        return filters;
    }

    private List<FilterCriteria> parseComplexFilterCriteria(JsonNode rootNode) {
        List<FilterCriteria> filters = new ArrayList<>();
        
        try {
            JsonNode rulesNode = rootNode.get("rules");
            if (rulesNode.isArray()) {
                for (JsonNode ruleNode : rulesNode) {
                    FilterCriteria filter = objectMapper.treeToValue(ruleNode, FilterCriteria.class);
                    if (filter != null) {
                        filters.add(filter);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse complex filter criteria", e);
        }
        
        return filters;
    }

    // Configuration classes for parsing JSON
    public static class GroupFieldConfig {
        private String fieldName;
        private String displayName;
        private String type;
        
        // Getters and setters
        public String getFieldName() { return fieldName; }
        public void setFieldName(String fieldName) { this.fieldName = fieldName; }
        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
    }

    public static class MeasureFieldConfig {
        private String fieldName;
        private String displayName;
        private String aggregation;
        private String type;
        
        // Getters and setters
        public String getFieldName() { return fieldName; }
        public void setFieldName(String fieldName) { this.fieldName = fieldName; }
        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }
        public String getAggregation() { return aggregation; }
        public void setAggregation(String aggregation) { this.aggregation = aggregation; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
    }

    public static class FilterCriteria {
        private String fieldName;
        private String operator;
        private Object fieldValue;
        
        // Getters and setters
        public String getFieldName() { return fieldName; }
        public void setFieldName(String fieldName) { this.fieldName = fieldName; }
        public String getOperator() { return operator; }
        public void setOperator(String operator) { this.operator = operator; }
        public Object getFieldValue() { return fieldValue; }
        public void setFieldValue(Object fieldValue) { this.fieldValue = fieldValue; }
    }
}
