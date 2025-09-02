package com.finzly.bankos.dashboard.mapper;

import com.finzly.bankos.dashboard.dto.request.CreateDashboardRequest;
import com.finzly.bankos.dashboard.dto.request.UpdateDashboardRequest;
import com.finzly.bankos.dashboard.dto.response.DashboardResponse;
import com.finzly.bankos.dashboard.dto.response.DashboardSummaryResponse;
import com.finzly.bankos.dashboard.dto.response.DashboardWidgetResponse;
import com.finzly.bankos.dashboard.dto.response.ChartConfigResponse;
import com.finzly.bankos.dashboard.dto.response.DashboardDatasourceConfigResponse;
import com.finzly.bankos.dashboard.dto.response.WidgetResponse;
import com.finzly.bankos.dashboard.entity.Dashboard;
import com.finzly.bankos.dashboard.entity.DashboardWidget;
import com.finzly.bankos.dashboard.entity.ChartConfig;
import com.finzly.bankos.dashboard.entity.DashboardDatasourceConfig;
import com.finzly.bankos.dashboard.entity.Widget;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class DashboardMapper {

    public Dashboard toEntity(CreateDashboardRequest request, String userId) {
        Dashboard dashboard = new Dashboard();
        dashboard.setName(request.getName());
        dashboard.setDescription(request.getDescription());
        dashboard.setViewerType(request.getViewerType());
        dashboard.setEditorType(request.getEditorType());
        dashboard.setStatus(Dashboard.DashboardStatus.DRAFT);
        dashboard.setIsSystemDashboard(false);
        dashboard.setIsActive(true);
        dashboard.setIsDefault(false);
        dashboard.setCreatedBy(userId);
        return dashboard;
    }

    public void updateEntity(Dashboard dashboard, UpdateDashboardRequest request, String userId) {
        dashboard.setName(request.getName());
        dashboard.setDescription(request.getDescription());
        dashboard.setViewerType(request.getViewerType());
        dashboard.setEditorType(request.getEditorType());
        dashboard.setUpdatedBy(userId);
    }

    public DashboardResponse toResponse(Dashboard dashboard) {
        DashboardResponse response = new DashboardResponse();
        response.setId(dashboard.getId());
        response.setName(dashboard.getName());
        response.setDescription(dashboard.getDescription());
        response.setViewerType(dashboard.getViewerType());
        response.setEditorType(dashboard.getEditorType());
        response.setStatus(dashboard.getStatus());
        response.setIsSystemDashboard(dashboard.getIsSystemDashboard());
        response.setIsActive(dashboard.getIsActive());
        response.setIsDefault(dashboard.getIsDefault());
        response.setCreatedBy(dashboard.getCreatedBy());
        response.setUpdatedBy(dashboard.getUpdatedBy());
        response.setCreatedDateTime(dashboard.getCreatedDateTime());
        response.setUpdatedDateTime(dashboard.getUpdatedDateTime());
        
        if (dashboard.getDashboardWidgets() != null) {
            response.setTotalWidgets((long) dashboard.getDashboardWidgets().size());
        }
        
        return response;
    }

    public DashboardSummaryResponse toSummaryResponse(Dashboard dashboard, long widgetCount) {
        DashboardSummaryResponse response = new DashboardSummaryResponse();
        response.setId(dashboard.getId());
        response.setName(dashboard.getName());
        response.setDescription(dashboard.getDescription());
        response.setViewerType(dashboard.getViewerType());
        response.setEditorType(dashboard.getEditorType());
        response.setStatus(dashboard.getStatus());
        response.setIsSystemDashboard(dashboard.getIsSystemDashboard());
        response.setIsActive(dashboard.getIsActive());
        response.setIsDefault(dashboard.getIsDefault());
        response.setCreatedBy(dashboard.getCreatedBy());
        response.setCreatedDateTime(dashboard.getCreatedDateTime());
        response.setUpdatedDateTime(dashboard.getUpdatedDateTime());
        response.setTotalWidgets(widgetCount);
        return response;
    }

    public DashboardWidgetResponse toDashboardWidgetResponse(DashboardWidget dashboardWidget) {
        DashboardWidgetResponse response = new DashboardWidgetResponse();
        response.setId(dashboardWidget.getId());
        response.setDashboardId(dashboardWidget.getDashboard().getId());
        response.setWidgetId(dashboardWidget.getWidget().getId());
        response.setPositionX(dashboardWidget.getPositionX());
        response.setPositionY(dashboardWidget.getPositionY());
        response.setWidth(dashboardWidget.getWidth());
        response.setHeight(dashboardWidget.getHeight());
        response.setWidgetOrder(dashboardWidget.getWidgetOrder());
        response.setCreatedBy(dashboardWidget.getCreatedBy());
        response.setCreatedDateTime(dashboardWidget.getCreatedDateTime());
        response.setUpdatedDateTime(dashboardWidget.getUpdatedDateTime());
        return response;
    }

    public List<DashboardWidgetResponse> toDashboardWidgetResponseList(List<DashboardWidget> dashboardWidgets) {
        return dashboardWidgets.stream()
                .map(this::toDashboardWidgetResponse)
                .collect(Collectors.toList());
    }

    // Chart Config mapping methods
    public ChartConfigResponse toChartConfigResponse(ChartConfig chartConfig) {
        if (chartConfig == null) return null;
        
        ChartConfigResponse response = new ChartConfigResponse();
        response.setId(chartConfig.getId());
        response.setChartType(chartConfig.getChartType());
        response.setFieldRules(chartConfig.getFieldRules());
        response.setUiConstraints(chartConfig.getUiConstraints());
        response.setDisplayConfig(chartConfig.getDisplayConfig());
        response.setCreatedDateTime(chartConfig.getCreatedDateTime());
        response.setCreatedBy(chartConfig.getCreatedBy());
        return response;
    }

    public List<ChartConfigResponse> toChartConfigResponseList(List<ChartConfig> chartConfigs) {
        return chartConfigs.stream()
                .map(this::toChartConfigResponse)
                .collect(Collectors.toList());
    }

    // Datasource Config mapping methods
    public DashboardDatasourceConfigResponse toDatasourceConfigResponse(DashboardDatasourceConfig datasourceConfig) {
        if (datasourceConfig == null) return null;
        
        DashboardDatasourceConfigResponse response = new DashboardDatasourceConfigResponse();
        response.setId(datasourceConfig.getId());
        response.setName(datasourceConfig.getName());
        response.setAppCode(datasourceConfig.getAppCode());
        response.setDisplayName(datasourceConfig.getDisplayName());
        response.setDescription(datasourceConfig.getDescription());
        response.setTableName(datasourceConfig.getTableName());
        response.setSearchFields(datasourceConfig.getSearchFields());
        response.setGroupFields(datasourceConfig.getGroupFields());
        response.setMeasureFields(datasourceConfig.getMeasureFields());
        response.setCreatedBy(datasourceConfig.getCreatedBy());
        response.setCreatedDateTime(datasourceConfig.getCreatedDateTime());
        response.setUpdatedBy(datasourceConfig.getUpdatedBy());
        response.setUpdatedDateTime(datasourceConfig.getUpdatedDateTime());
        return response;
    }

    public List<DashboardDatasourceConfigResponse> toDatasourceConfigResponseList(List<DashboardDatasourceConfig> datasourceConfigs) {
        return datasourceConfigs.stream()
                .map(this::toDatasourceConfigResponse)
                .collect(Collectors.toList());
    }

    // Widget mapping methods
    public WidgetResponse toWidgetResponse(Widget widget) {
        if (widget == null) return null;
        
        WidgetResponse response = new WidgetResponse();
        response.setId(widget.getId());
        response.setName(widget.getName());
        response.setDescription(widget.getDescription());
        response.setChartType(widget.getChartType());
        response.setDataSource(widget.getDataSource());
        response.setRefreshInterval(widget.getRefreshInterval());
        response.setGroupFields(widget.getGroupFields());
        response.setMeasureFields(widget.getMeasureFields());
        response.setFilterCriteria(widget.getFilterCriteria());
        response.setSearchFields(widget.getSearchFields());
        response.setWidgetConfig(widget.getWidgetConfig());
        response.setCreatedBy(widget.getCreatedBy());
        response.setUpdatedBy(widget.getUpdatedBy());
        response.setCreatedDateTime(widget.getCreatedDateTime());
        response.setUpdatedDateTime(widget.getUpdatedDateTime());
        return response;
    }

    public List<WidgetResponse> toWidgetResponseList(List<Widget> widgets) {
        return widgets.stream()
                .map(this::toWidgetResponse)
                .collect(Collectors.toList());
    }
}
