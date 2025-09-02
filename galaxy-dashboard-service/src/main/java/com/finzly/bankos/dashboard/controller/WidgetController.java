package com.finzly.bankos.dashboard.controller;

import com.finzly.bankos.dashboard.dto.WidgetDTO;
import com.finzly.bankos.dashboard.dto.request.CreateWidgetRequest;
import com.finzly.bankos.dashboard.dto.request.UpdateWidgetRequest;
import com.finzly.bankos.dashboard.dto.request.WidgetDataRequest;
import com.finzly.bankos.dashboard.dto.response.ApiResponse;
import com.finzly.bankos.dashboard.dto.response.WidgetDataResponse;
import com.finzly.bankos.dashboard.dto.response.WidgetLibraryResponse;
import com.finzly.bankos.dashboard.dto.response.WidgetResponse;
import com.finzly.bankos.dashboard.entity.Widget;
import com.finzly.bankos.dashboard.service.WidgetService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/portal/widgets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WidgetController {

    private static final Logger log = LoggerFactory.getLogger(WidgetController.class);
    private final WidgetService widgetService;


    // 8. POST /portal/widgets - Creates a new widget
    @PostMapping
    public ResponseEntity<ApiResponse<WidgetResponse>> createWidget(
            @Valid @RequestBody CreateWidgetRequest request,
            @RequestParam(name = "userId") String userId) {
        
        log.info("POST /portal/widgets called by user: {}", userId);
        
        WidgetResponse widget = widgetService.createWidget(request, userId);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Widget created successfully", widget));
    }

    // 9. PUT /portal/widgets/{id} - Updates widget configuration
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WidgetResponse>> updateWidget(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWidgetRequest request,
            @RequestParam(name = "userId") String userId) {
        
        log.info("PUT /portal/widgets/{} called by user: {}", id, userId);
        
        WidgetResponse widget = widgetService.updateWidget(id, request, userId);
        
        return ResponseEntity.ok(ApiResponse.success("Widget updated successfully", widget));
    }

    // 10. DELETE /portal/widgets/{id} - Deletes a widget
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteWidget(
            @PathVariable Long id,
            @RequestParam(name = "userId") String userId) {
        
        log.info("DELETE /portal/widgets/{} called by user: {}", id, userId);
        
        widgetService.deleteWidget(id, userId);
        
        return ResponseEntity.ok(ApiResponse.success("Widget deleted successfully", null));
    }

    // 11. GET /portal/widgets/{id} - Retrieves detailed configuration of a widget
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WidgetResponse>> getWidgetById(@PathVariable Long id) {
        
        log.info("GET /portal/widgets/{} called", id);
        
        WidgetResponse widget = widgetService.getWidgetById(id);
        
        return ResponseEntity.ok(ApiResponse.success("Widget retrieved successfully", widget));
    }

    // 13. GET /portal/widgets - Returns list of all widgets visible to the user
    @GetMapping
    public ResponseEntity<ApiResponse<List<WidgetResponse>>> getAllWidgets(
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("GET /portal/widgets called by user: {}", userId);
        
        List<WidgetResponse> widgets = widgetService.getAllWidgets(userId, departmentId);
        
        return ResponseEntity.ok(ApiResponse.success("Widgets retrieved successfully", widgets));
    }

    // Additional endpoints for better functionality
    @GetMapping("/by-chart-type")
    public ResponseEntity<ApiResponse<List<WidgetResponse>>> getWidgetsByChartType(
            @RequestParam(name = "chartType") Widget.ChartType chartType) {
        
        log.info("GET /portal/widgets/by-chart-type called with chartType: {}", chartType);
        
        List<WidgetResponse> widgets = widgetService.getWidgetsByChartType(chartType);
        
        return ResponseEntity.ok(ApiResponse.success("Widgets retrieved by chart type successfully", widgets));
    }

    @GetMapping("/by-data-source")
    public ResponseEntity<ApiResponse<List<WidgetResponse>>> getWidgetsByDataSource(
            @RequestParam(name = "dataSource") String dataSource) {
        
        log.info("GET /portal/widgets/by-data-source called with dataSource: {}", dataSource);
        
        List<WidgetResponse> widgets = widgetService.getWidgetsByDataSource(dataSource);
        
        return ResponseEntity.ok(ApiResponse.success("Widgets retrieved by data source successfully", widgets));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<WidgetResponse>>> searchWidgetsByName(
            @RequestParam(name = "name") String name) {
        
        log.info("GET /portal/widgets/search called with name: {}", name);
        
        List<WidgetResponse> widgets = widgetService.searchWidgetsByName(name);
        
        return ResponseEntity.ok(ApiResponse.success("Widgets searched successfully", widgets));
    }

    @GetMapping("/my-widgets")
    public ResponseEntity<ApiResponse<List<WidgetResponse>>> getMyWidgets(
            @RequestParam(name = "userId") String userId) {
        
        log.info("GET /portal/widgets/my-widgets called by user: {}", userId);
        
        List<WidgetResponse> widgets = widgetService.getWidgetsByCreatedBy(userId);
        
        return ResponseEntity.ok(ApiResponse.success("User widgets retrieved successfully", widgets));
    }

    // 14. /{internal-url}/widgets/data - Returns widget data based on search criteria
    @PostMapping("/data")
    public ResponseEntity<WidgetDataResponse> getWidgetData(
            @Valid @RequestBody WidgetDataRequest request) {
        
        log.info("POST /portal/widgets/data called for widget: {}", request.getWidgetId());
        
        WidgetDataResponse response = widgetService.getWidgetData(request);
        
        return ResponseEntity.ok(response);
    }

    // Widget Library endpoint - Returns widgets with usage information
    @GetMapping("/library")
    public ResponseEntity<ApiResponse<List<WidgetLibraryResponse>>> getWidgetLibrary(
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId,
            @RequestParam(name = "dashboardId", required = false) Long dashboardId) {
        
        log.info("GET /portal/widgets/library called by user: {} for dashboard: {}", userId, dashboardId);
        
        List<WidgetLibraryResponse> widgets = widgetService.getWidgetLibrary(userId, departmentId, dashboardId);
        
        return ResponseEntity.ok(ApiResponse.success("Widget library retrieved successfully", widgets));
    }


    @PostMapping("/generate-query")
    public ResponseEntity<String> generateSqlQuery(@RequestBody WidgetDTO widgetDTO) {
        // Log the received DTO for debugging
        System.out.println("Received DTO: " + widgetDTO);

        // Call the service method to build the SQL query
        String sqlQuery = widgetService.buildSqlQuery(widgetDTO);

        // Return the generated query string
        return ResponseEntity.ok(sqlQuery);
    }


}
