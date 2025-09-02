package com.finzly.bankos.dashboard.dto.response;

import com.finzly.bankos.dashboard.entity.DashboardUserPermission;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardUserPermissionResponse {

    private Long id;
    private String userId;
    private String departmentId;
    private DashboardUserPermission.PermissionType permissionType;
    private LocalDateTime createdDateTime;
    private String createdBy;
}
