package com.finzly.bankos.dashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.finzly.bankos.dashboard.dto.WidgetDTO;
import com.finzly.bankos.dashboard.dto.request.CreateWidgetRequest;
import com.finzly.bankos.dashboard.dto.request.UpdateWidgetRequest;
import com.finzly.bankos.dashboard.dto.request.WidgetDataRequest;
import com.finzly.bankos.dashboard.dto.response.WidgetDataResponse;
import com.finzly.bankos.dashboard.dto.response.WidgetLibraryResponse;
import com.finzly.bankos.dashboard.dto.response.WidgetResponse;
import com.finzly.bankos.dashboard.entity.Dashboard;
import com.finzly.bankos.dashboard.entity.DashboardWidget;
import com.finzly.bankos.dashboard.entity.Widget;
import com.finzly.bankos.dashboard.exception.ResourceNotFoundException;
import com.finzly.bankos.dashboard.mapper.DashboardMapper;
import com.finzly.bankos.dashboard.repository.DashboardRepository;
import com.finzly.bankos.dashboard.adapter.PaymentAdapter;
import com.finzly.bankos.dashboard.repository.DashboardWidgetRepository;
import com.finzly.bankos.dashboard.repository.WidgetRepository;
import com.finzly.bankos.dashboard.repository.DashboardDatasourceConfigRepository;
import com.finzly.bankos.dashboard.dto.request.WidgetConfigRequest;
import com.finzly.bankos.dashboard.entity.DashboardDatasourceConfig;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class WidgetService {

    private static final Logger log = LoggerFactory.getLogger(WidgetService.class);

    private final WidgetRepository widgetRepository;
    private final DashboardWidgetRepository dashboardWidgetRepository;
    private final DashboardRepository dashboardRepository;
    private final DashboardMapper dashboardMapper;
    private final PaymentDashboardService paymentDashboardService;
    private final PaymentAdapter paymentAdapter;
    private final DashboardDatasourceConfigRepository datasourceConfigRepository;


    public List<WidgetResponse> getAllWidgets(String userId, String departmentId) {
        log.info("Getting all widgets for user: {}", userId);

        List<Widget> widgets = widgetRepository.findVisibleWidgets(userId, departmentId);

        return widgets.stream()
                .map(widget -> {
                    WidgetResponse response = dashboardMapper.toWidgetResponse(widget);
                    // Load widget data for each widget
                    try {
                        WidgetDataResponse widgetDataResponse = getWidgetDataForWidget(widget);
                        if (widgetDataResponse.getSuccess()) {
                            // Convert data to Map<String, Object> if it's not already
                            Object data = widgetDataResponse.getData();
                            if (data instanceof Map) {
                                @SuppressWarnings("unchecked")
                                Map<String, Object> dataMap = (Map<String, Object>) data;
                                response.setWidgetData(dataMap);
                            } else {
                                // If data is not a Map, wrap it
                                Map<String, Object> dataMap = new java.util.HashMap<>();
                                dataMap.put("data", data);
                                response.setWidgetData(dataMap);
                            }
                            response.setDataLoadSuccess(true);
                        } else {
                            response.setDataLoadSuccess(false);
                            response.setDataLoadError(widgetDataResponse.getErrorMessage());
                            log.warn("Failed to load data for widget {}: {}", widget.getId(), widgetDataResponse.getErrorMessage());
                        }
                    } catch (Exception e) {
                        response.setDataLoadSuccess(false);
                        response.setDataLoadError("Error loading widget data: " + e.getMessage());
                        log.error("Error loading data for widget {}: {}", widget.getId(), e.getMessage());
                    }
                    return response;
                })
                .collect(Collectors.toList());
    }

    public WidgetResponse getWidgetById(Long widgetId) {
        log.info("Getting widget by id: {}", widgetId);

        Widget widget = widgetRepository.findByIdAndIsActiveTrue(widgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Widget not found with id: " + widgetId));

        WidgetResponse response = dashboardMapper.toWidgetResponse(widget);
        
        // Load widget data
        try {
            WidgetDataResponse widgetDataResponse = getWidgetDataForWidget(widget);
            if (widgetDataResponse.getSuccess()) {
                // Convert data to Map<String, Object> if it's not already
                Object data = widgetDataResponse.getData();
                if (data instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> dataMap = (Map<String, Object>) data;
                    response.setWidgetData(dataMap);
                } else {
                    // If data is not a Map, wrap it
                    Map<String, Object> dataMap = new java.util.HashMap<>();
                    dataMap.put("data", data);
                    response.setWidgetData(dataMap);
                }
                response.setDataLoadSuccess(true);
            } else {
                response.setDataLoadSuccess(false);
                response.setDataLoadError(widgetDataResponse.getErrorMessage());
                log.warn("Failed to load data for widget {}: {}", widget.getId(), widgetDataResponse.getErrorMessage());
            }
        } catch (Exception e) {
            response.setDataLoadSuccess(false);
            response.setDataLoadError("Error loading widget data: " + e.getMessage());
            log.error("Error loading data for widget {}: {}", widget.getId(), e.getMessage());
        }
        
        return response;
    }

    public WidgetResponse createWidget(CreateWidgetRequest request, String userId) {
        log.info("Creating widget with name: {} by user: {}", request.getName(), userId);

        Widget widget = new Widget();
        widget.setName(request.getName());
        widget.setDescription(request.getDescription());
        widget.setChartType(request.getChartType());
        widget.setDataSource(request.getDataSource());
        widget.setRefreshInterval(request.getRefreshInterval());
        widget.setGroupFields(request.getGroupFields());
        widget.setMeasureFields(request.getMeasureFields());
        widget.setFilterCriteria(request.getFilterCriteria());
        // Prefer searchFields if provided; keep filterCriteria for backward compatibility
        widget.setSearchFields(request.getSearchFields() != null ? request.getSearchFields() : request.getFilterCriteria());
        widget.setWidgetConfig(request.getWidgetConfig());
        widget.setCreatedBy(userId);
        widget.setIsActive(true);

        Widget savedWidget = widgetRepository.save(widget);

        // Send widget configuration to payment service for payment-related widgets
        if ("payment".equalsIgnoreCase(savedWidget.getDataSource()) || "payments".equalsIgnoreCase(savedWidget.getDataSource())) {
            try {
                WidgetConfigRequest widgetConfig = buildWidgetConfigRequest(savedWidget);
                log.info("Built widget configuration for widget '{}': dataSource={}, tableName={}", 
                    savedWidget.getName(), widgetConfig.getDataSource(), widgetConfig.getTableName());
                
                // Call payment service with the widget configuration
                try {
                    var response = paymentAdapter.executeWidgetConfiguration(widgetConfig);
                    log.info("Payment service response for widget '{}': serviceName={}", 
                        savedWidget.getName(), response.get("serviceName"));
                    
                    if (response.containsKey("error")) {
                        log.warn("Payment service execution failed for widget '{}': {}", 
                            savedWidget.getName(), response.get("error"));
                    } else {
                        log.info("Payment service executed successfully for widget '{}'", savedWidget.getName());
                    }
                } catch (Exception e) {
                    log.error("Failed to call payment service for widget '{}': {}", 
                        savedWidget.getName(), e.getMessage());
                    // Don't fail widget creation if payment service is down
                }
                
            } catch (Exception e) {
                log.warn("Failed to build widget configuration for widget '{}': {}", savedWidget.getName(), e.getMessage());
            }
        }

        return dashboardMapper.toWidgetResponse(savedWidget);
    }

    public WidgetResponse updateWidget(Long widgetId, UpdateWidgetRequest request, String userId) {
        log.info("Updating widget id: {} by user: {}", widgetId, userId);

        Widget widget = widgetRepository.findByIdAndIsActiveTrue(widgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Widget not found with id: " + widgetId));

        // Check if user has permission to update (owner or dashboard editor)
        if (!widget.getCreatedBy().equals(userId)) {
            // Additional permission check can be added here based on dashboard permissions
            log.warn("User {} attempting to update widget {} created by {}", userId, widgetId, widget.getCreatedBy());
        }

        widget.setName(request.getName());
        widget.setDescription(request.getDescription());
        widget.setChartType(request.getChartType());
        widget.setDataSource(request.getDataSource());
        widget.setRefreshInterval(request.getRefreshInterval());
        widget.setGroupFields(request.getGroupFields());
        widget.setMeasureFields(request.getMeasureFields());
        widget.setFilterCriteria(request.getFilterCriteria());
        // Prefer searchFields if provided; otherwise keep previous or fallback to filterCriteria
        if (request.getSearchFields() != null) {
            widget.setSearchFields(request.getSearchFields());
        } else if (request.getFilterCriteria() != null) {
            widget.setSearchFields(request.getFilterCriteria());
        }
        widget.setWidgetConfig(request.getWidgetConfig());
        widget.setUpdatedBy(userId);

        Widget updatedWidget = widgetRepository.save(widget);

        // Send updated widget configuration to payment service for payment-related widgets
        if ("payment".equalsIgnoreCase(updatedWidget.getDataSource()) || "payments".equalsIgnoreCase(updatedWidget.getDataSource())) {
            try {
                WidgetConfigRequest widgetConfig = buildWidgetConfigRequest(updatedWidget);
                log.info("Built updated widget configuration for widget '{}': dataSource={}, tableName={}", 
                    updatedWidget.getName(), widgetConfig.getDataSource(), widgetConfig.getTableName());
                
                // Call payment service with the updated widget configuration
                try {
                    var response = paymentAdapter.executeWidgetConfiguration(widgetConfig);
                    log.info("Payment service response for updated widget '{}': serviceName={}", 
                        updatedWidget.getName(), response.get("serviceName"));
                    
                    if (response.containsKey("error")) {
                        log.warn("Payment service execution failed for updated widget '{}': {}", 
                            updatedWidget.getName(), response.get("error"));
                    } else {
                        log.info("Payment service executed successfully for updated widget '{}'", updatedWidget.getName());
                    }
                } catch (Exception e) {
                    log.error("Failed to call payment service for updated widget '{}': {}", 
                        updatedWidget.getName(), e.getMessage());
                    // Don't fail widget update if payment service is down
                }
                
            } catch (Exception e) {
                log.warn("Failed to build widget configuration for updated widget '{}': {}", updatedWidget.getName(), e.getMessage());
            }
        }

        return dashboardMapper.toWidgetResponse(updatedWidget);
    }

    public void deleteWidget(Long widgetId, String userId) {
        log.info("Deleting widget id: {} by user: {}", widgetId, userId);

        Widget widget = widgetRepository.findByIdAndIsActiveTrue(widgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Widget not found with id: " + widgetId));

        // Check if user has permission to delete (owner only for now)
        if (!widget.getCreatedBy().equals(userId)) {
            throw new IllegalStateException("Only the widget creator can delete this widget");
        }

        // Check if widget is being used in any dashboard
        List<DashboardWidget> dashboardWidgets =
                dashboardWidgetRepository.findByWidgetIdAndIsActiveTrue(widgetId);
        if (!dashboardWidgets.isEmpty()) {
            throw new IllegalStateException("Widget cannot be deleted as it is being used in " +
                    dashboardWidgets.size() + " dashboard(s)");
        }

        // Soft delete - set isActive to false
        widget.setIsActive(false);
        widget.setUpdatedBy(userId);
        widgetRepository.save(widget);

        log.info("Widget {} soft deleted successfully", widgetId);
    }

    public List<WidgetResponse> getWidgetsByChartType(Widget.ChartType chartType) {
        log.info("Getting widgets by chart type: {}", chartType);

        List<Widget> widgets = widgetRepository.findByChartTypeAndIsActiveTrue(chartType);

        return widgets.stream()
                .map(dashboardMapper::toWidgetResponse)
                .collect(Collectors.toList());
    }

    public List<WidgetResponse> getWidgetsByDataSource(String dataSource) {
        log.info("Getting widgets by data source: {}", dataSource);

        List<Widget> widgets = widgetRepository.findByDataSourceAndIsActiveTrue(dataSource);

        return widgets.stream()
                .map(dashboardMapper::toWidgetResponse)
                .collect(Collectors.toList());
    }

    public List<WidgetResponse> searchWidgetsByName(String name) {
        log.info("Searching widgets by name: {}", name);

        List<Widget> widgets = widgetRepository.findByNameContainingIgnoreCaseAndIsActiveTrue(name);

        return widgets.stream()
                .map(dashboardMapper::toWidgetResponse)
                .collect(Collectors.toList());
    }

    public List<WidgetResponse> getWidgetsByCreatedBy(String userId) {
        log.info("Getting widgets created by user: {}", userId);

        List<Widget> widgets = widgetRepository.findByCreatedByAndIsActiveTrue(userId);

        return widgets.stream()
                .map(dashboardMapper::toWidgetResponse)
                .collect(Collectors.toList());
    }

    /**
     * Helper method to get widget data for a specific widget entity
     */
    private WidgetDataResponse getWidgetDataForWidget(Widget widget) {
        WidgetDataRequest request = new WidgetDataRequest();
        request.setWidgetId(widget.getId());
        request.setDataSource(widget.getDataSource());
        request.setGroupFields(widget.getGroupFields());
        request.setMeasureFields(widget.getMeasureFields());
        request.setSearchFields(widget.getSearchFields() != null ? widget.getSearchFields() : widget.getFilterCriteria());
        
        return getWidgetData(request);
    }

    /**
     * Gets widget data by delegating to the appropriate data source controller
     */
    public WidgetDataResponse getWidgetData(WidgetDataRequest request) {
        log.info("Getting widget data for widget: {} with data source: {}",
                request.getWidgetId(), request.getDataSource());

        try {
            // Get widget configuration
            Widget widget = null;
            if (request.getWidgetId() != null) {
                widget = widgetRepository.findByIdAndIsActiveTrue(request.getWidgetId())
                        .orElse(null);
            }

            // If widget is found, use its configuration to supplement the request
            if (widget != null) {
                if (request.getDataSource() == null) {
                    request.setDataSource(widget.getDataSource());
                }
                if (request.getGroupFields() == null) {
                    request.setGroupFields(widget.getGroupFields());
                }
                if (request.getMeasureFields() == null) {
                    request.setMeasureFields(widget.getMeasureFields());
                }
                if (request.getSearchFields() == null) {
                    request.setSearchFields(widget.getSearchFields() != null ? widget.getSearchFields() : widget.getFilterCriteria());
                }
            }

            // Determine which data source controller to use based on data source
            String dataSource = request.getDataSource();
            if (dataSource == null) {
                return WidgetDataResponse.error(request.getWidgetId(), null,
                        "Data source not specified");
            }

            // Route to appropriate service based on data source
            switch (dataSource.toLowerCase()) {
                case "payment":
                case "payments":
                    request.setAppCode("finzly.payment");
                    return paymentDashboardService.execute(request);

                case "bulkfile":
                case "bulk_file":
                    // TODO: Implement BulkFileDashboardService when needed
                    return WidgetDataResponse.error(request.getWidgetId(), dataSource,
                            "BulkFile data source not yet implemented");

                case "ledger":
                case "accounting":
                    // TODO: Implement LedgerDashboardService when needed  
                    return WidgetDataResponse.error(request.getWidgetId(), dataSource,
                            "Ledger data source not yet implemented");

                case "crm":
                case "legalentity":
                    // TODO: Implement CrmDashboardService when needed
                    return WidgetDataResponse.error(request.getWidgetId(), dataSource,
                            "CRM data source not yet implemented");

                default:
                    return WidgetDataResponse.error(request.getWidgetId(), dataSource,
                            "Unsupported data source: " + dataSource);
            }

        } catch (Exception e) {
            log.error("Error getting widget data for widget: {}", request.getWidgetId(), e);
            return WidgetDataResponse.error(request.getWidgetId(), request.getDataSource(),
                    "Error processing widget data: " + e.getMessage());
        }
    }

    public List<WidgetLibraryResponse> getWidgetLibrary(String userId, String departmentId, Long dashboardId) {
        log.info("Getting widget library for user: {} and dashboard: {}", userId, dashboardId);

        // Get all visible widgets
        List<Widget> widgets = widgetRepository.findVisibleWidgets(userId, departmentId);

        // Get current dashboard if specified
        Dashboard currentDashboard = null;
        List<Long> currentDashboardWidgetIds = List.of();
        if (dashboardId != null) {
            try {
                currentDashboard = dashboardRepository.findByIdAndIsActiveTrue(dashboardId).orElse(null);
                if (currentDashboard != null) {
                                    currentDashboardWidgetIds = dashboardWidgetRepository
                        .findByDashboardIdAndIsActiveTrue(dashboardId)
                        .stream()
                        .map(dw -> dw.getWidget().getId())
                        .collect(Collectors.toList());
                }
            } catch (Exception e) {
                log.warn("Error loading dashboard {}: {}", dashboardId, e.getMessage());
            }
        }

        final List<Long> finalCurrentDashboardWidgetIds = currentDashboardWidgetIds;
        final Dashboard finalCurrentDashboard = currentDashboard;

        return widgets.stream()
                .map(widget -> {
                    // Get usage information for this widget
                    List<DashboardWidget> usages = dashboardWidgetRepository
                            .findByWidgetIdAndIsActiveTrue(widget.getId());

                    List<WidgetLibraryResponse.DashboardUsageInfo> usageInfo = usages.stream()
                            .map(dw -> WidgetLibraryResponse.DashboardUsageInfo.builder()
                                    .dashboardId(dw.getDashboard().getId())
                                    .dashboardName(dw.getDashboard().getName())
                                    .dashboardDescription(dw.getDashboard().getDescription())
                                    .isCurrentDashboard(finalCurrentDashboard != null &&
                                            dw.getDashboard().getId().equals(finalCurrentDashboard.getId()))
                                    .build())
                            .collect(Collectors.toList());

                    boolean isInCurrentDashboard = finalCurrentDashboardWidgetIds.contains(widget.getId());
                    boolean isInUse = !usages.isEmpty();

                    return WidgetLibraryResponse.builder()
                            .id(widget.getId())
                            .name(widget.getName())
                            .description(widget.getDescription())
                            .chartType(widget.getChartType())
                            .dataSource(widget.getDataSource())
                            .refreshInterval(widget.getRefreshInterval())
                            .createdBy(widget.getCreatedBy())
                            .createdDateTime(widget.getCreatedDateTime())
                            .updatedDateTime(widget.getUpdatedDateTime())
                            .usageCount(usages.size())
                            .isInUse(isInUse)
                            .isInCurrentDashboard(isInCurrentDashboard)
                            .usedInDashboards(usageInfo)
                            .build();
                })
                .collect(Collectors.toList());
    }


    public String buildSqlQuery(WidgetDTO widgetDTO) {
        StringBuilder queryBuilder = new StringBuilder("SELECT ");

        // 1. SELECT and AGGREGATION fields
        JsonNode measureFields = widgetDTO.getMeasureFields();
        JsonNode groupFields = widgetDTO.getGroupFields();

        if (groupFields != null && groupFields.isArray()) {
            for (JsonNode field : groupFields) {
                queryBuilder.append(field.asText()).append(", ");
            }
        }

        if (measureFields != null && measureFields.isArray()) {
            for (JsonNode measure : measureFields) {
                String field = measure.get("field").asText();
                String aggregation = measure.get("aggregation").asText();
                queryBuilder.append(aggregation).append("(").append(field).append(") AS ").append(aggregation.toLowerCase()).append("_").append(field).append(", ");
            }
        }

        // Remove trailing ", "
        queryBuilder.setLength(queryBuilder.length() - 2);

        // 2. FROM clause
        queryBuilder.append(" FROM ").append(widgetDTO.getDataSourceId());

        // 3. WHERE clause
        JsonNode searchFields = widgetDTO.getSearchFields();
        if (searchFields != null && searchFields.isArray() && searchFields.size() > 0) {
            queryBuilder.append(" WHERE ");
            for (int i = 0; i < searchFields.size(); i++) {
                JsonNode rule = searchFields.get(i);
                String operator = rule.get("operator").asText();
                String fieldName = rule.get("fieldName").asText();
                String fieldValue = rule.get("fieldValue").asText();

                // Map operator to SQL syntax
                String sqlOperator = "";
                switch (operator.toUpperCase()) {
                    case "EQUALS":
                        sqlOperator = "=";
                        break;
                    case "NOT_EQUALS":
                        sqlOperator = "<>";
                        break;
                    case "GREATER_THAN":
                        sqlOperator = ">";
                        break;
                    case "LESS_THAN":
                        sqlOperator = "<";
                        break;
                    case "GREATER_THAN_OR_EQUALS":
                        sqlOperator = ">=";
                        break;
                    case "LESS_THAN_OR_EQUALS":
                        sqlOperator = "<=";
                        break;
                    default:
                        sqlOperator = "="; // Default to equals
                }

                queryBuilder.append(fieldName).append(" ").append(sqlOperator).append(" '").append(fieldValue).append("'");

                if (i < searchFields.size() - 1) {
                    queryBuilder.append(" AND ");
                }
            }
        }

        // 4. GROUP BY clause
        if (groupFields != null && groupFields.isArray() && groupFields.size() > 0) {
            queryBuilder.append(" GROUP BY ");
            for (JsonNode field : groupFields) {
                queryBuilder.append(field.asText()).append(", ");
            }
            // Remove trailing ", "
            queryBuilder.setLength(queryBuilder.length() - 2);
        }

        // 5. ORDER BY and LIMIT clauses (optional)
        Integer limit = widgetDTO.getLimit();
        if (limit != null && limit > 0) {
            queryBuilder.append(" LIMIT ").append(limit);
        }

        return queryBuilder.toString();
    }

    /**
     * Check if payment service is available
     * @return true if payment service is available, false otherwise
     */
    public boolean isPaymentServiceAvailable() {
        return paymentAdapter.isPaymentServiceAvailable();
    }

    /**
     * Test method to manually trigger payment service call with widget configuration
     * @param widgetId The widget ID to test
     * @return Response message from payment service
     */
    public String testPaymentServiceCall(Long widgetId) {
        log.info("Testing payment service call with widget ID: {}", widgetId);
        
        try {
            Widget widget = widgetRepository.findByIdAndIsActiveTrue(widgetId)
                    .orElseThrow(() -> new ResourceNotFoundException("Widget not found with id: " + widgetId));
            
            WidgetConfigRequest widgetConfig = buildWidgetConfigRequest(widget);
            var response = paymentAdapter.executeWidgetConfiguration(widgetConfig);
            
            if (response.containsKey("error")) {
                return "Payment service execution failed. Error: " + response.get("error");
            } else {
                return "Payment service executed successfully. Service: " + response.get("serviceName");
            }
        } catch (Exception e) {
            log.error("Error testing payment service call for widget: {}", widgetId, e);
            return "Error testing payment service: " + e.getMessage();
        }
    }

    /**
     * Helper method to build WidgetConfigRequest from Widget entity
     * @param widget The widget entity
     * @return WidgetConfigRequest with datasource configuration
     */
    private WidgetConfigRequest buildWidgetConfigRequest(Widget widget) {
        log.debug("Building widget configuration request for widget: {}", widget.getName());
        
        // Get datasource configuration based on widget's data source
        DashboardDatasourceConfig datasourceConfig = datasourceConfigRepository
                .findByName(widget.getDataSource())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Datasource configuration not found for: " + widget.getDataSource()));
        
        return WidgetConfigRequest.builder()
                .widgetId(widget.getId())
                .widgetName(widget.getName())
                .dataSource(widget.getDataSource())
                .appCode(datasourceConfig.getAppCode())
                .tableName(datasourceConfig.getTableName())
                .groupFields(widget.getGroupFields())
                .measureFields(widget.getMeasureFields())
                .searchFields(widget.getSearchFields() != null ? widget.getSearchFields() : widget.getFilterCriteria())
                .chartType(widget.getChartType() != null ? widget.getChartType().name() : null)
                .refreshInterval(widget.getRefreshInterval())
                .widgetConfig(widget.getWidgetConfig())
                .build();
    }
}
