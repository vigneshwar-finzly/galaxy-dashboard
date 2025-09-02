package com.finzly.bankos.dashboard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finzly.bankos.dashboard.dto.response.ChartConfigResponse;
import com.finzly.bankos.dashboard.dto.response.DashboardDatasourceConfigResponse;
import com.finzly.bankos.dashboard.dto.response.WidgetCreationConfigResponse;
import com.finzly.bankos.dashboard.entity.ChartConfig;
import com.finzly.bankos.dashboard.entity.DashboardDatasourceConfig;
import com.finzly.bankos.dashboard.entity.Queue;
import com.finzly.bankos.dashboard.exception.ResourceNotFoundException;
import com.finzly.bankos.dashboard.mapper.DashboardMapper;
import com.finzly.bankos.dashboard.repository.ChartConfigRepository;
import com.finzly.bankos.dashboard.repository.DashboardDatasourceConfigRepository;
import com.finzly.bankos.dashboard.repository.QueueRepository;
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
@Transactional(readOnly = true)
public class ConfigurationService {

    private static final Logger log = LoggerFactory.getLogger(ConfigurationService.class);

    private final ChartConfigRepository chartConfigRepository;
    private final DashboardDatasourceConfigRepository datasourceConfigRepository;
    private final QueueRepository queueRepository;
    private final DashboardMapper dashboardMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WidgetCreationConfigResponse getWidgetCreationConfig() {
        log.info("Getting widget creation configuration");
        
        // Get all chart configurations
        List<ChartConfigResponse> allCharts = getAllChartConfigs();
        
        // Get all datasource configurations
        List<DashboardDatasourceConfig> allDatasources = datasourceConfigRepository.findAll();
        
        // Group datasources by app code
        Map<String, List<DashboardDatasourceConfig>> datasourcesByApp = allDatasources.stream()
                .collect(Collectors.groupingBy(DashboardDatasourceConfig::getAppCode));
        
        // Build the response
        List<WidgetCreationConfigResponse.DataSourceWithCharts> dataSourcesWithCharts = datasourcesByApp.entrySet().stream()
                .map(entry -> {
                    String appCode = entry.getKey();
                    List<DashboardDatasourceConfig> configs = entry.getValue();
                    
                    List<WidgetCreationConfigResponse.DataSourceConfig> datasourceConfigs = configs.stream()
                            .map(this::mapToDataSourceConfig)
                            .collect(Collectors.toList());
                    
                    return new WidgetCreationConfigResponse.DataSourceWithCharts(
                            appCode, 
                            datasourceConfigs, 
                            allCharts
                    );
                })
                .collect(Collectors.toList());
        
        return new WidgetCreationConfigResponse(dataSourcesWithCharts);
    }
    
    private WidgetCreationConfigResponse.DataSourceConfig mapToDataSourceConfig(DashboardDatasourceConfig config) {
        return new WidgetCreationConfigResponse.DataSourceConfig(
                config.getName(),
                config.getDescription(),
                parseSearchFields(config.getSearchFields()),
                parseGroupFields(config.getGroupFields()),
                parseMeasureFields(config.getMeasureFields())
        );
    }
    
    private List<WidgetCreationConfigResponse.SearchField> parseSearchFields(String searchFieldsJson) {
        if (searchFieldsJson == null || searchFieldsJson.trim().isEmpty()) {
            return List.of();
        }
        
        try {
            return objectMapper.readValue(searchFieldsJson, new TypeReference<List<WidgetCreationConfigResponse.SearchField>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse search fields JSON: {}", searchFieldsJson, e);
            return List.of();
        }
    }
    
    private List<WidgetCreationConfigResponse.GroupField> parseGroupFields(String groupFieldsJson) {
        if (groupFieldsJson == null || groupFieldsJson.trim().isEmpty()) {
            return List.of();
        }
        
        try {
            return objectMapper.readValue(groupFieldsJson, new TypeReference<List<WidgetCreationConfigResponse.GroupField>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse group fields JSON: {}", groupFieldsJson, e);
            return List.of();
        }
    }
    
    private List<WidgetCreationConfigResponse.MeasureField> parseMeasureFields(String measureFieldsJson) {
        if (measureFieldsJson == null || measureFieldsJson.trim().isEmpty()) {
            return List.of();
        }
        
        try {
            return objectMapper.readValue(measureFieldsJson, new TypeReference<List<WidgetCreationConfigResponse.MeasureField>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse measure fields JSON: {}", measureFieldsJson, e);
            return List.of();
        }
    }

    public List<ChartConfigResponse> getAllChartConfigs() {
        log.info("Getting all chart configurations");
        
        List<ChartConfig> chartConfigs = chartConfigRepository.findByIsActiveTrue();
        
        return chartConfigs.stream()
                .map(dashboardMapper::toChartConfigResponse)
                .collect(Collectors.toList());
    }

    public ChartConfigResponse getChartConfigByType(ChartConfig.ChartType chartType) {
        log.info("Getting chart configuration for type: {}", chartType);
        
        ChartConfig chartConfig = chartConfigRepository.findByChartTypeAndIsActiveTrue(chartType)
                .orElseThrow(() -> new ResourceNotFoundException("Chart configuration not found for type: " + chartType));
        
        return dashboardMapper.toChartConfigResponse(chartConfig);
    }

    public List<DashboardDatasourceConfigResponse> getAllDatasourceConfigs() {
        log.info("Getting all datasource configurations");
        
        List<DashboardDatasourceConfig> configs = datasourceConfigRepository.findAll();
        
        return configs.stream()
                .map(dashboardMapper::toDatasourceConfigResponse)
                .collect(Collectors.toList());
    }

    public List<DashboardDatasourceConfigResponse> getDatasourceConfigsByAppCode(String appCode) {
        log.info("Getting datasource configurations for app code: {}", appCode);
        
        List<DashboardDatasourceConfig> configs = datasourceConfigRepository.findByAppCode(appCode);
        
        return configs.stream()
                .map(dashboardMapper::toDatasourceConfigResponse)
                .collect(Collectors.toList());
    }

    public DashboardDatasourceConfigResponse getDatasourceConfig(String appCode, String dataSourceName) {
        log.info("Getting datasource configuration for app code: {} and data source: {}", appCode, dataSourceName);
        
        DashboardDatasourceConfig config = datasourceConfigRepository
                .findByAppCodeAndName(appCode, dataSourceName)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Datasource configuration not found for app code: " + appCode + " and data source: " + dataSourceName));
        
        return dashboardMapper.toDatasourceConfigResponse(config);
    }

    public List<Queue> getAllQueues() {
        log.info("Getting all queues");
        
        return queueRepository.findByIsActiveTrueOrderByPriorityDescQueueNameAsc();
    }

    public List<Queue> getQueuesByAppCode(String appCode) {
        log.info("Getting queues for app code: {}", appCode);
        
        return queueRepository.findByAppCodeAndIsActiveTrue(appCode);
    }

    public List<Queue> getQueuesByType(Queue.QueueType queueType) {
        log.info("Getting queues for type: {}", queueType);
        
        return queueRepository.findByQueueTypeAndIsActiveTrue(queueType);
    }

    public Queue getQueueByCode(String queueCode) {
        log.info("Getting queue by code: {}", queueCode);
        
        return queueRepository.findByQueueCodeAndIsActiveTrue(queueCode)
                .orElseThrow(() -> new ResourceNotFoundException("Queue not found with code: " + queueCode));
    }
}
