package com.finzly.bankos.dashboard.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WidgetCreationConfigResponse {
    
    private List<DataSourceWithCharts> dataSources;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataSourceWithCharts {
        private String appCode;
        private List<DataSourceConfig> configs;
        private List<ChartConfigResponse> availableCharts;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataSourceConfig {
        private String name;
        private String description;
        private List<SearchField> searchFields;
        private List<GroupField> groupFields;
        private List<MeasureField> measureFields;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchField {
        private String name;
        private String type;
        private String column;
        private String valueType;
        private String value;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupField {
        private String name;
        private String column;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MeasureField {
        private String name;
        private String column;
        private List<String> measure;
    }
}
