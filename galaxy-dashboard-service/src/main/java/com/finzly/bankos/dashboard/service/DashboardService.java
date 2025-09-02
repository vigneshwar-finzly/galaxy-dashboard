package com.finzly.bankos.dashboard.service;

import com.finzly.bankos.dashboard.dto.request.AddWidgetToDashboardRequest;
import com.finzly.bankos.dashboard.dto.request.CreateDashboardRequest;
import com.finzly.bankos.dashboard.dto.request.UpdateDashboardRequest;
import com.finzly.bankos.dashboard.dto.request.UpdateDashboardWidgetLayoutRequest;
import com.finzly.bankos.dashboard.dto.response.DashboardResponse;
import com.finzly.bankos.dashboard.dto.response.DashboardSummaryResponse;
import com.finzly.bankos.dashboard.dto.response.DashboardWidgetResponse;
import com.finzly.bankos.dashboard.entity.*;
import com.finzly.bankos.dashboard.exception.ResourceNotFoundException;
import com.finzly.bankos.dashboard.exception.UnauthorizedException;
import com.finzly.bankos.dashboard.mapper.DashboardMapper;
import com.finzly.bankos.dashboard.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);

    private final DashboardRepository dashboardRepository;
    private final DashboardUserPermissionRepository permissionRepository;
    private final DashboardWidgetRepository dashboardWidgetRepository;
    private final WidgetRepository widgetRepository;
    private final DashboardMapper dashboardMapper;

    public List<DashboardSummaryResponse> getAllDashboards(String userId, String departmentId) {
        log.info("Getting all dashboards for user: {} and department: {}", userId, departmentId);
        
        List<Dashboard> dashboards = dashboardRepository.findVisibleDashboards(userId, departmentId);
        
        return dashboards.stream()
                .map(dashboard -> {
                                         long widgetCount = dashboardWidgetRepository.countWidgetsByDashboardId(dashboard.getId());
                    return dashboardMapper.toSummaryResponse(dashboard, widgetCount);
                })
                .collect(Collectors.toList());
    }

    public DashboardResponse getDashboardById(Long dashboardId, String userId, String departmentId) {
        log.info("Getting dashboard by id: {} for user: {}", dashboardId, userId);
        
        if (!dashboardRepository.hasViewPermission(dashboardId, userId, departmentId)) {
            throw new UnauthorizedException("User does not have permission to view this dashboard");
        }
        
        Dashboard dashboard = dashboardRepository.findByIdAndIsActiveTrue(dashboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + dashboardId));
        
        // Fetch dashboard widgets
        List<DashboardWidget> dashboardWidgets = dashboardWidgetRepository
                .findByDashboardIdOrderByWidgetOrder(dashboardId);
        dashboard.setDashboardWidgets(dashboardWidgets);
        
        return dashboardMapper.toResponse(dashboard);
    }

    public DashboardResponse createDashboard(CreateDashboardRequest request, String userId) {
        log.info("Creating dashboard with name: {} by user: {}", request.getName(), userId);
        
        Dashboard dashboard = dashboardMapper.toEntity(request, userId);
        Dashboard savedDashboard = dashboardRepository.save(dashboard);
        
        // Create user permissions
        createUserPermissions(savedDashboard, request, userId);
        
        return dashboardMapper.toResponse(savedDashboard);
    }

    public DashboardResponse updateDashboard(Long dashboardId, UpdateDashboardRequest request, String userId, String departmentId) {
        log.info("Updating dashboard id: {} by user: {}", dashboardId, userId);
        
        if (!dashboardRepository.hasEditPermission(dashboardId, userId, departmentId)) {
            throw new UnauthorizedException("User does not have permission to edit this dashboard");
        }
        
        Dashboard dashboard = dashboardRepository.findByIdAndIsActiveTrue(dashboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + dashboardId));
        
        dashboardMapper.updateEntity(dashboard, request, userId);
        Dashboard updatedDashboard = dashboardRepository.save(dashboard);
        
        // Update user permissions
        updateUserPermissions(updatedDashboard, request, userId);
        
        return dashboardMapper.toResponse(updatedDashboard);
    }

    public void deleteDashboard(Long dashboardId, String userId, String departmentId) {
        log.info("Deleting dashboard id: {} by user: {}", dashboardId, userId);
        
        if (!dashboardRepository.hasEditPermission(dashboardId, userId, departmentId)) {
            throw new UnauthorizedException("User does not have permission to delete this dashboard");
        }
        
        Dashboard dashboard = dashboardRepository.findByIdAndIsActiveTrue(dashboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + dashboardId));
        
        // Soft delete - set isActive to false
        dashboard.setIsActive(false);
        dashboard.setUpdatedBy(userId);
        dashboardRepository.save(dashboard);
        
        log.info("Dashboard {} soft deleted successfully", dashboardId);
    }

    public DashboardResponse publishDashboard(Long dashboardId, String userId, String departmentId) {
        log.info("Publishing dashboard id: {} by user: {}", dashboardId, userId);
        
        if (!dashboardRepository.hasEditPermission(dashboardId, userId, departmentId)) {
            throw new UnauthorizedException("User does not have permission to publish this dashboard");
        }
        
        Dashboard dashboard = dashboardRepository.findByIdAndIsActiveTrue(dashboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + dashboardId));
        
        // Check if dashboard has at least one widget
        long widgetCount = dashboardWidgetRepository.countWidgetsByDashboardId(dashboardId);
        if (widgetCount == 0) {
            throw new IllegalStateException("Dashboard must have at least one widget to be published");
        }
        
        dashboard.setStatus(Dashboard.DashboardStatus.PUBLISHED);
        dashboard.setUpdatedBy(userId);
        Dashboard publishedDashboard = dashboardRepository.save(dashboard);
        
        return dashboardMapper.toResponse(publishedDashboard);
    }

    public void setAsDefaultDashboard(Long dashboardId, String userId, String departmentId) {
        log.info("Setting dashboard id: {} as default for user: {}", dashboardId, userId);
        
        if (!dashboardRepository.hasViewPermission(dashboardId, userId, departmentId)) {
            throw new UnauthorizedException("User does not have permission to set this dashboard as default");
        }
        
        Dashboard dashboard = dashboardRepository.findByIdAndIsActiveTrue(dashboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + dashboardId));
        
        // Remove default flag from all user's dashboards
        List<Dashboard> userDashboards = dashboardRepository.findByCreatedByAndIsActiveTrue(userId);
        userDashboards.forEach(d -> d.setIsDefault(false));
        dashboardRepository.saveAll(userDashboards);
        
        // Set this dashboard as default
        dashboard.setIsDefault(true);
        dashboard.setUpdatedBy(userId);
        dashboardRepository.save(dashboard);
        
        log.info("Dashboard {} set as default for user {}", dashboardId, userId);
    }

    public DashboardWidgetResponse addWidgetToDashboard(Long dashboardId, AddWidgetToDashboardRequest request, String userId, String departmentId) {
        log.info("Adding widget {} to dashboard {} by user: {}", request.getWidgetId(), dashboardId, userId);
        // TEMP: Permissions disabled for rapid development
        // if (!dashboardRepository.hasEditPermission(dashboardId, userId, departmentId)) {
        //     throw new UnauthorizedException("User does not have permission to edit this dashboard");
        // }
        
        Dashboard dashboard = dashboardRepository.findByIdAndIsActiveTrue(dashboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + dashboardId));
        
        Widget widget = widgetRepository.findByIdAndIsActiveTrue(request.getWidgetId())
                .orElseThrow(() -> new ResourceNotFoundException("Widget not found with id: " + request.getWidgetId()));
        
        // Check if widget is already added to dashboard
        if (dashboardWidgetRepository.findByDashboardIdAndWidgetIdAndIsActiveTrue(dashboardId, request.getWidgetId()).isPresent()) {
            throw new IllegalStateException("Widget is already added to this dashboard");
        }
        
        // Get next widget order
        Integer maxOrder = dashboardWidgetRepository.findMaxWidgetOrderByDashboardId(dashboardId);
        int nextOrder = (maxOrder != null) ? maxOrder + 1 : 1;
        
        DashboardWidget dashboardWidget = new DashboardWidget();
        dashboardWidget.setDashboard(dashboard);
        dashboardWidget.setWidget(widget);
        dashboardWidget.setPositionX(request.getPositionX());
        dashboardWidget.setPositionY(request.getPositionY());
        dashboardWidget.setWidth(request.getWidth());
        dashboardWidget.setHeight(request.getHeight());
        dashboardWidget.setWidgetOrder(nextOrder);
        dashboardWidget.setLayoutConfig(request.getLayoutConfig());
        dashboardWidget.setCreatedBy(userId);
        dashboardWidget.setIsActive(true);
        
        DashboardWidget savedDashboardWidget = dashboardWidgetRepository.save(dashboardWidget);
        
        return dashboardMapper.toDashboardWidgetResponse(savedDashboardWidget);
    }

    public List<DashboardWidgetResponse> getDashboardWidgets(Long dashboardId, String userId, String departmentId) {
        log.info("Getting widgets for dashboard {} by user: {}", dashboardId, userId);
        // TEMP: Permissions disabled for rapid development
        // if (!dashboardRepository.hasViewPermission(dashboardId, userId, departmentId)) {
        //     throw new UnauthorizedException("User does not have permission to view this dashboard");
        // }
        
        List<DashboardWidget> dashboardWidgets = dashboardWidgetRepository
                .findByDashboardIdOrderByWidgetOrder(dashboardId);
        
        return dashboardWidgets.stream()
                .map(dashboardMapper::toDashboardWidgetResponse)
                .collect(Collectors.toList());
    }

    public void removeWidgetFromDashboard(String dashboardId, Long dashboardWidgetId, String userId, String departmentId) {
        log.info("Removing widget {} from dashboard {} by user: {}", dashboardWidgetId, dashboardId, userId);
        // TEMP: Permissions disabled for rapid development
        // if (!dashboardRepository.hasEditPermission(dashboardId, userId, departmentId)) {
        //     throw new UnauthorizedException("User does not have permission to edit this dashboard");
        // }
        
        DashboardWidget dashboardWidget = dashboardWidgetRepository.findByIdAndIsActiveTrue(dashboardWidgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard widget not found with id: " + dashboardWidgetId));
        
        // Verify that the widget belongs to the specified dashboard
        if (!dashboardWidget.getDashboard().getId().equals(dashboardId)) {
            throw new IllegalStateException("Widget does not belong to the specified dashboard");
        }
        
        // Soft delete - set isActive to false
        dashboardWidget.setIsActive(false);
        dashboardWidgetRepository.save(dashboardWidget);
        
        log.info("Dashboard widget {} removed successfully from dashboard {}", dashboardWidgetId, dashboardId);
    }

    public DashboardWidgetResponse updateDashboardWidgetLayout(String dashboardId,
                                                               Long dashboardWidgetId,
                                                               UpdateDashboardWidgetLayoutRequest request,
                                                               String userId,
                                                               String departmentId) {
        log.info("Updating layout for dashboard widget {} in dashboard {} by user: {}", dashboardWidgetId, dashboardId, userId);
        // TEMP: Permissions disabled for rapid development
        // if (!dashboardRepository.hasEditPermission(dashboardId, userId, departmentId)) {
        //     throw new UnauthorizedException("User does not have permission to edit this dashboard");
        // }

        DashboardWidget dashboardWidget = dashboardWidgetRepository.findByIdAndIsActiveTrue(dashboardWidgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard widget not found with id: " + dashboardWidgetId));

        if (!dashboardWidget.getDashboard().getId().equals(dashboardId)) {
            throw new IllegalStateException("Widget does not belong to the specified dashboard");
        }

        if (request.getPositionX() != null) dashboardWidget.setPositionX(request.getPositionX());
        if (request.getPositionY() != null) dashboardWidget.setPositionY(request.getPositionY());
        if (request.getWidth() != null) dashboardWidget.setWidth(request.getWidth());
        if (request.getHeight() != null) dashboardWidget.setHeight(request.getHeight());
        if (request.getWidgetOrder() != null) dashboardWidget.setWidgetOrder(request.getWidgetOrder());
        if (request.getLayoutConfig() != null) dashboardWidget.setLayoutConfig(request.getLayoutConfig());

        DashboardWidget saved = dashboardWidgetRepository.save(dashboardWidget);
        return dashboardMapper.toDashboardWidgetResponse(saved);
    }

    private void createUserPermissions(Dashboard dashboard, CreateDashboardRequest request, String userId) {
        List<DashboardUserPermission> permissions = new ArrayList<>();
        
        // Create viewer permissions
        if (request.getViewerUserIds() != null) {
            for (String viewerUserId : request.getViewerUserIds()) {
                DashboardUserPermission permission = new DashboardUserPermission();
                permission.setDashboard(dashboard);
                permission.setUserId(viewerUserId);
                permission.setPermissionType(DashboardUserPermission.PermissionType.VIEWER);
                permission.setAccessType(DashboardUserPermission.AccessType.USERS);
                permission.setCreatedBy(userId);
                permissions.add(permission);
            }
        }
        
        if (request.getViewerDepartmentIds() != null) {
            for (String departmentId : request.getViewerDepartmentIds()) {
                DashboardUserPermission permission = new DashboardUserPermission();
                permission.setDashboard(dashboard);
                permission.setDepartmentId(departmentId);
                permission.setPermissionType(DashboardUserPermission.PermissionType.VIEWER);
                permission.setAccessType(DashboardUserPermission.AccessType.DEPARTMENTS);
                permission.setCreatedBy(userId);
                permissions.add(permission);
            }
        }
        
        // Create editor permissions
        if (request.getEditorUserIds() != null) {
            for (String editorUserId : request.getEditorUserIds()) {
                DashboardUserPermission permission = new DashboardUserPermission();
                permission.setDashboard(dashboard);
                permission.setUserId(editorUserId);
                permission.setPermissionType(DashboardUserPermission.PermissionType.EDITOR);
                permission.setAccessType(DashboardUserPermission.AccessType.USERS);
                permission.setCreatedBy(userId);
                permissions.add(permission);
            }
        }
        
        if (request.getEditorDepartmentIds() != null) {
            for (String departmentId : request.getEditorDepartmentIds()) {
                DashboardUserPermission permission = new DashboardUserPermission();
                permission.setDashboard(dashboard);
                permission.setDepartmentId(departmentId);
                permission.setPermissionType(DashboardUserPermission.PermissionType.EDITOR);
                permission.setAccessType(DashboardUserPermission.AccessType.DEPARTMENTS);
                permission.setCreatedBy(userId);
                permissions.add(permission);
            }
        }
        
        if (!permissions.isEmpty()) {
            permissionRepository.saveAll(permissions);
        }
    }

    private void updateUserPermissions(Dashboard dashboard, UpdateDashboardRequest request, String userId) {
        // Delete existing permissions
        permissionRepository.deleteByDashboardId(dashboard.getId());
        
        // Create new permissions (similar logic to createUserPermissions)
        List<DashboardUserPermission> permissions = new ArrayList<>();
        
        // Create viewer permissions
        if (request.getViewerUserIds() != null) {
            for (String viewerUserId : request.getViewerUserIds()) {
                DashboardUserPermission permission = new DashboardUserPermission();
                permission.setDashboard(dashboard);
                permission.setUserId(viewerUserId);
                permission.setPermissionType(DashboardUserPermission.PermissionType.VIEWER);
                permission.setAccessType(DashboardUserPermission.AccessType.USERS);
                permission.setCreatedBy(userId);
                permissions.add(permission);
            }
        }
        
        if (request.getViewerDepartmentIds() != null) {
            for (String departmentId : request.getViewerDepartmentIds()) {
                DashboardUserPermission permission = new DashboardUserPermission();
                permission.setDashboard(dashboard);
                permission.setDepartmentId(departmentId);
                permission.setPermissionType(DashboardUserPermission.PermissionType.VIEWER);
                permission.setAccessType(DashboardUserPermission.AccessType.DEPARTMENTS);
                permission.setCreatedBy(userId);
                permissions.add(permission);
            }
        }
        
        // Create editor permissions
        if (request.getEditorUserIds() != null) {
            for (String editorUserId : request.getEditorUserIds()) {
                DashboardUserPermission permission = new DashboardUserPermission();
                permission.setDashboard(dashboard);
                permission.setUserId(editorUserId);
                permission.setPermissionType(DashboardUserPermission.PermissionType.EDITOR);
                permission.setAccessType(DashboardUserPermission.AccessType.USERS);
                permission.setCreatedBy(userId);
                permissions.add(permission);
            }
        }
        
        if (request.getEditorDepartmentIds() != null) {
            for (String departmentId : request.getEditorDepartmentIds()) {
                DashboardUserPermission permission = new DashboardUserPermission();
                permission.setDashboard(dashboard);
                permission.setDepartmentId(departmentId);
                permission.setPermissionType(DashboardUserPermission.PermissionType.EDITOR);
                permission.setAccessType(DashboardUserPermission.AccessType.DEPARTMENTS);
                permission.setCreatedBy(userId);
                permissions.add(permission);
            }
        }
        
        if (!permissions.isEmpty()) {
            permissionRepository.saveAll(permissions);
        }
    }
}
