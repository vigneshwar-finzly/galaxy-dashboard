package com.finzly.bankos.dashboard.dto.response;

import com.finzly.bankos.dashboard.entity.ChartConfig;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChartConfigResponse {

    private Long id;
    private ChartConfig.ChartType chartType;
    private String fieldRules;
    private String uiConstraints;
    private String displayConfig;
    private LocalDateTime createdDateTime;
    private String createdBy;
}
