import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateWidgetRequest, WidgetDataRequest, ChartType, WidgetResponse } from '../../models/dashboard.models';
import { ThemeService } from '../../services/theme.service';
import { WidgetAccordionService } from '../../services/widget-accordion.service';
import { LoadingService } from '../../services/loading.service';
import { DashboardService } from '../../services/dashboard.service';
import { ConfigurationService } from '../../services/configuration.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-create-widget-dialog',
  templateUrl: './create-widget-dialog.component.html',
  styleUrls: ['./create-widget-dialog.component.scss']
})
export class CreateWidgetDialogComponent implements OnInit, OnDestroy {
  // Step management
  stepIndex = 0;
  steps = [
    { label: 'Data Source' },
    { label: 'Chart Type' },
    { label: 'Fields' },
    { label: 'Filters' },
    { label: 'Preview' },
    { label: 'Save' }
  ];

  // Basic widget metadata
  widgetName = '';
  widgetDescription = '';

  // Selections
  selectedDataSource: any = null;
  selectedChartType: any = null;
  selectedFields: any = {};
  selectedFilters: Array<{ field: any; condition: string | null; value: any }> = [];

  // Preview data
  previewData: any = null;
  isLoadingPreview = false;

  // Data-driven configs
  dataSources: { name: string; description?: string; icon?: string; value: string }[] = [];
  chartTypes: { title: string; icon: string; description?: string; rules: any }[] = [];
  availableFields: any[] = [];

  get numericFields() {
    return this.availableFields.filter(f => f.type === 'numeric');
  }

  get xAxisFields() {
    return this.groupFields; // X-axis should only show group fields
  }

  get yAxisFields() {
    return this.measureFields; // Y-axis should only show measure fields
  }

  // Helper methods for field limits
  getGroupFieldsLimit(): { min: number; max: number } {
    if (!this.selectedChartType?.rules?.groupFields) {
      return { min: 0, max: 10 };
    }
    return this.selectedChartType.rules.groupFields;
  }

  getMeasureFieldsLimit(): { min: number; max: number } {
    if (!this.selectedChartType?.rules?.measureFields) {
      return { min: 1, max: 10 };
    }
    return this.selectedChartType.rules.measureFields;
  }

  getSelectedGroupFieldsCount(): number {
    return this.selectedFields.groupFields?.length || 0;
  }

  getSelectedMeasureFieldsCount(): number {
    return this.selectedFields.measureFields?.length || 0;
  }

  canAddGroupField(): boolean {
    const limit = this.getGroupFieldsLimit();
    return this.getSelectedGroupFieldsCount() < limit.max;
  }

  canAddMeasureField(): boolean {
    const limit = this.getMeasureFieldsLimit();
    return this.getSelectedMeasureFieldsCount() < limit.max;
  }

  isGroupFieldRequired(): boolean {
    const limit = this.getGroupFieldsLimit();
    return this.getSelectedGroupFieldsCount() < limit.min;
  }

  isMeasureFieldRequired(): boolean {
    const limit = this.getMeasureFieldsLimit();
    return this.getSelectedMeasureFieldsCount() < limit.min;
  }

  groupFields: any[] = [];
  
  measureFields: any[] = [];

  filterFields: any[] = [];

  private themeSubscription: Subscription = new Subscription();

  constructor(
    public dialogRef: MatDialogRef<CreateWidgetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private themeService: ThemeService,
    private widgetAccordionService: WidgetAccordionService,
    public loadingService: LoadingService,
    private dashboardService: DashboardService,
    private configurationService: ConfigurationService
  ) {}

  ngOnInit(): void {
    this.loadDatasourceAndChartConfigs();
    this.themeSubscription = this.themeService.themeChanges$.subscribe(() => {
      if (this.stepIndex === 4 && this.previewData) {
        setTimeout(() => this.generatePreviewData(), 100);
      }
    });
  }

  private loadDatasourceAndChartConfigs(): void {
    this.configurationService.getAllDatasourceConfigs().subscribe({
      next: (configs) => {
        this.dataSources = configs.map(c => ({ 
          name: c.displayName || c.name, 
          icon: 'database', 
          value: c.name 
        }));
        if (!this.selectedDataSource && this.dataSources.length) {
          this.selectDataSource(this.dataSources[0]);
        }
      }
    });

    this.configurationService.getAllChartConfigs().subscribe({
      next: (charts) => {
        this.chartTypes = charts.map(c => {
          const parsedRules = c.fieldRules ? JSON.parse(c.fieldRules) : {};
          return {
            title: c.chartType.replace('_', ' ').toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase()),
            icon: 'bar_chart',
            rules: this.mapFieldRulesToUi(parsedRules, c.chartType)
          };
        });
      }
    });
  }

  private mapFieldRulesToUi(rules: any, chartType: any): any {
    const typeMap: any = {
      TABLE: 'table', PIE: 'pie', DONUT: 'donut', VERTICAL_BAR: 'bar', HORIZONTAL_BAR: 'horizontal_bar',
      COUNT: 'count', LINE_CHART: 'line', AREA_CHART: 'area', RADAR_CHART: 'radar'
    };
    const type = typeMap[chartType] || 'table';
    const requiresGroupFields = ['pie','donut','aggregated_table'].includes(type);
    const requiresXAxis = ['bar','line','area','horizontal_bar'].includes(type);
    const requiresYAxis = requiresXAxis;
    const maxFields = rules?.measureFields?.max || 8;
    
    // Preserve the actual field rules from the database
    return { 
      type, 
      maxFields, 
      requiresGroupFields, 
      requiresXAxis, 
      requiresYAxis,
      groupFields: rules?.groupFields || { min: 0, max: 10 },
      measureFields: rules?.measureFields || { min: 1, max: 10 },
      fieldRules: rules // Keep the original rules for reference
    };
  }

  // Helper method to determine filter field type based on operators from backend
  private getFilterFieldTypeFromOperators(operators: string[]): string {
    if (!operators || operators.length === 0) return 'text';
    
    // Check if any operator suggests date fields
    const dateOperators = ['AFTER', 'BEFORE', 'EQUALS'];
    if (operators.some(op => dateOperators.includes(op))) {
      return 'daterange';
    }
    
    // Default to text for string operations
    return 'text';
  }



  // Load fields for the selected datasource
  private loadFieldsForSelectedDataSource(): void {
    if (!this.selectedDataSource) return;
    
    this.configurationService.getAllDatasourceConfigs().subscribe({
      next: (configs) => {
        console.log(configs);
        const current = configs.find(c => c.name === this.selectedDataSource.value);
        
        if (current) {
          const groupFs = current.groupFields ? JSON.parse(current.groupFields) : [];
          const measureFs = current.measureFields ? JSON.parse(current.measureFields) : [];
          const searchFs = current.searchFields ? JSON.parse(current.searchFields) : [];
          
          this.availableFields = [
            ...groupFs.map((f: any) => ({ 
              name: f.displayName || f.fieldName,
              displayName: f.displayName || f.fieldName,
              fieldName: f.fieldName,
              type: 'text',
              aggregation: undefined
            })),
            ...measureFs.map((f: any) => ({ 
              name: f.displayName || f.fieldName,
              displayName: f.displayName || f.fieldName,
              fieldName: f.fieldName,
              type: 'numeric',
              aggregation: f.aggregation || 'SUM'
            }))
          ];
          
          this.groupFields = groupFs.map((f: any) => ({ 
            name: f.displayName || f.fieldName,
            displayName: f.displayName || f.fieldName,
            fieldName: f.fieldName,
            value: f.fieldName,
            type: 'text'
          }));
          
          this.measureFields = measureFs.map((f: any) => ({ 
            name: f.displayName || f.fieldName,
            displayName: f.displayName || f.fieldName,
            fieldName: f.fieldName,
            aggregation: f.aggregation || 'SUM',
            value: f.fieldName,
            type: 'numeric'
          }));
          
          // Search/Filter fields for filtering - get operators from backend
          this.filterFields = searchFs.map((f: any) => ({ 
            name: f.displayName || f.fieldName,
            displayName: f.displayName || f.fieldName,
            fieldName: f.fieldName,
            operators: f.operators || [],
            type: this.getFilterFieldTypeFromOperators(f.operators),
            conditions: f.operators || []
          }));
          
          // Clear previous selections when datasource changes
          this.selectedFields = {};
          this.selectedFilters = [];
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription.unsubscribe();
  }

  // Navigation
  next() {
    if (this.stepIndex < this.steps.length - 1 && this.canProceed()) {
      this.stepIndex++;
      if (this.stepIndex === 4) {
        this.generatePreviewData();
      }
    }
  }

  prev() {
    if (this.stepIndex > 0) {
      this.stepIndex--;
    }
  }

  goToStep(i: number) {
    if (i >= 0 && i < this.steps.length) {
      this.stepIndex = i;
    }
  }

  // Selection handlers
  selectDataSource(source: any) {
    this.selectedDataSource = source;
    this.loadFieldsForSelectedDataSource();
  }

  selectChart(chart: any) {
    this.selectedChartType = chart;
    this.selectedFields = {};
  }

  selectField(field: any, fieldType: string) {
    if (fieldType === 'xAxis' || fieldType === 'yAxis') {
      this.selectedFields[fieldType] = field;
      return;
    }
    if (fieldType === 'groupFields') {
      if (!this.selectedFields.groupFields) {
        this.selectedFields.groupFields = [];
      }
      const index = this.selectedFields.groupFields.findIndex((f: any) => f.name === field.name);
      if (index > -1) {
        this.selectedFields.groupFields.splice(index, 1);
      } else if (this.canAddGroupField()) {
        this.selectedFields.groupFields.push(field);
      }
      return;
    }
    if (fieldType === 'measureFields') {
      if (!this.selectedFields.measureFields) {
        this.selectedFields.measureFields = [];
      }
      const index = this.selectedFields.measureFields.findIndex((f: any) => f.name === field.name);
      if (index > -1) {
        this.selectedFields.measureFields.splice(index, 1);
      } else if (this.canAddMeasureField()) {
        this.selectedFields.measureFields.push(field);
      }
      return;
    }
    if (fieldType === 'groupField') {
      this.selectedFields.groupField = field;
      return;
    }
    if (fieldType === 'tableFields') {
      if (!this.selectedFields.tableFields) {
        this.selectedFields.tableFields = [];
      }
      const index = this.selectedFields.tableFields.findIndex((f: any) => f.name === field.name);
      if (index > -1) {
        this.selectedFields.tableFields.splice(index, 1);
      } else if (this.selectedFields.tableFields.length < this.getMaxFieldsForChartType()) {
        this.selectedFields.tableFields.push(field);
      }
      return;
    }
    if (fieldType === 'countField') {
      this.selectedFields.countField = field;
    }
  }

  isFieldSelected(field: any, fieldType: string): boolean {
    if (fieldType === 'xAxis' || fieldType === 'yAxis') {
      return this.selectedFields[fieldType] === field;
    }
    if (fieldType === 'groupFields') {
      return Array.isArray(this.selectedFields.groupFields) && this.selectedFields.groupFields.some((f: any) => f.name === field.name);
    }
    if (fieldType === 'measureFields') {
      return Array.isArray(this.selectedFields.measureFields) && this.selectedFields.measureFields.some((f: any) => f.name === field.name);
    }
    if (fieldType === 'groupField') {
      return this.selectedFields.groupField === field;
    }
    if (fieldType === 'tableFields') {
      return Array.isArray(this.selectedFields.tableFields) && this.selectedFields.tableFields.some((f: any) => f.name === field.name);
    }
    if (fieldType === 'countField') {
      return this.selectedFields.countField === field;
    }
    return false;
  }

  getSelectedFieldsCount(): number {
    const chartType = this.selectedChartType?.rules?.type;
    
    if (chartType === 'table') {
      return Array.isArray(this.selectedFields.tableFields) ? this.selectedFields.tableFields.length : 0;
    }
    
    if (chartType === 'bar' || chartType === 'line' || chartType === 'area') {
      let count = 0;
      if (this.selectedFields.xAxis) count++;
      if (this.selectedFields.yAxis) count++;
      return count;
    }
    
    if (chartType === 'pie' || chartType === 'donut' || chartType === 'radar') {
      return this.getSelectedGroupFieldsCount() + this.getSelectedMeasureFieldsCount();
    }
    
    if (chartType === 'count') {
      return this.getSelectedMeasureFieldsCount();
    }
    
    return 0;
  }

  getMaxFieldsForChartType(): number {
    // For table charts, use the measure fields limit
    if (this.selectedChartType?.rules?.type === 'table') {
      return this.getMeasureFieldsLimit().max;
    }
    // For other aggregated tables
    if (this.selectedChartType?.rules?.type === 'aggregated_table') {
      return 6;
    }
    return this.getMeasureFieldsLimit().max;
  }

  addFilter() {
    this.selectedFilters.push({ field: null, condition: null, value: null });
  }

  removeFilter(index: number) {
    this.selectedFilters.splice(index, 1);
  }

  // Validation
  canProceed(): boolean {
    switch (this.stepIndex) {
      case 0:
        return this.selectedDataSource !== null;
      case 1:
        return this.selectedChartType !== null;
      case 2: {
        const type = this.selectedChartType?.rules?.type;
        if (type === 'table') {
          return this.selectedFields.tableFields && this.selectedFields.tableFields.length > 0;
        }
        if (type === 'bar' || type === 'line' || type === 'area') {
          return !!this.selectedFields.xAxis && !!this.selectedFields.yAxis;
        }
        if (type === 'pie' || type === 'donut' || type === 'radar') {
          const groupLimit = this.getGroupFieldsLimit();
          const measureLimit = this.getMeasureFieldsLimit();
          const groupCount = this.getSelectedGroupFieldsCount();
          const measureCount = this.getSelectedMeasureFieldsCount();
          return groupCount >= groupLimit.min && 
                 groupCount <= groupLimit.max &&
                 measureCount >= measureLimit.min && 
                 measureCount <= measureLimit.max;
        }
        if (type === 'aggregated_table') {
          return this.selectedFields.tableFields && this.selectedFields.tableFields.length > 0 && !!this.selectedFields.groupField;
        }
        if (type === 'count') {
          const measureLimit = this.getMeasureFieldsLimit();
          return this.getSelectedMeasureFieldsCount() >= measureLimit.min && 
                 this.getSelectedMeasureFieldsCount() <= measureLimit.max;
        }
        return true;
      }
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return !!this.widgetName.trim();
      default:
        return false;
    }
  }

  // Save
  createWidget() {
    if (!this.canCreateWidget()) return;
    const request: CreateWidgetRequest = {
      name: this.widgetName,
      description: this.widgetDescription,
      dataSource: this.selectedDataSource?.value || 'payments',
      chartType: this.mapChartType(this.selectedChartType?.rules?.type),
      refreshInterval: 30,
      groupFields: this.buildGroupFields(),
      measureFields: this.buildMeasureFields(),
      filterCriteria: this.buildLegacyFiltersForBackwardCompat(),
      // New aggregator-compatible searchFields persisted on backend
      // Format: { fieldName, operator, fieldValue } or { rules: [...] }
      // Here we generate rules array for consistency
      searchFields: this.buildAggregatorRules()
    };
    this.widgetAccordionService.createWidget(request).subscribe({
      next: (widget) => this.onCreated(widget),
      error: (err) => console.error('Failed to create widget:', err)
    });
  }

  private canCreateWidget(): boolean {
    return !!(this.widgetName?.trim() && this.selectedDataSource && this.selectedChartType);
  }

  private mapChartType(frontendType: string): ChartType {
    const typeMapping: { [key: string]: ChartType } = {
      'bar': ChartType.VERTICAL_BAR,
      'horizontal-bar': ChartType.HORIZONTAL_BAR,
      'line': ChartType.LINE_CHART,
      'pie': ChartType.PIE,
      'donut': ChartType.DONUT,
      'area': ChartType.AREA_CHART,
      'table': ChartType.TABLE,
      'count': ChartType.COUNT,
      'radar': ChartType.RADAR_CHART
    };
    return typeMapping[frontendType] || ChartType.TABLE;
  }

  // Preview generation
  generatePreviewData(): void {
    if (!this.selectedDataSource || !this.selectedChartType) return;
    this.isLoadingPreview = true;
    const request: WidgetDataRequest = {
      widgetId: 0,
      dataSource: this.selectedDataSource.value,
      groupFields: this.buildGroupFields(),
      measureFields: this.buildMeasureFields(),
      searchFields: this.buildSearchFields()
    };
    this.dashboardService.getWidgetData(request).subscribe({
      next: (response) => {
        this.isLoadingPreview = false;
        if (response.success && response.data) {
          this.previewData = {
            type: this.getChartTypeForPreview(),
            title: this.getPreviewTitle(),
            data: response.data,
            chartType: this.selectedChartType.rules?.type
          };
        } else {
          this.generateFallbackPreviewData();
        }
      },
      error: () => {
        this.isLoadingPreview = false;
        this.generateFallbackPreviewData();
      }
    });
  }

  private buildGroupFields(): string {
    const groupFields: string[] = [];
    
    // Handle new groupFields array (for pie, donut, radar)
    if (this.selectedFields.groupFields && Array.isArray(this.selectedFields.groupFields)) {
      this.selectedFields.groupFields.forEach((field: any) => {
        groupFields.push(field.fieldName || field.value);
      });
    }
    
    // Handle X-axis for bar/line/area charts
    if (this.selectedFields.xAxis) {
      groupFields.push(this.selectedFields.xAxis.fieldName || this.selectedFields.xAxis.value);
    }
    
    // Handle legacy single groupField
    if (this.selectedFields.groupField) {
      groupFields.push(this.selectedFields.groupField.fieldName || this.selectedFields.groupField.value);
    }
    
    return JSON.stringify(groupFields);
  }

  private buildMeasureFields(): string {
    const measureFields: string[] = [];
    
    // Handle new measureFields array (for pie, donut, radar, count)
    if (this.selectedFields.measureFields && Array.isArray(this.selectedFields.measureFields)) {
      this.selectedFields.measureFields.forEach((field: any) => {
        measureFields.push(field.fieldName || field.value);
      });
    }
    
    // Handle Y-axis for bar/line/area charts
    if (this.selectedFields.yAxis) {
      measureFields.push(this.selectedFields.yAxis.fieldName || this.selectedFields.yAxis.value);
    }
    
    // Handle table fields
    if (this.selectedFields.tableFields && Array.isArray(this.selectedFields.tableFields)) {
      this.selectedFields.tableFields.forEach((field: any) => {
        if (field.type === 'numeric') {
          measureFields.push(field.fieldName || field.value);
        }
      });
    }
    
    // Handle legacy countField
    if (this.selectedFields.countField) {
      measureFields.push(this.selectedFields.countField.fieldName || this.selectedFields.countField.value);
    }
    
    // Fallback if no measure fields selected
    if (measureFields.length === 0) {
      measureFields.push('Payment Id');
    }
    
    return JSON.stringify(measureFields);
  }

  private buildSearchFields(): string {
    const searchCriteria: any = {};
    this.selectedFilters.forEach(filter => {
      if (filter.field && filter.condition && filter.value) {
        searchCriteria[filter.field.name] = { condition: filter.condition, value: filter.value };
      }
    });
    return JSON.stringify(searchCriteria);
  }

  private buildAggregatorRules(): string {
    const rules: any[] = [];
    this.selectedFilters.forEach(filter => {
      if (filter.field && filter.condition && filter.value) {
        rules.push({
          fieldName: filter.field.fieldName, // Use fieldName instead of name (displayName)
          operator: this.mapOperator(filter.condition),
          fieldValue: filter.value
        });
      }
    });
    return JSON.stringify(rules.length === 1 ? rules[0] : { rules });
  }

  private buildLegacyFiltersForBackwardCompat(): string {
    // Keep older UI working by sending the previous flat map structure as well
    return this.buildSearchFields();
  }

  private mapOperator(cond: string): string {
    switch (cond) {
      case '=': return 'EQUALS';
      case '!=': return 'NOT_EQUALS';
      case '>': return 'GREATER_THAN';
      case '<': return 'LESS_THAN';
      default: return 'EQUALS';
    }
  }

  private getChartTypeForPreview(): string {
    const type = this.selectedChartType?.rules?.type;
    switch (type) {
      case 'bar': return 'bar';
      case 'line': return 'line';
      case 'pie': return 'pie';
      case 'donut': return 'doughnut';
      case 'area': return 'area';
      case 'table': return 'table';
      case 'count': return 'count';
      default: return 'bar';
    }
  }

  private getPreviewTitle(): string {
    if (this.widgetName.trim()) return this.widgetName;
    const dataSource = this.selectedDataSource?.name || 'Data';
    const chartType = this.selectedChartType?.title || 'Chart';
    return `${dataSource} ${chartType}`;
  }

  private generateFallbackPreviewData(): void {
    const chartType = this.selectedChartType?.rules?.type;
    this.previewData = {
      type: this.getChartTypeForPreview(),
      title: this.getPreviewTitle(),
      chartType: chartType,
      data: this.getMockDataForChartType(chartType)
    };
  }

  private getMockDataForChartType(chartType: string): any {
    switch (chartType) {
      case 'pie':
      case 'donut':
        return { 'COMPLETED': 1560, 'PENDING': 45, 'FAILED': 23, 'CANCELLED': 12 };
      case 'bar':
      case 'line':
      case 'area':
        return { 'ACH': 850, 'FEDNOW': 320, 'FEDWIRE': 480, 'RTP': 240, 'SWIFT': 157 };
      case 'count':
        return { total: 1847 };
      default:
        return { 'Category A': 420, 'Category B': 380, 'Category C': 280, 'Category D': 180 };
    }
  }

  // UI helpers for icons
  getDataSourceIcon(source: any): string {
    const icon: string = source?.icon || source?.value || '';
    switch (icon) {
      case 'payment':
      case 'payments':
        return 'fas fa-credit-card';
      case 'file_copy':
      case 'payment_files':
        return 'fas fa-file';
      case 'people':
      case 'customers':
        return 'fas fa-users';
      case 'account_balance':
      case 'accounts':
        return 'fas fa-university';
      case 'description':
      case 'documents':
        return 'fas fa-file-lines';
      case 'notifications':
        return 'fas fa-bell';
      default:
        return 'fas fa-database';
    }
  }

  getChartIcon(chart: any): string {
    const type: string = chart?.rules?.type || '';
    switch (type) {
      case 'table': return 'fas fa-table';
      case 'bar': return 'fas fa-chart-bar';
      case 'line': return 'fas fa-chart-line';
      case 'area': return 'fas fa-chart-area';
      case 'pie':
      case 'donut': return 'fas fa-chart-pie';
      case 'aggregated_table': return 'fas fa-table-list';
      case 'count': return 'fas fa-calculator';
      default: return 'fas fa-chart-bar';
    }
  }

  onCreated(widget: WidgetResponse) {
    this.dialogRef.close(widget);
  }

  getPreviewDataPoints(): number {
    if (!this.previewData?.data) return 0;
    
    const data = this.previewData.data;
    if (typeof data === 'object') {
      return Object.keys(data).length;
    }
    if (Array.isArray(data)) {
      return data.length;
    }
    return 1;
  }

  getCompletionMessage(): string {
    const completedSteps = [
      this.selectedDataSource,
      this.selectedChartType,
      this.getSelectedFieldsCount() > 0,
      true, // filters are optional
      true, // preview is optional
      true  // save step
    ].filter(Boolean).length;

    if (completedSteps >= 3) {
      return 'Looking good! You can proceed to create your widget.';
    } else if (completedSteps >= 2) {
      return 'Almost there! Complete the field mapping to continue.';
    } else {
      return 'Select your data source and chart type to get started.';
    }
  }

  onCancelled() {
    this.dialogRef.close();
  }
}


