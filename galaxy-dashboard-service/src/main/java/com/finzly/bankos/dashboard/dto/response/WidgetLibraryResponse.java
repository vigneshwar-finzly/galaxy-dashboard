package com.finzly.bankos.dashboard.dto.response;

import com.finzly.bankos.dashboard.entity.Widget;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WidgetLibraryResponse {
    private Long id;
    private String name;
    private String description;
    private Widget.ChartType chartType;
    private String dataSource;
    private Integer refreshInterval;
    private String createdBy;
    private LocalDateTime createdDateTime;
    private LocalDateTime updatedDateTime;
    
    // Usage information
    private Integer usageCount;
    private Boolean isInUse;
    private Boolean isInCurrentDashboard;
    private List<DashboardUsageInfo> usedInDashboards;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardUsageInfo {
        private Long dashboardId;
        private String dashboardName;
        private String dashboardDescription;
        private Boolean isCurrentDashboard;
    }
}
