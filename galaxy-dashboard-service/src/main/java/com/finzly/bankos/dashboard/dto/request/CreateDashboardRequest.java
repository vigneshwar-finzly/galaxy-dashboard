package com.finzly.bankos.dashboard.dto.request;

import com.finzly.bankos.dashboard.entity.Dashboard;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateDashboardRequest {

    @NotBlank(message = "Dashboard name is required")
    private String name;

    private String description;

    @NotNull(message = "Viewer type is required")
    private Dashboard.ViewerType viewerType;

    @NotNull(message = "Editor type is required")
    private Dashboard.EditorType editorType;

    private List<String> viewerUserIds;

    private List<String> viewerDepartmentIds;

    private List<String> editorUserIds;

    private List<String> editorDepartmentIds;
}
