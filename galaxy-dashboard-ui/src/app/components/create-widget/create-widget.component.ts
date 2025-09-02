import { Component, OnInit, OnDestroy, Inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../services/theme.service';
import { WidgetAccordionService } from '../../services/widget-accordion.service';
import { LoadingService } from '../../services/loading.service';
import { DashboardService } from '../../services/dashboard.service';
import { ConfigurationService } from '../../services/configuration.service';
import { CreateWidgetRequest, ChartType, WidgetDataRequest, ChartConfigResponse, DashboardDatasourceConfigResponse } from '../../models/dashboard.models';
import { BarChartComponent } from '../bar-chart/bar-chart.component';
import { FormsModule } from '@angular/forms';
import { LineChartComponent } from '../line-chart/line-chart.component';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';
import { AreaChartComponent } from '../area-chart/area-chart.component';
import { DoughnutChartComponent } from '../doughnut-chart/doughnut-chart.component';
import { PieChartComponent } from '../pie-chart/pie-chart.component';
import { HorizontalBarChartComponent } from '../horizontal-bar-chart/horizontal-bar-chart.component';
import { DataTableComponent } from '../data-table/data-table.component';
import { RadarChartComponent } from '../radar-chart/radar-chart.component';
import { ChartWidgetComponent } from '../chart-widget/chart-widget.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, BarChartComponent, LineChartComponent, KpiCardComponent,
    AreaChartComponent, DoughnutChartComponent, PieChartComponent, HorizontalBarChartComponent, DataTableComponent, RadarChartComponent, ChartWidgetComponent
  ],
  selector: 'app-create-widget',
  templateUrl: './create-widget.component.html',
  styleUrls: ['./create-widget.component.scss']
})
export class CreateWidgetComponent implements OnInit, OnDestroy {
  @Output() widgetCreated = new EventEmitter<any>();
  
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

  // AI-style dynamic summary
  aiSummary: string = 'Start by selecting a data source and a chart type. I will summarize your choices here in real-time.';

  // Selections (replicating AddWidgetDialog logic)
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
  availableFields: { name: string; type: string; category?: string }[] = [];

  get numericFields() {
    return this.availableFields.filter(f => f.type === 'numeric');
  }

  get textFields() {
    return this.availableFields.filter(f => f.type === 'text');
  }

  // Get all available fields for flexible selection
  get allAvailableFields() {
    return this.availableFields;
  }

  // Filter config
  filterFields: any[] = [];

  // Group fields for pie/donut and aggregated tables
  groupFields: any[] = [];
  
  // Measure fields for aggregations
  measureFields: any[] = [];

  // Navigation
  next() {
    if (this.stepIndex < this.steps.length - 1 && this.canProceed()) {
      this.stepIndex++;
      
      // Generate preview when reaching step 4 (preview step)
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
    this.updateAiSummary();
  }

  private loadFieldsForSelectedDataSource(): void {
    if (!this.selectedDataSource) return;

    // Get the datasource config for the selected source
    this.configurationService.getAllDatasourceConfigs().subscribe({
      next: (configs: DashboardDatasourceConfigResponse[]) => {
        console.log('All datasource configs:', configs);
        console.log('Selected datasource value:', this.selectedDataSource.value);
        const current = configs.find(c => c.name === this.selectedDataSource.value);
        console.log('Found datasource config:', current);
        if (current) {
          console.log('Loading fields for datasource:', current);
          
          try {
            // Parse JSON strings from the backend
            console.log('Raw groupFields from backend:', current.groupFields);
            console.log('Raw measureFields from backend:', current.measureFields);
            console.log('Raw searchFields from backend:', current.searchFields);
            
            const groupFs = current.groupFields ? JSON.parse(current.groupFields) : [];
            const measureFs = current.measureFields ? JSON.parse(current.measureFields) : [];
            const searchFs = current.searchFields ? JSON.parse(current.searchFields) : [];

            console.log('Parsed fields for selected datasource:', { groupFs, measureFs, searchFs });
            
            // Debug: Check individual field properties
            if (groupFs.length > 0) {
              console.log('First group field sample:', groupFs[0]);
              console.log('Group field properties:', Object.keys(groupFs[0]));
            }
            if (measureFs.length > 0) {
              console.log('First measure field sample:', measureFs[0]);
              console.log('Measure field properties:', Object.keys(measureFs[0]));
            }

            // Create a unified list of all available fields for flexible selection
            // Users can choose any field for any axis based on chart type
            this.availableFields = [
              // Group fields (can be used for X-axis, grouping, etc.)
              ...groupFs.map((f: any) => ({ 
                name: f.displayName || f.fieldName, 
                displayName: f.displayName || f.fieldName,
                fieldName: f.fieldName,
                type: 'text', // Use 'text' to match template expectations
                source: 'groupFields'
              })),
              // Measure fields (can be used for Y-axis, aggregation, etc.)
              ...measureFs.map((f: any) => ({ 
                name: f.displayName || f.fieldName, 
                displayName: f.displayName || f.fieldName,
                fieldName: f.fieldName,
                type: 'numeric', // Use 'numeric' to match template expectations
                aggregation: f.aggregation || 'SUM',
                source: 'measureFields'
              }))
            ];
            
            // Keep separate lists for specific use cases
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
            
            // Search/Filter fields for filtering
            this.filterFields = searchFs.map((f: any) => ({ 
              name: f.fieldName, 
              displayName: f.displayName || f.fieldName,
              operator: f.operator,
              fieldValue: f.fieldValue,
              type: this.getFilterFieldType(f.operator),
              conditions: this.getFilterConditions(f.operator)
            }));

            console.log('Updated fields for selected datasource:', {
              availableFields: this.availableFields,
              groupFields: this.groupFields,
              measureFields: this.measureFields,
              filterFields: this.filterFields
            });
            
            // Debug: Check if fields are properly populated
            console.log('Field counts:', {
              availableFieldsCount: this.availableFields.length,
              groupFieldsCount: this.groupFields.length,
              measureFieldsCount: this.measureFields.length,
              filterFieldsCount: this.filterFields.length
            });
            
            // Debug: Show first few fields
            if (this.availableFields.length > 0) {
              console.log('First available field:', this.availableFields[0]);
            }
            if (this.groupFields.length > 0) {
              console.log('First group field:', this.groupFields[0]);
            }
            if (this.measureFields.length > 0) {
              console.log('First measure field:', this.measureFields[0]);
            }
          } catch (error) {
            console.error('Error parsing JSON fields for datasource:', error);
            // Set default empty arrays if parsing fails
            this.availableFields = [];
            this.groupFields = [];
            this.measureFields = [];
            this.filterFields = [];
          }
        }
      },
      error: (err) => {
        console.error('Failed to load datasource configs for field loading:', err);
        this.availableFields = [];
        this.groupFields = [];
        this.measureFields = [];
        this.filterFields = [];
      }
    });
  }

  // Helper method to determine filter field type based on operator
  private getFilterFieldType(operator: string): string {
    switch (operator?.toUpperCase()) {
      case 'BETWEEN':
        return 'daterange';
      case 'IN':
        return 'dropdown';
      case '=':
      case '!=':
      case '<':
      case '>':
      case '>=':
      case '<=':
        return 'text';
      default:
        return 'text';
    }
  }

  // Helper method to get available filter conditions based on operator
  private getFilterConditions(operator: string): string[] {
    switch (operator?.toUpperCase()) {
      case 'BETWEEN':
        return ['BETWEEN'];
      case 'IN':
        return ['IN', 'NOT IN'];
      case '=':
        return ['=', '!=', '<', '>', '>=', '<=', 'LIKE', 'NOT LIKE'];
      default:
        return ['=', '!=', '<', '>', '>=', '<=', 'LIKE', 'NOT LIKE'];
    }
  }

  selectChart(chart: any) {
    this.selectedChartType = chart;
    this.selectedFields = {};
    this.updateAiSummary();
  }

  selectField(field: any, fieldType: string) {
    // For bar, line, area charts - users can choose any field for any axis
    if (fieldType === 'xAxis' || fieldType === 'yAxis') {
      this.selectedFields[fieldType] = field;
      this.updateAiSummary();
      return;
    }

    // For pie/donut charts - any field can be used for grouping
    if (fieldType === 'groupField') {
      this.selectedFields.groupField = field;
      this.updateAiSummary();
      return;
    }

    // For tables - users can select any fields
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
      this.updateAiSummary();
      return;
    }

    // For count/KPI cards - any field can be used
    if (fieldType === 'countField') {
      this.selectedFields.countField = field;
      this.updateAiSummary();
    }
  }

  isFieldSelected(field: any, fieldType: string): boolean {
    if (fieldType === 'xAxis' || fieldType === 'yAxis') {
      return this.selectedFields[fieldType] === field;
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
    return Array.isArray(this.selectedFields.tableFields) ? this.selectedFields.tableFields.length : 0;
  }

  getMaxFieldsForChartType(): number {
    if (this.selectedChartType?.rules?.type === 'aggregated_table') {
      return 6;
    }
    return 8;
  }

  addFilter() {
    this.selectedFilters.push({ field: null, condition: null, value: null });
    this.updateAiSummary();
  }

  removeFilter(index: number) {
    this.selectedFilters.splice(index, 1);
    this.updateAiSummary();
  }

  getFilterFieldOptions(fieldName: string): any {
    return this.filterFields.find(f => f.name === fieldName);
  }

  // Validation (replicates AddWidgetDialog canProceed)
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
          // For bar/line/area charts, users can put any field on any axis
          return !!this.selectedFields.xAxis && !!this.selectedFields.yAxis;
        }
        if (type === 'pie' || type === 'donut') {
          // For pie/donut, any field can be used for grouping
          return !!this.selectedFields.groupField;
        }
        if (type === 'aggregated_table') {
          return this.selectedFields.tableFields && this.selectedFields.tableFields.length > 0 && !!this.selectedFields.groupField;
        }
        if (type === 'count') {
          // For count/KPI cards, any field can be used
          return !!this.selectedFields.countField;
        }
        return true;
      }
      case 3:
        return true; // Filters optional
      case 4:
        return true; // Preview
      case 5:
        return !!this.widgetName.trim(); // Require name on save
      default:
        return false;
    }
  }

  // Save
  createWidget() {
    if (!this.canCreateWidget()) {
      return;
    }

    const request: CreateWidgetRequest = {
      name: this.widgetName,
      description: this.widgetDescription,
      dataSource: this.selectedDataSource?.value || 'payments',
      chartType: this.mapChartType(this.selectedChartType?.rules?.type),
      refreshInterval: 30,
      groupFields: this.buildGroupFields(),
      measureFields: this.buildMeasureFields(),
      filterCriteria: this.buildSearchFields()
    };

    console.log('Creating widget with request:', request);

    this.widgetAccordionService.createWidget(request).subscribe({
      next: (widget) => {
        console.log('Widget created successfully:', widget);
        this.widgetCreated.emit(widget);
        this.resetForm();
      },
      error: (error) => {
        console.error('Failed to create widget:', error);
      }
    });
  }

  private canCreateWidget(): boolean {
    return !!(
      this.widgetName?.trim() &&
      this.selectedDataSource &&
      this.selectedChartType
    );
  }

  private mapChartType(frontendType: string): ChartType {
    const typeMapping: { [key: string]: ChartType } = {
      'bar': ChartType.VERTICAL_BAR,
      'horizontal-bar': ChartType.HORIZONTAL_BAR,
      'line': ChartType.LINE_CHART,
      'pie': ChartType.PIE,
      'doughnut': ChartType.DONUT,
      'area': ChartType.AREA_CHART,
      'table': ChartType.TABLE,
      'count': ChartType.COUNT,
      'radar': ChartType.RADAR_CHART
    };
    
    return typeMapping[frontendType] || ChartType.TABLE;
  }

  private resetForm(): void {
    this.widgetName = '';
    this.widgetDescription = '';
    this.selectedDataSource = null;
    this.selectedChartType = null;
    this.selectedFields = {};
    this.selectedFilters = [];
    this.previewData = null;
    this.stepIndex = 0;
  }

  /**
   * Generates preview data for the chart based on current selections
   */
  generatePreviewData(): void {
    if (!this.selectedDataSource || !this.selectedChartType) {
      return;
    }

    this.isLoadingPreview = true;

    // Create a mock widget data request based on current selections
    const request: WidgetDataRequest = {
      widgetId: 0, // Use 0 for preview since widget doesn't exist yet
      dataSource: this.selectedDataSource.value,
      groupFields: this.buildGroupFields(),
      measureFields: this.buildMeasureFields(),
      searchFields: this.buildSearchFields()
    };

    // Get preview data from the dashboard service
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
          console.warn('Preview data generation failed:', response.errorMessage);
          this.generateFallbackPreviewData();
        }
      },
      error: (error) => {
        this.isLoadingPreview = false;
        console.error('Error generating preview data:', error);
        this.generateFallbackPreviewData();
      }
    });
  }

  /**
   * Map chart type to component type for preview
   */
  getComponentTypeFromChartType(chartType?: string): string | null {
    if (!chartType) return null;
    console.log(chartType);
    console.log("Chart type:", chartType.toLowerCase());
    console.log(this.previewData);
    switch (chartType.toLowerCase()) {
      case 'table':
      case 'aggregated_table':
        return 'data-table';
      case 'pie':
        return 'pie-chart';
      case 'donut':
        return 'doughnut-chart';
      case 'bar':
        return 'bar-chart';
      case 'horizontal_bar':
        return 'horizontal-bar-chart';
      case 'line':
        return 'line-chart';
      case 'area':
        return 'area-chart';
      case 'count':
        return 'kpi-card';
      case 'radar':
        return 'radar-chart';
      default:
        return 'chart-widget';
    }
  }

  /**
   * Generates fallback preview data when API call fails
   */
  private generateFallbackPreviewData(): void {
    const chartType = this.selectedChartType?.rules?.type;
    
    this.previewData = {
      type: this.getChartTypeForPreview(),
      title: this.getPreviewTitle(),
      chartType: chartType,
      data: this.getMockDataForChartType(chartType)
    };
  }

  /**
   * Builds group fields JSON string from current selections
   */
  private buildGroupFields(): string {
    const groupFields = [];
    
    if (this.selectedFields.groupField) {
      groupFields.push(this.selectedFields.groupField.name || this.selectedFields.groupField.value);
    }
    
    return JSON.stringify(groupFields);
  }

  /**
   * Builds measure fields JSON string from current selections
   */
  private buildMeasureFields(): string {
    const measureFields = [];
    
    if (this.selectedFields.yAxis) {
      measureFields.push(this.selectedFields.yAxis.name);
    } else if (this.selectedFields.countField) {
      measureFields.push(this.selectedFields.countField.name);
    } else if (this.selectedFields.tableFields) {
      this.selectedFields.tableFields.forEach((field: any) => {
        if (field.type === 'numeric') {
          measureFields.push(field.name);
        }
      });
    }
    
    // Default to Payment Id for count operations
    if (measureFields.length === 0) {
      measureFields.push('Payment Id');
    }
    
    return JSON.stringify(measureFields);
  }

  /**
   * Builds search fields JSON string from current filter selections
   */
  private buildSearchFields(): string {
    const searchCriteria: any = {};
    
    this.selectedFilters.forEach(filter => {
      if (filter.field && filter.condition && filter.value) {
        searchCriteria[filter.field.name] = {
          condition: filter.condition,
          value: filter.value
        };
      }
    });
    
    return JSON.stringify(searchCriteria);
  }

  /**
   * Gets the chart type string for chart component
   */
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

  /**
   * Generates a preview title based on current selections
   */
  private getPreviewTitle(): string {
    if (this.widgetName.trim()) {
      return this.widgetName;
    }
    
    const dataSource = this.selectedDataSource?.name || 'Data';
    const chartType = this.selectedChartType?.title || 'Chart';
    
    return `${dataSource} ${chartType}`;
  }

  /**
   * Gets mock data for specific chart types for fallback scenarios
   */
  private getMockDataForChartType(chartType: string): any {
    switch (chartType) {
      case 'pie':
      case 'donut':
        return {
          'COMPLETED': 1560,
          'PENDING': 45,
          'FAILED': 23,
          'CANCELLED': 12
        };
      case 'bar':
      case 'line':
      case 'area':
        return {
          'ACH': 850,
          'FEDNOW': 320,
          'FEDWIRE': 480,
          'RTP': 240,
          'SWIFT': 157
        };
      case 'count':
        return { total: 1847 };
      default:
        return {
          'Category A': 420,
          'Category B': 380,
          'Category C': 280,
          'Category D': 180
        };
    }
  }

  // Theme subscription
  private themeSubscription: Subscription = new Subscription();

  constructor(
    private themeService: ThemeService,
    @Inject(DOCUMENT) private document: Document,
    private widgetAccordionService: WidgetAccordionService,
    public loadingService: LoadingService,
    private dashboardService: DashboardService,
    private configurationService: ConfigurationService
  ) {}

  ngOnInit(): void {
    // Load dynamic configuration
    this.loadDatasourceAndChartConfigs();

    // Subscribe to theme changes and regenerate preview if needed
    this.themeSubscription = this.themeService.themeChanges$.subscribe(palette => {
      if (palette) {
        console.log('Theme changed to:', palette.name);
        // Regenerate preview data with new theme colors if we're on preview step
        if (this.stepIndex === 4 && this.previewData) {
          setTimeout(() => {
            this.generatePreviewData();
          }, 100);
        }
      }
    });
  }

  private loadDatasourceAndChartConfigs(): void {
    // Datasources
    console.log("Hehe");
    
    this.configurationService.getAllDatasourceConfigs().subscribe({
      next: (configs: DashboardDatasourceConfigResponse[]) => {
        console.log('Loaded datasource configs:', configs);
        this.dataSources = configs.map(c => ({
          name: c.displayName || c.name,
          description: c.description || '',
          icon: 'database',
          value: c.name
        }));

        // Default to first data source
        if (!this.selectedDataSource && this.dataSources.length > 0) {
          this.selectDataSource(this.dataSources[0]);
        }

        // Don't populate fields here - let loadFieldsForSelectedDataSource handle it
        // This prevents duplicate and conflicting field loading
      },
      error: (err) => console.error('Failed to load datasource configs', err)
    });

    // Hardcode chart types instead of fetching from DB
    this.loadHardcodedChartTypes();
  }

  private loadHardcodedChartTypes(): void {
    this.chartTypes = [
      {
        title: 'Vertical Bar Chart',
        icon: 'bar_chart',
        description: 'Vertical bar chart for comparing values',
        rules: { type: 'bar', maxFields: 8, requiresGroupFields: false, requiresXAxis: true, requiresYAxis: true }
      },
      {
        title: 'Horizontal Bar Chart',
        icon: 'bar_chart',
        description: 'Horizontal bar chart for comparing values',
        rules: { type: 'horizontal_bar', maxFields: 8, requiresGroupFields: false, requiresXAxis: true, requiresYAxis: true }
      },
      {
        title: 'Line Chart',
        icon: 'show_chart',
        description: 'Line chart for showing trends over time',
        rules: { type: 'line', maxFields: 8, requiresGroupFields: false, requiresXAxis: true, requiresYAxis: true }
      },
      {
        title: 'Area Chart',
        icon: 'area_chart',
        description: 'Area chart for showing trends with filled areas',
        rules: { type: 'area', maxFields: 8, requiresGroupFields: false, requiresXAxis: true, requiresYAxis: true }
      },
      {
        title: 'Pie Chart',
        icon: 'pie_chart',
        description: 'Pie chart for showing proportions',
        rules: { type: 'pie', maxFields: 6, requiresGroupFields: true, requiresXAxis: false, requiresYAxis: false }
      },
      {
        title: 'Donut Chart',
        icon: 'donut_large',
        description: 'Donut chart for showing proportions',
        rules: { type: 'donut', maxFields: 6, requiresGroupFields: true, requiresXAxis: false, requiresYAxis: false }
      },
      {
        title: 'Table',
        icon: 'table_chart',
        description: 'Data table for displaying structured data',
        rules: { type: 'table', maxFields: 8, requiresGroupFields: false, requiresXAxis: false, requiresYAxis: false }
      },
      {
        title: 'Aggregated Table',
        icon: 'table_chart',
        description: 'Table with grouped and aggregated data',
        rules: { type: 'aggregated_table', maxFields: 6, requiresGroupFields: true, requiresXAxis: false, requiresYAxis: false }
      },
      {
        title: 'KPI Card',
        icon: 'assessment',
        description: 'Single value display card',
        rules: { type: 'count', maxFields: 1, requiresGroupFields: false, requiresXAxis: false, requiresYAxis: false }
      },
      {
        title: 'Radar Chart',
        icon: 'radar',
        description: 'Radar chart for multi-dimensional data',
        rules: { type: 'radar', maxFields: 6, requiresGroupFields: false, requiresXAxis: false, requiresYAxis: false }
      }
    ];
    
    console.log('Loaded hardcoded chart types:', this.chartTypes);
  }



  ngOnDestroy(): void {
    // Clean up theme subscription
    this.themeSubscription.unsubscribe();
  }

  private updateAiSummary(): void {
    const parts: string[] = [];
    if (this.selectedDataSource) {
      parts.push(`Using ${this.selectedDataSource.name} as data source`);
    } else {
      parts.push('Pick a data source to begin');
    }

    if (this.selectedChartType) {
      parts.push(`with a ${this.selectedChartType.title.toLowerCase()}`);
    } else {
      parts.push('and choose a chart type');
    }

    const type = this.selectedChartType?.rules?.type;
    if (type === 'bar' || type === 'line' || type === 'area') {
      const x = this.selectedFields.xAxis?.displayName || this.selectedFields.xAxis?.name;
      const y = this.selectedFields.yAxis?.displayName || this.selectedFields.yAxis?.name;
      if (x || y) {
        parts.push(`mapping ${x ? 'X: ' + x : ''}${x && y ? ' / ' : ''}${y ? 'Y: ' + y : ''}`);
      }
    }
    if (type === 'pie' || type === 'donut') {
      const g = this.selectedFields.groupField?.displayName || this.selectedFields.groupField?.name;
      if (g) parts.push(`grouped by ${g}`);
    }
    if (type === 'table' || type === 'aggregated_table') {
      const count = this.getSelectedFieldsCount();
      if (count > 0) parts.push(`${count} field${count > 1 ? 's' : ''} selected`);
    }
    if (type === 'count' && this.selectedFields.countField?.displayName || this.selectedFields.countField?.name) {
      parts.push(`counting ${this.selectedFields.countField.displayName || this.selectedFields.countField.name}`);
    }

    if (this.selectedFilters.length > 0) {
      parts.push(`${this.selectedFilters.length} filter${this.selectedFilters.length > 1 ? 's' : ''} applied`);
    }

    this.aiSummary = parts.join(', ') + '.';
  }

  // UI helpers for FA icons
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
      case 'table':
        return 'fas fa-table';
      case 'bar':
        return 'fas fa-chart-bar';
      case 'line':
        return 'fas fa-chart-line';
      case 'area':
        return 'fas fa-chart-area';
      case 'pie':
      case 'donut':
        return 'fas fa-chart-pie';
      case 'aggregated_table':
        return 'fas fa-table-list';
      case 'count':
        return 'fas fa-calculator';
      default:
        return 'fas fa-chart-bar';
    }
  }
}
