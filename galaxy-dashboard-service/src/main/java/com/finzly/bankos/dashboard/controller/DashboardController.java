package com.finzly.bankos.dashboard.controller;

import com.finzly.bankos.dashboard.dto.request.AddWidgetToDashboardRequest;
import com.finzly.bankos.dashboard.dto.request.CreateDashboardRequest;
import com.finzly.bankos.dashboard.dto.request.UpdateDashboardRequest;
import com.finzly.bankos.dashboard.dto.request.UpdateDashboardWidgetLayoutRequest;
import com.finzly.bankos.dashboard.dto.response.*;
import com.finzly.bankos.dashboard.service.DashboardService;
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

@RestController
@RequestMapping("/portal/dashboards")
@RequiredArgsConstructor
@CrossOrigin
public class DashboardController {

    private static final Logger log = LoggerFactory.getLogger(DashboardController.class);
    private final DashboardService dashboardService;

    // 1. GET /portal/dashboards - Retrieves list of dashboards visible to the logged-in user
    @GetMapping
    public ResponseEntity<ApiResponse<List<DashboardSummaryResponse>>> getAllDashboards(
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("GET /portal/dashboards called by user: {}", userId);
        
        List<DashboardSummaryResponse> dashboards = dashboardService.getAllDashboards(userId, departmentId);
        
        return ResponseEntity.ok(ApiResponse.success("Dashboards retrieved successfully", dashboards));
    }

    // 2. GET /portal/dashboards/{id} - Returns detailed metadata of a specific dashboard
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboardById(
            @PathVariable Long id,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("GET /portal/dashboards/{} called by user: {}", id, userId);
        
        DashboardResponse dashboard = dashboardService.getDashboardById(id, userId, departmentId);
        
        return ResponseEntity.ok(ApiResponse.success("Dashboard fetched successfully", dashboard));
    }

    // 3. POST /portal/dashboards - Creates a new dashboard
    @PostMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> createDashboard(
            @Valid @RequestBody CreateDashboardRequest request,
            @RequestParam(name = "userId") String userId) {
        
        log.info("POST /portal/dashboards called by user: {}", userId);
        
        DashboardResponse dashboard = dashboardService.createDashboard(request, userId);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Dashboard created successfully", dashboard));
    }

    // 4. PUT /portal/dashboards/{id} - Updates dashboard configuration
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DashboardResponse>> updateDashboard(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDashboardRequest request,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("PUT /portal/dashboards/{} called by user: {}", id, userId);
        
        DashboardResponse dashboard = dashboardService.updateDashboard(id, request, userId, departmentId);
        
        return ResponseEntity.ok(ApiResponse.success("Dashboard updated successfully", dashboard));
    }

    // 5. POST /portal/dashboards/{id}/publish - Publishes a draft dashboard
    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<DashboardResponse>> publishDashboard(
            @PathVariable Long id,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("POST /portal/dashboards/{}/publish called by user: {}", id, userId);
        
        DashboardResponse dashboard = dashboardService.publishDashboard(id, userId, departmentId);
        
        return ResponseEntity.ok(ApiResponse.success("Dashboard published successfully", dashboard));
    }

    // 6. POST /portal/dashboards/{id}/default - Sets dashboard as default
    @PostMapping("/{id}/default")
    public ResponseEntity<ApiResponse<Void>> setDefaultDashboard(
            @PathVariable Long id,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("POST /portal/dashboards/{}/default called by user: {}", id, userId);
        
        dashboardService.setAsDefaultDashboard(id, userId, departmentId);
        
        return ResponseEntity.ok(ApiResponse.success("Dashboard set as default successfully", null));
    }

    // 7. DELETE /portal/dashboards/{id} - Deletes a dashboard
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDashboard(
            @PathVariable Long id,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("DELETE /portal/dashboards/{} called by user: {}", id, userId);
        
        dashboardService.deleteDashboard(id, userId, departmentId);
        
        return ResponseEntity.ok(ApiResponse.success("Dashboard deleted successfully", null));
    }

    // 12. GET /portal/dashboards/{dashboardId}/widgets - Fetches ordered list of widgets
    @GetMapping("/{dashboardId}/widgets")
    public ResponseEntity<ApiResponse<List<DashboardWidgetResponse>>> getDashboardWidgets(
            @PathVariable("dashboardId") Long dashboardId,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("GET /portal/dashboards/{}/widgets called by user: {}", dashboardId, userId);
        
        List<DashboardWidgetResponse> widgets = dashboardService.getDashboardWidgets(dashboardId, userId, departmentId);
        
        return ResponseEntity.ok(ApiResponse.success("Dashboard widgets retrieved successfully", widgets));
    }

    // Add widget to dashboard (not explicitly mentioned in API list but needed)
    @PostMapping("/{dashboardId}/widgets")
    public ResponseEntity<ApiResponse<DashboardWidgetResponse>> addWidgetToDashboard(
            @PathVariable Long dashboardId,
            @Valid @RequestBody AddWidgetToDashboardRequest request,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("POST /portal/dashboards/{}/widgets called by user: {}", dashboardId, userId);
        
        DashboardWidgetResponse dashboardWidget = dashboardService.addWidgetToDashboard(dashboardId, request, userId, departmentId);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Widget added to dashboard successfully", dashboardWidget));
    }

    // Remove widget from dashboard
    @DeleteMapping("/{dashboardId}/widgets/{dashboardWidgetId}")
    public ResponseEntity<ApiResponse<Void>> removeWidgetFromDashboard(
            @PathVariable String dashboardId,
            @PathVariable Long dashboardWidgetId,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        
        log.info("DELETE /portal/dashboards/{}/widgets/{} called by user: {}", dashboardId, dashboardWidgetId, userId);
        
        dashboardService.removeWidgetFromDashboard(dashboardId, dashboardWidgetId, userId, departmentId);
        
        return ResponseEntity.ok(ApiResponse.success("Widget removed from dashboard successfully", null));
    }

    // Update widget layout (position/size/order)
    @PutMapping("/{dashboardId}/widgets/{dashboardWidgetId}/layout")
    public ResponseEntity<ApiResponse<DashboardWidgetResponse>> updateWidgetLayout(
            @PathVariable String dashboardId,
            @PathVariable Long dashboardWidgetId,
            @Valid @RequestBody UpdateDashboardWidgetLayoutRequest request,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "departmentId", required = false) String departmentId) {
        log.info("PUT /portal/dashboards/{}/widgets/{}/layout called by user: {}", dashboardId, dashboardWidgetId, userId);

        DashboardWidgetResponse updated = dashboardService.updateDashboardWidgetLayout(
                dashboardId, dashboardWidgetId, request, userId, departmentId);

        return ResponseEntity.ok(ApiResponse.success("Widget layout updated successfully", updated));
    }
}
