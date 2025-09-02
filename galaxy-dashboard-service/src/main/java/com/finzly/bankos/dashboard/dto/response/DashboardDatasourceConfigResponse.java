package com.finzly.bankos.dashboard.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDatasourceConfigResponse {

    private String id;
    private String name;
    private String appCode;
    private String displayName;
    private String description;
    private String tableName;
    private String searchFields;
    private String groupFields;
    private String measureFields;
    private LocalDateTime createdDateTime;
    private LocalDateTime updatedDateTime;
    private String createdBy;
    private String updatedBy;
}
