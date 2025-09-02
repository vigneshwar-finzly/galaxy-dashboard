import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { DashboardService } from '../../services/dashboard.service';
import { 
  WidgetResponse, 
  UpdateWidgetRequest,
  ChartType
} from '../../models/dashboard.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule],
  selector: 'app-edit-widget-dialog',
  templateUrl: './edit-widget-dialog.component.html',
  styleUrls: ['./edit-widget-dialog.component.scss']
})
export class EditWidgetDialogComponent implements OnInit, OnDestroy {
  // Widget data
  widget: WidgetResponse | null = null;
  
  // Step management
  stepIndex = 0;
  steps = [
    { label: 'Data Source', description: 'Choose data source' },
    { label: 'Chart Type', description: 'Select chart type' },
    { label: 'Fields', description: 'Map fields' },
    { label: 'Filters', description: 'Add filters' },
    { label: 'Preview', description: 'Preview widget' },
    { label: 'Save', description: 'Save changes' }
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
  isSaving = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // AI-style dynamic summary
  aiSummary: string = '';

  // Data sources
  dataSources = [
    { name: 'Payments', description: 'Payment transaction data and analytics', icon: 'payment', value: 'payments' },
    { name: 'Bulk Files', description: 'Payment file processing data', icon: 'file_copy', value: 'payment_files' },
    { name: 'CRM', description: 'Customer information and profiles', icon: 'people', value: 'customers' },
    { name: 'Ledger', description: 'Account management data', icon: 'account_balance', value: 'accounts' },
    { name: 'Documents', description: 'Document management and storage', icon: 'description', value: 'documents' },
    { name: 'Notifications', description: 'System notifications and alerts', icon: 'notifications', value: 'notifications' }
  ];

  // Chart types
  chartTypes = [
    { title: 'Table', icon: 'table_chart', description: 'Display data in tabular format', maxFields: 8 },
    { title: 'Pie Chart', icon: 'pie_chart', description: 'Show proportions of a whole', maxFields: 1 },
    { title: 'Donut Chart', icon: 'donut_large', description: 'Donut-style pie chart', maxFields: 1 },
    { title: 'Bar Chart', icon: 'bar_chart', description: 'Compare values across categories', maxFields: 1 },
    { title: 'Horizontal Bar', icon: 'bar_chart', description: 'Horizontal bar chart', maxFields: 1 },
    { title: 'Line Chart', icon: 'show_chart', description: 'Show trends over time', maxFields: 1 },
    { title: 'Area Chart', icon: 'area_chart', description: 'Display volume and trends', maxFields: 1 },
    { title: 'KPI Card', icon: 'assessment', description: 'Key performance indicator', maxFields: 1 },
    { title: 'Radar Chart', icon: 'radar', description: 'Multi-dimensional data', maxFields: 1 }
  ];

  constructor(
    public dialogRef: MatDialogRef<EditWidgetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { widgetId: number },
    private apiService: ApiService,
    private notificationService: NotificationService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.loadWidget();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadWidget(): void {
    this.isLoading = true;
    
    const sub = this.apiService.getWidgetById(this.data.widgetId).subscribe({
      next: (response) => {
        this.widget = response.data;
        this.populateForm();
        this.updateAISummary();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading widget:', error);
        this.notificationService.error('Error', 'Failed to load widget data');
        this.isLoading = false;
        this.dialogRef.close();
      }
    });
    this.subscriptions.push(sub);
  }

  populateForm(): void {
    if (!this.widget) return;

    this.widgetName = this.widget.name;
    this.widgetDescription = this.widget.description || '';
    this.refreshInterval = this.widget.refreshInterval;

    // Find and set data source
    this.selectedDataSource = this.dataSources.find(ds => 
      ds.value === this.widget!.dataSource || ds.name === this.widget!.dataSource
    ) || null;

    // Find and set chart type
    this.selectedChartType = this.chartTypes.find(ct => 
      this.mapChartTypeToTitle(this.widget!.chartType) === ct.title
    ) || null;

    // Parse existing fields
    try {
      if (this.widget.groupFields) {
        const groupFields = JSON.parse(this.widget.groupFields);
        if (groupFields.length > 0) {
          this.selectedFields.groupField = { value: groupFields[0] };
        }
      }

      if (this.widget.measureFields) {
        this.selectedFields.tableFields = JSON.parse(this.widget.measureFields);
      }

      if (this.widget.widgetConfig) {
        const config = JSON.parse(this.widget.widgetConfig);
        this.selectedFields.xAxis = config.xAxis;
        this.selectedFields.yAxis = config.yAxis;
        this.selectedFields.countField = config.countField;
      }

      if (this.widget.filterCriteria) {
        this.selectedFilters = JSON.parse(this.widget.filterCriteria);
      }
    } catch (error) {
      console.warn('Error parsing widget fields:', error);
    }
  }

  mapChartTypeToTitle(chartType: ChartType): string {
    const mapping: { [key in ChartType]: string } = {
      [ChartType.TABLE]: 'Table',
      [ChartType.PIE]: 'Pie Chart',
      [ChartType.DONUT]: 'Donut Chart',
      [ChartType.VERTICAL_BAR]: 'Bar Chart',
      [ChartType.HORIZONTAL_BAR]: 'Horizontal Bar',
      [ChartType.LINE_CHART]: 'Line Chart',
      [ChartType.AREA_CHART]: 'Area Chart',
      [ChartType.COUNT]: 'KPI Card',
      [ChartType.RADAR_CHART]: 'Radar Chart'
    };
    return mapping[chartType] || 'Unknown';
  }

  mapChartTypeToEnum(title: string): ChartType {
    const mapping: { [key: string]: ChartType } = {
      'Table': ChartType.TABLE,
      'Pie Chart': ChartType.PIE,
      'Donut Chart': ChartType.DONUT,
      'Bar Chart': ChartType.VERTICAL_BAR,
      'Horizontal Bar': ChartType.HORIZONTAL_BAR,
      'Line Chart': ChartType.LINE_CHART,
      'Area Chart': ChartType.AREA_CHART,
      'KPI Card': ChartType.COUNT,
      'Radar Chart': ChartType.RADAR_CHART
    };
    return mapping[title] || ChartType.TABLE;
  }

  updateAISummary(): void {
    if (!this.selectedDataSource && !this.selectedChartType) {
      this.aiSummary = `Editing widget "${this.widgetName}". Start by reviewing the data source and chart type selections.`;
      return;
    }

    let summary = `Editing "${this.widgetName}" - `;
    
    if (this.selectedDataSource) {
      summary += `${this.selectedDataSource.name} data`;
    }
    
    if (this.selectedChartType) {
      summary += ` as ${this.selectedChartType.title}`;
    }

    if (Object.keys(this.selectedFields).length > 0) {
      const fieldCount = Object.values(this.selectedFields).filter(f => f).length;
      summary += ` with ${fieldCount} field(s) configured`;
    }

    if (this.selectedFilters.length > 0) {
      summary += ` and ${this.selectedFilters.length} filter(s) applied`;
    }

    this.aiSummary = summary + '.';
  }

  // Step navigation
  goToStep(step: number): void {
    if (step >= 0 && step < this.steps.length) {
      this.stepIndex = step;
    }
  }

  nextStep(): void {
    if (this.stepIndex < this.steps.length - 1) {
      this.stepIndex++;
    }
  }

  prevStep(): void {
    if (this.stepIndex > 0) {
      this.stepIndex--;
    }
  }

  canProceedToNext(): boolean {
    switch (this.stepIndex) {
      case 0: return !!this.selectedDataSource;
      case 1: return !!this.selectedChartType;
      case 2: return Object.keys(this.selectedFields).length > 0;
      case 3: return true; // Filters are optional
      case 4: return true; // Preview step
      default: return true;
    }
  }

  // Selection handlers
  selectDataSource(dataSource: any): void {
    this.selectedDataSource = dataSource;
    this.updateAISummary();
  }

  selectChartType(chartType: any): void {
    this.selectedChartType = chartType;
    this.selectedFields = {}; // Reset fields when chart type changes
    this.updateAISummary();
  }

  // Save changes
  saveChanges(): void {
    if (!this.widget) return;

    if (!this.widgetName.trim()) {
      this.notificationService.error('Validation Error', 'Widget name is required');
      return;
    }

    this.isSaving = true;

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

    const sub = this.apiService.updateWidget(this.widget.id, updateRequest).subscribe({
      next: (response) => {
        this.notificationService.success('Success', `Widget "${this.widgetName}" updated successfully`);
        
        // Refresh the dashboard to show changes
        this.dashboardService.refreshDashboards().subscribe();
        
        this.isSaving = false;
        this.dialogRef.close({ success: true, widget: response.data });
      },
      error: (error) => {
        console.error('Error updating widget:', error);
        const errorMessage = error.error?.message || error.message || 'Unknown error occurred';
        this.notificationService.error('Update Failed', `Failed to update widget: ${errorMessage}`);
        this.isSaving = false;
      }
    });

    this.subscriptions.push(sub);
  }

  close(): void {
    this.dialogRef.close();
  }

  // Preview functionality
  generatePreview(): void {
    // This would implement preview generation logic
    // For now, just show a placeholder
    this.isLoadingPreview = true;
    setTimeout(() => {
      this.previewData = {
        message: `Preview for ${this.widgetName} would be generated here`
      };
      this.isLoadingPreview = false;
    }, 1000);
  }
}
