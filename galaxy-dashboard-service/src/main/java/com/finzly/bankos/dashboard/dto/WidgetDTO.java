package com.finzly.bankos.dashboard.dto;

import com.fasterxml.jackson.databind.JsonNode;

public class WidgetDTO {
    private String widgetId;
    private String widgetName;
    private String dataSourceId;
    private String appCode;
    private JsonNode searchFields;   // JSON {"status": "SUCCESS", "country": "US"}
    private JsonNode groupFields;    // JSON ["country"]
    private JsonNode measureFields;  // JSON [{"field":"amount", "aggregation":"SUM"}]
    private String chartType;
    private Integer limit;


    public String getWidgetId() {
        return widgetId;
    }

    public void setWidgetId(String widgetId) {
        this.widgetId = widgetId;
    }

    public String getWidgetName() {
        return widgetName;
    }

    public void setWidgetName(String widgetName) {
        this.widgetName = widgetName;
    }

    public String getDataSourceId() {
        return dataSourceId;
    }

    public void setDataSourceId(String dataSourceId) {
        this.dataSourceId = dataSourceId;
    }

    public String getAppCode() {
        return appCode;
    }

    public void setAppCode(String appCode) {
        this.appCode = appCode;
    }

    public JsonNode getSearchFields() {
        return searchFields;
    }

    public void setSearchFields(JsonNode searchFields) {
        this.searchFields = searchFields;
    }

    public JsonNode getGroupFields() {
        return groupFields;
    }

    public void setGroupFields(JsonNode groupFields) {
        this.groupFields = groupFields;
    }

    public JsonNode getMeasureFields() {
        return measureFields;
    }

    public void setMeasureFields(JsonNode measureFields) {
        this.measureFields = measureFields;
    }

    public String getChartType() {
        return chartType;
    }

    public void setChartType(String chartType) {
        this.chartType = chartType;
    }

    public Integer getLimit() {
        return limit;
    }

    public void setLimit(Integer limit) {
        this.limit = limit;
    }
}