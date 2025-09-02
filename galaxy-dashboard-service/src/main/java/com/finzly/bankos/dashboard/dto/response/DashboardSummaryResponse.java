package com.finzly.bankos.dashboard.dto.response;

import com.finzly.bankos.dashboard.entity.Dashboard;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse {

    private Long id;
    private String name;
    private String description;
    private Dashboard.ViewerType viewerType;
    private Dashboard.EditorType editorType;
    private Dashboard.DashboardStatus status;
    private Boolean isSystemDashboard;
    private Boolean isActive;
    private Boolean isDefault;
    private String createdBy;
    private LocalDateTime createdDateTime;
    private LocalDateTime updatedDateTime;
    private Long totalWidgets;
}
