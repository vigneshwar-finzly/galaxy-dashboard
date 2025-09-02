import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { CreateWidgetRequest, UpdateWidgetRequest, WidgetResponse, ChartType } from '../../models/dashboard.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  selector: 'app-widget-creator',
  templateUrl: './widget-creator.component.html',
  styleUrls: ['./widget-creator.component.scss']
})
export class WidgetCreatorComponent implements OnInit, OnDestroy {
  @Input() isEditing = false;
  @Input() editingWidget: WidgetResponse | null = null;
  @Output() widgetCreated = new EventEmitter<WidgetResponse>();
  @Output() widgetUpdated = new EventEmitter<WidgetResponse>();
  @Output() cancelled = new EventEmitter<void>();

  // Step management (same as create-widget)
  stepIndex = 0;
  steps = [
    { label: 'Data Source' },
    { label: 'Chart Type' },
    { label: 'Fields' },
    { label: 'Filters' },
    { label: 'Preview' },
    { label: 'Save' }
  ];

  // Form data
  widgetName = '';
  widgetDescription = '';
  selectedDataSource: any = null;
  selectedChartType: any = null;
  selectedFields: any = {};
  selectedFilters: Array<{ field: any; condition: string | null; value: any }> = [];
  refreshInterval = 30;

  // Preview data
  previewData: any = null;
  isLoadingPreview = false;

  // Loading state
  isLoading = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // AI-style dynamic summary
  aiSummary: string = 'Start by selecting a data source and a chart type. I will summarize your choices here in real-time.';

  // Data sources (same as create-widget)
  dataSources = [
    { name: 'Payments', description: 'Payment transaction data and analytics', icon: 'payment', value: 'payments' },
    { name: 'Bulk Files', description: 'Payment file processing data', icon: 'file_copy', value: 'payment_files' },
    { name: 'CRM', description: 'Customer information and profiles', icon: 'people', value: 'customers' },
    { name: 'Ledger', description: 'Account management data', icon: 'account_balance', value: 'accounts' },
    { name: 'Documents', description: 'Document management and storage', icon: 'description', value: 'documents' },
    { name: 'Notifications', description: 'System notifications and alerts', icon: 'notifications', value: 'notifications' }
  ];

  // Chart types (same as create-widget)
  chartTypes = [
    { title: 'Table', icon: 'table_chart', description: 'Display data in tabular format', rules: { type: 'table', maxFields: 8, requiresGroupFields: false, requiresXAxis: false, requiresYAxis: false } },
    { title: 'Bar Chart', icon: 'bar_chart', description: 'Compare values across categories', rules: { type: 'bar', maxFields: 1, requiresGroupFields: false, requiresXAxis: true, requiresYAxis: true } },
    { title: 'Line Chart', icon: 'show_chart', description: 'Show trends over time or continuous data', rules: { type: 'line', maxFields: 1, requiresGroupFields: false, requiresXAxis: true, requiresYAxis: true } },
    { title: 'Area Chart', icon: 'area_chart', description: 'Display volume and trends with filled areas', rules: { type: 'area', maxFields: 1, requiresGroupFields: false, requiresXAxis: true, requiresYAxis: true } },
    { title: 'Pie Chart', icon: 'pie_chart', description: 'Show proportions of a whole', rules: { type: 'pie', maxFields: 1, requiresGroupFields: true, requiresXAxis: false, requiresYAxis: false } },
    { title: 'Donut Chart', icon: 'donut_small', description: 'Pie chart with center space', rules: { type: 'donut', maxFields: 1, requiresGroupFields: true, requiresXAxis: false, requiresYAxis: false } },
    { title: 'Aggregated Table', icon: 'table_view', description: 'Display summarized data with aggregations', rules: { type: 'aggregated_table', maxFields: 6, requiresGroupFields: true, requiresXAxis: false, requiresYAxis: false } },
    { title: 'Count Widget', icon: 'calculate', description: 'Display count or sum of selected field', rules: { type: 'count', maxFields: 1, requiresGroupFields: false, requiresXAxis: false, requiresYAxis: false } }
  ];

  // Available fields (same as create-widget)
  availableFields = [
    { name: 'Payment ID', type: 'text', category: 'identifier' },
    { name: 'Sender Amount', type: 'numeric', category: 'amount' },
    { name: 'Fee Amount', type: 'numeric', category: 'amount' },
    { name: 'Payment Date', type: 'date', category: 'date' },
    { name: 'Delivery Date', type: 'date', category: 'date' },
    { name: 'Department', type: 'text', category: 'organization' },
    { name: 'Channel', type: 'text', category: 'organization' },
    { name: 'Book', type: 'text', category: 'organization' }
  ];

  get numericFields() {
    return this.availableFields.filter(f => f.type === 'numeric');
  }

  // Filter config (same as create-widget)
  filterFields = [
    { name: 'IoType', type: 'dropdown', options: ['IN', 'OUT'], conditions: ['=', '!='] },
    { name: 'DeliveryMethod', type: 'dropdown', options: ['ACH', 'FEDWIRE', 'FEDNOW', 'RTP', 'SWIFT'], conditions: ['=', '!='] },
    { name: 'PaymentStatus', type: 'dropdown', options: ['INITIATED', 'VALIDATION_FAILED', 'PROCESSED', 'VALIDATED', 'COMPLIANCE_SUBMITTED', 'BLOCKED', 'REJECTED', 'CANCELLED'], conditions: ['=', '!='] },
    { name: 'Delivery Date', type: 'date', conditions: ['<', '>', '='], dateOnly: true },
    { name: 'Payment Date', type: 'date', conditions: ['<', '>', '='], dateOnly: true },
    { name: 'MemoPostStatus', type: 'dropdown', options: ['POSTED', 'NOT_APPLICABLE', 'NOT_POSTED', 'FAILURE'], conditions: ['=', '!='] },
    { name: 'Channel', type: 'dropdown', options: ['API', 'CASHOS', 'TELLER', 'WIRE'], conditions: ['=', '!='] },
    { name: 'Book', type: 'dropdown', options: ['GALAXY_OUTGOING', 'GALAXY_INCOMING'], conditions: ['=', '!='] }
  ];

  // Group fields for pie/donut and aggregated tables
  groupFields = [
    { name: 'Delivery Method', value: 'DeliveryMethod' },
    { name: 'Payment Status', value: 'PaymentStatus' },
    { name: 'Memo Post Status', value: 'MemoPostStatus' },
    { name: 'Department', value: 'Department' },
    { name: 'Channel', value: 'Channel' },
    { name: 'Book', value: 'Book' },
    { name: 'Sender Currency', value: 'SenderCurrency' },
    { name: 'Receiver Currency', value: 'ReceiverCurrency' },
    { name: 'IOType', value: 'IoType' }
  ];

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    if (this.isEditing && this.editingWidget) {
      this.loadWidgetData();
    }
    this.updateAiSummary();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Load widget data for editing
  loadWidgetData(): void {
    if (!this.editingWidget) return;

    this.widgetName = this.editingWidget.name;
    this.widgetDescription = this.editingWidget.description || '';
    
    // Find matching data source and chart type objects
    this.selectedDataSource = this.dataSources.find(ds => ds.value === this.editingWidget!.dataSource) || null;
    this.selectedChartType = this.chartTypes.find(ct => ct.title === this.editingWidget!.chartType) || null;
    
    this.refreshInterval = this.editingWidget.refreshInterval;
    
    // Parse existing fields and filters if they exist
    try {
      if (this.editingWidget.groupFields) {
        const groupFields = JSON.parse(this.editingWidget.groupFields);
        if (groupFields.length > 0) {
          this.selectedFields.groupField = this.groupFields.find(gf => gf.value === groupFields[0]);
        }
      }
    } catch (e) {
      console.warn('Could not parse group fields:', e);
    }

    this.updateAiSummary();
  }

  // Navigation (same as create-widget)
  next(): void {
    console.log('Next button clicked, current step:', this.stepIndex);
    if (this.stepIndex < this.steps.length - 1 && this.canProceed()) {
      this.stepIndex++;
      console.log('Advanced to step:', this.stepIndex);
      
      // Generate preview when reaching step 4 (preview step)
      if (this.stepIndex === 4) {
        this.generatePreviewData();
      }
    }
  }

  prev(): void {
    console.log('Previous button clicked, current step:', this.stepIndex);
    if (this.stepIndex > 0) {
      this.stepIndex--;
      console.log('Went back to step:', this.stepIndex);
    }
  }

  goToStep(i: number): void {
    console.log('Go to step clicked:', i);
    if (i >= 0 && i < this.steps.length) {
      this.stepIndex = i;
      console.log('Navigated to step:', this.stepIndex);
    }
  }

  // Selection handlers (same as create-widget)
  selectDataSource(source: any): void {
    console.log('Data source selected:', source);
    this.selectedDataSource = source;
    this.updateAiSummary();
  }

  selectChart(chart: any): void {
    console.log('Chart type selected:', chart);
    this.selectedChartType = chart;
    this.selectedFields = {};
    this.updateAiSummary();
  }

  selectField(field: any, fieldType: string): void {
    if (fieldType === 'xAxis' || fieldType === 'yAxis') {
      this.selectedFields[fieldType] = field;
      this.updateAiSummary();
      return;
    }

    if (fieldType === 'groupField') {
      this.selectedFields.groupField = field;
      this.updateAiSummary();
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
      this.updateAiSummary();
      return;
    }

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
    return this.selectedChartType?.rules?.maxFields || 8;
  }

  // Filter management
  addFilter(): void {
    this.selectedFilters.push({
      field: null,
      condition: null,
      value: ''
    });
  }

  removeFilter(index: number): void {
    this.selectedFilters.splice(index, 1);
  }

  // Preview generation
  generatePreviewData(): void {
    this.isLoadingPreview = true;
    // Simulate preview generation
    setTimeout(() => {
      this.previewData = {
        chartType: this.selectedChartType?.title,
        dataSource: this.selectedDataSource?.name,
        fields: this.selectedFields,
        filters: this.selectedFilters
      };
      this.isLoadingPreview = false;
    }, 1000);
  }

  // AI Summary update
  updateAiSummary(): void {
    let summary = '';
    
    if (!this.selectedDataSource && !this.selectedChartType) {
      summary = 'Start by selecting a data source and a chart type. I will summarize your choices here in real-time.';
    } else if (this.selectedDataSource && !this.selectedChartType) {
      summary = `Great! You've selected ${this.selectedDataSource.name} as your data source. Now choose a chart type to visualize your data.`;
    } else if (this.selectedDataSource && this.selectedChartType) {
      summary = `Perfect! You're creating a ${this.selectedChartType.title} widget using ${this.selectedDataSource.name} data. `;
      
      if (Object.keys(this.selectedFields).length > 0) {
        summary += 'You have configured some fields. ';
      } else {
        summary += 'Next, configure the fields for your visualization. ';
      }
      
      if (this.selectedFilters.length > 0) {
        summary += `You have ${this.selectedFilters.length} filter(s) applied.`;
      }
    }
    
    this.aiSummary = summary;
  }

  // Step validation (same as create-widget)
  canProceed(): boolean {
    switch (this.stepIndex) {
      case 0: // Data Source
        return !!this.selectedDataSource;
      case 1: // Chart Type
        return !!this.selectedChartType;
      case 2: // Fields
        return this.validateFields();
      case 3: // Filters
        return true; // Filters are optional
      case 4: // Preview
        return true;
      case 5: // Save
        return this.isFormValid();
      default:
        return false;
    }
  }

  validateFields(): boolean {
    if (!this.selectedChartType) return false;
    
    const rules = this.selectedChartType.rules;
    
    if (rules.requiresXAxis && !this.selectedFields.xAxis) return false;
    if (rules.requiresYAxis && !this.selectedFields.yAxis) return false;
    if (rules.requiresGroupFields && !this.selectedFields.groupField) return false;
    
    if (rules.type === 'table' && (!this.selectedFields.tableFields || this.selectedFields.tableFields.length === 0)) return false;
    if (rules.type === 'count' && !this.selectedFields.countField) return false;
    
    return true;
  }

  // Form validation
  isFormValid(): boolean {
    return !!(
      this.widgetName.trim() &&
      this.selectedDataSource &&
      this.selectedChartType &&
      this.validateFields()
    );
  }

  // Save widget (create or update) - called from step 5
  saveWidget(): void {
    if (!this.isFormValid()) {
      this.notificationService.error('Validation Error', 'Please fill in all required fields');
      return;
    }

    this.isLoading = true;

    if (this.isEditing && this.editingWidget) {
      this.updateWidget();
    } else {
      this.createWidget();
    }
  }

  // Create new widget
  createWidget(): void {
    const createRequest: CreateWidgetRequest = {
      name: this.widgetName.trim(),
      description: this.widgetDescription.trim() || undefined,
      chartType: this.mapChartTypeToEnum(this.selectedChartType.title),
      dataSource: this.selectedDataSource.value,
      refreshInterval: this.refreshInterval,
      groupFields: JSON.stringify(this.selectedFields.groupField ? [this.selectedFields.groupField.value] : []),
      measureFields: JSON.stringify(this.selectedFields.tableFields || []),
      filterCriteria: JSON.stringify(this.selectedFilters || []),
      widgetConfig: JSON.stringify({
        xAxis: this.selectedFields.xAxis,
        yAxis: this.selectedFields.yAxis,
        countField: this.selectedFields.countField
      })
    };

    const sub = this.apiService.createWidget(createRequest).subscribe({
      next: (response) => {
        this.notificationService.success('Success', `Widget "${this.widgetName}" created successfully`);
        this.widgetCreated.emit(response.data);
        this.resetForm();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error creating widget:', error);
        const errorMessage = error.error?.message || error.message || 'Unknown error occurred';
        this.notificationService.error('Creation Failed', `Failed to create widget: ${errorMessage}`);
        this.isLoading = false;
      }
    });

    this.subscriptions.push(sub);
  }

  // Update existing widget
  updateWidget(): void {
    if (!this.editingWidget) return;

    const updateRequest: UpdateWidgetRequest = {
      name: this.widgetName.trim(),
      description: this.widgetDescription.trim() || undefined,
      chartType: this.mapChartTypeToEnum(this.selectedChartType.title),
      dataSource: this.selectedDataSource.value,
      refreshInterval: this.refreshInterval,
      groupFields: JSON.stringify(this.selectedFields.groupField ? [this.selectedFields.groupField.value] : []),
      measureFields: JSON.stringify(this.selectedFields.tableFields || []),
      filterCriteria: JSON.stringify(this.selectedFilters || []),
      widgetConfig: JSON.stringify({
        xAxis: this.selectedFields.xAxis,
        yAxis: this.selectedFields.yAxis,
        countField: this.selectedFields.countField
      })
    };

    const sub = this.apiService.updateWidget(this.editingWidget.id, updateRequest).subscribe({
      next: (response) => {
        this.notificationService.success('Success', `Widget "${this.widgetName}" updated successfully`);
        this.widgetUpdated.emit(response.data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error updating widget:', error);
        const errorMessage = error.error?.message || error.message || 'Unknown error occurred';
        this.notificationService.error('Update Failed', `Failed to update widget: ${errorMessage}`);
        this.isLoading = false;
      }
    });

    this.subscriptions.push(sub);
  }

  // Map chart type titles to ChartType enum
  mapChartTypeToEnum(title: string): ChartType {
    const mapping: { [key: string]: ChartType } = {
      'Table': ChartType.TABLE,
      'Pie Chart': ChartType.PIE,
      'Donut Chart': ChartType.DONUT,
      'Bar Chart': ChartType.VERTICAL_BAR,
      'Line Chart': ChartType.LINE_CHART,
      'Area Chart': ChartType.AREA_CHART,
      'Aggregated Table': ChartType.TABLE,
      'Count Widget': ChartType.COUNT
    };
    return mapping[title] || ChartType.TABLE;
  }

  // Cancel operation
  cancel(): void {
    console.log('Cancel button clicked');
    this.resetForm();
    this.cancelled.emit();
  }

  // Test method for debugging
  testClick(): void {
    console.log('TEST CLICK WORKS! Component is responsive.');
    alert('Test click works! The component is responsive.');
  }

  // Reset form
  resetForm(): void {
    this.stepIndex = 0;
    this.widgetName = '';
    this.widgetDescription = '';
    this.selectedDataSource = null;
    this.selectedChartType = null;
    this.selectedFields = {};
    this.selectedFilters = [];
    this.refreshInterval = 30;
    this.previewData = null;
    this.updateAiSummary();
  }

  // Utility methods (same as create-widget)
  getDataSourceIcon(source: any): string {
    return `fas fa-${source.icon}`;
  }

  getChartIcon(chart: any): string {
    return `fas fa-${chart.icon}`;
  }

  getFieldIcon(field: any): string {
    switch (field.type) {
      case 'date': return 'fas fa-calendar';
      case 'numeric': return 'fas fa-calculator';
      default: return 'fas fa-font';
    }
  }

  // Get chart type icon for display
  getChartTypeIcon(chartType: any): string {
    if (typeof chartType === 'string') {
      const type = this.chartTypes.find(t => t.title === chartType);
      return type ? type.icon : 'bar_chart';
    }
    return chartType?.icon || 'bar_chart';
  }

  // Get data source description
  getDataSourceDescription(dataSource: any): string {
    if (typeof dataSource === 'string') {
      const source = this.dataSources.find(s => s.value === dataSource);
      return source ? source.description : '';
    }
    return dataSource?.description || '';
  }

  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

}
