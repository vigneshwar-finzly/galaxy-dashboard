package com.finzly.bankos.dashboard.controller;

import com.finzly.bankos.dashboard.dto.response.ApiResponse;
import com.finzly.bankos.dashboard.dto.response.ChartConfigResponse;
import com.finzly.bankos.dashboard.dto.response.DashboardDatasourceConfigResponse;
import com.finzly.bankos.dashboard.dto.response.WidgetCreationConfigResponse;
import com.finzly.bankos.dashboard.entity.ChartConfig;
import com.finzly.bankos.dashboard.entity.Queue;
import com.finzly.bankos.dashboard.service.ConfigurationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/portal/config")
@RequiredArgsConstructor
@CrossOrigin
public class ConfigurationController {

    private static final Logger log = LoggerFactory.getLogger(ConfigurationController.class);
    private final ConfigurationService configurationService;

    // Widget Creation Configuration Endpoint
    @GetMapping("/widget-creation-config")
    public ResponseEntity<ApiResponse<WidgetCreationConfigResponse>> getWidgetCreationConfig() {
        log.info("GET /portal/config/widget-creation-config called");
        
        WidgetCreationConfigResponse config = configurationService.getWidgetCreationConfig();
        
        return ResponseEntity.ok(ApiResponse.success("Widget creation configuration retrieved successfully", config));
    }

    // Chart Configuration Endpoints
    @GetMapping("/chart-configs")
    public ResponseEntity<ApiResponse<List<ChartConfigResponse>>> getAllChartConfigs() {
        log.info("GET /portal/config/chart-configs called");
        
        List<ChartConfigResponse> chartConfigs = configurationService.getAllChartConfigs();
        
        return ResponseEntity.ok(ApiResponse.success("Chart configurations retrieved successfully", chartConfigs));
    }

    @GetMapping("/chart-configs/{chartType}")
    public ResponseEntity<ApiResponse<ChartConfigResponse>> getChartConfigByType(
            @PathVariable ChartConfig.ChartType chartType) {
        
        log.info("GET /portal/config/chart-configs/{} called", chartType);
        
        ChartConfigResponse chartConfig = configurationService.getChartConfigByType(chartType);
        
        return ResponseEntity.ok(ApiResponse.success("Chart configuration retrieved successfully", chartConfig));
    }

    // Datasource Configuration Endpoints
    @GetMapping("/datasource-configs")
    public ResponseEntity<ApiResponse<List<DashboardDatasourceConfigResponse>>> getAllDatasourceConfigs() {
        log.info("GET /portal/config/datasource-configs called");
        
        List<DashboardDatasourceConfigResponse> configs = configurationService.getAllDatasourceConfigs();
        
        return ResponseEntity.ok(ApiResponse.success("Datasource configurations retrieved successfully", configs));
    }

    @GetMapping("/datasource-configs/app/{appCode}")
    public ResponseEntity<ApiResponse<List<DashboardDatasourceConfigResponse>>> getDatasourceConfigsByAppCode(
            @PathVariable String appCode) {
        
        log.info("GET /portal/config/datasource-configs/app/{} called", appCode);
        
        List<DashboardDatasourceConfigResponse> configs = configurationService.getDatasourceConfigsByAppCode(appCode);
        
        return ResponseEntity.ok(ApiResponse.success("Datasource configurations retrieved successfully", configs));
    }

    @GetMapping("/datasource-configs/{appCode}/{dataSourceName}")
    public ResponseEntity<ApiResponse<DashboardDatasourceConfigResponse>> getDatasourceConfig(
            @PathVariable String appCode,
            @PathVariable String dataSourceName) {
        
        log.info("GET /portal/config/datasource-configs/{}/{} called", appCode, dataSourceName);
        
        DashboardDatasourceConfigResponse config = configurationService.getDatasourceConfig(appCode, dataSourceName);
        
        return ResponseEntity.ok(ApiResponse.success("Datasource configuration retrieved successfully", config));
    }

    // Queue Configuration Endpoints
    @GetMapping("/queues")
    public ResponseEntity<ApiResponse<List<Queue>>> getAllQueues() {
        log.info("GET /portal/config/queues called");
        
        List<Queue> queues = configurationService.getAllQueues();
        
        return ResponseEntity.ok(ApiResponse.success("Queues retrieved successfully", queues));
    }

    @GetMapping("/queues/app/{appCode}")
    public ResponseEntity<ApiResponse<List<Queue>>> getQueuesByAppCode(@PathVariable String appCode) {
        log.info("GET /portal/config/queues/app/{} called", appCode);
        
        List<Queue> queues = configurationService.getQueuesByAppCode(appCode);
        
        return ResponseEntity.ok(ApiResponse.success("Queues retrieved successfully", queues));
    }

    @GetMapping("/queues/type/{queueType}")
    public ResponseEntity<ApiResponse<List<Queue>>> getQueuesByType(@PathVariable Queue.QueueType queueType) {
        log.info("GET /portal/config/queues/type/{} called", queueType);
        
        List<Queue> queues = configurationService.getQueuesByType(queueType);
        
        return ResponseEntity.ok(ApiResponse.success("Queues retrieved successfully", queues));
    }

    @GetMapping("/queues/{queueCode}")
    public ResponseEntity<ApiResponse<Queue>> getQueueByCode(@PathVariable String queueCode) {
        log.info("GET /portal/config/queues/{} called", queueCode);
        
        Queue queue = configurationService.getQueueByCode(queueCode);
        
        return ResponseEntity.ok(ApiResponse.success("Queue retrieved successfully", queue));
    }
}
