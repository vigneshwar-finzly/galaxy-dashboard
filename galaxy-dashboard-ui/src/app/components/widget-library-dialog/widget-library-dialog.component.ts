import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { DashboardService } from '../../services/dashboard.service';
import { 
  WidgetResponse, 
  WidgetLibraryResponse,
  DashboardSummaryResponse,
  DashboardWidgetResponse,
  DashboardUsageInfo,
  AddWidgetToDashboardRequest,
  ChartType,
  Dashboard
} from '../../models/dashboard.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface WidgetWithUsage {
  id: number;
  name: string;
  description?: string;
  chartType: ChartType;
  dataSource: string;
  refreshInterval: number;
  createdBy: string;
  createdDateTime: string;
  updatedDateTime?: string;
  usageCount: number;
  isInUse: boolean;
  isInCurrentDashboard: boolean;
  usedInDashboards: string[]; // Simplified to just dashboard names for display
}

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule],
  selector: 'app-widget-library-dialog',
  templateUrl: './widget-library-dialog.component.html',
  styleUrls: ['./widget-library-dialog.component.scss']
})
export class WidgetLibraryDialogComponent implements OnInit, OnDestroy {
  // Search and filters
  searchTerm: string = '';
  selectedDataSource: string = 'all';
  selectedChartType: string = 'all';
  showOnlyAvailable: boolean = false;

  // Data
  allWidgets: WidgetWithUsage[] = [];
  filteredWidgets: WidgetWithUsage[] = [];
  dashboards: DashboardSummaryResponse[] = [];
  widgetUsageMap: Map<number, DashboardSummaryResponse[]> = new Map();
  currentDashboardWidgets: DashboardWidgetResponse[] = [];

  // Loading states
  isLoading = false;
  isAddingWidget = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Filter options
  dataSources = [
    { name: 'All Data Sources', value: 'all', icon: 'widgets', description: 'View all widgets', color: '#6366f1' },
    { name: 'Payment', value: 'Payment', icon: 'payment', description: 'Payment transaction widgets', color: '#059669' },
    { name: 'BulkFile', value: 'BulkFile', icon: 'file_copy', description: 'File processing widgets', color: '#dc2626' },
    { name: 'Ledger', value: 'Ledger', icon: 'account_balance', description: 'Ledger widgets', color: '#7c3aed' },
    { name: 'CRM', value: 'CRM', icon: 'people', description: 'Customer widgets', color: '#ea580c' },
    { name: 'Documents', value: 'Documents', icon: 'description', description: 'Document widgets', color: '#0891b2' },
    { name: 'Notifications', value: 'Notifications', icon: 'notifications', description: 'Notification widgets', color: '#c2410c' }
  ];

  chartTypes = [
    { name: 'All Types', value: 'all', icon: 'bar_chart', description: 'View all chart types' },
    { name: 'Table', value: 'TABLE', icon: 'table_chart', description: 'Data tables' },
    { name: 'Pie Chart', value: 'PIE', icon: 'pie_chart', description: 'Pie charts' },
    { name: 'Donut Chart', value: 'DONUT', icon: 'donut_large', description: 'Donut charts' },
    { name: 'Bar Chart', value: 'VERTICAL_BAR', icon: 'bar_chart', description: 'Vertical bar charts' },
    { name: 'Horizontal Bar', value: 'HORIZONTAL_BAR', icon: 'bar_chart', description: 'Horizontal bar charts' },
    { name: 'Line Chart', value: 'LINE_CHART', icon: 'show_chart', description: 'Line charts' },
    { name: 'Area Chart', value: 'AREA_CHART', icon: 'area_chart', description: 'Area charts' },
    { name: 'KPI Card', value: 'COUNT', icon: 'assessment', description: 'KPI cards' },
    { name: 'Radar Chart', value: 'RADAR_CHART', icon: 'radar', description: 'Radar charts' }
  ];

  constructor(
    public dialogRef: MatDialogRef<WidgetLibraryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentDashboard: Dashboard | null },
    private apiService: ApiService,
    private notificationService: NotificationService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadData(): void {
    this.isLoading = true;
    
    // Use the new widget library API that includes usage information
    const dashboardId = this.data.currentDashboard?.id ? Number(this.data.currentDashboard.id) : undefined;
    const loadWidgetLibrary$ = this.apiService.getWidgetLibrary(dashboardId);
    
    // Load widget library with usage information
    const widgetLibrarySub = loadWidgetLibrary$.subscribe({
      next: (response) => {
        this.allWidgets = response.data.map(widget => ({
          ...widget,
          isInUse: widget.isInUse,
          usageCount: widget.usageCount,
          usedInDashboards: widget.usedInDashboards.map((usage: DashboardUsageInfo) => usage.dashboardName)
        }));
        this.isLoading = false;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading widget library:', error);
        this.isLoading = false;
      }
    });

    this.subscriptions.push(widgetLibrarySub);

    // Load current dashboard widgets if available
    if (this.data.currentDashboard) {
      this.loadCurrentDashboardWidgets();
    }
  }

  loadCurrentDashboardWidgets(): void {
    if (!this.data.currentDashboard) return;

    const sub = this.apiService.getDashboardWidgets(Number(this.data.currentDashboard.id)).subscribe({
      next: (response) => {
        this.currentDashboardWidgets = response.data;
        this.checkDataLoaded();
      },
      error: (error) => {
        console.error('Error loading current dashboard widgets:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  loadWidgetUsage(): void {
    this.dashboards.forEach(dashboard => {
      const sub = this.apiService.getDashboardWidgets(dashboard.id).subscribe({
        next: (response) => {
          response.data.forEach(dashboardWidget => {
            const widgetId = dashboardWidget.widget.id;
            if (!this.widgetUsageMap.has(widgetId)) {
              this.widgetUsageMap.set(widgetId, []);
            }
            this.widgetUsageMap.get(widgetId)!.push(dashboard);
          });
          this.updateWidgetUsageInfo();
        },
        error: (error) => {
          console.error('Error loading dashboard widgets:', error);
        }
      });
      this.subscriptions.push(sub);
    });
  }

  updateWidgetUsageInfo(): void {
    this.allWidgets.forEach(widget => {
      const usedInDashboards = this.widgetUsageMap.get(widget.id) || [];
      widget.usageCount = usedInDashboards.length;
      widget.isInUse = usedInDashboards.length > 0;
      widget.usedInDashboards = usedInDashboards.map(d => d.name);
    });
    this.applyFilters();
  }

  checkDataLoaded(): void {
    if (this.allWidgets.length > 0) {
      this.isLoading = false;
      this.applyFilters();
    }
  }

  applyFilters(): void {
    let filtered = [...this.allWidgets];

    // Search filter
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(search) ||
        widget.description?.toLowerCase().includes(search) ||
        widget.dataSource.toLowerCase().includes(search)
      );
    }

    // Data source filter
    if (this.selectedDataSource !== 'all') {
      filtered = filtered.filter(widget => 
        widget.dataSource === this.selectedDataSource
      );
    }

    // Chart type filter
    if (this.selectedChartType !== 'all') {
      filtered = filtered.filter(widget => 
        widget.chartType === this.selectedChartType
      );
    }

    // Available only filter
    if (this.showOnlyAvailable && this.data.currentDashboard) {
      const currentWidgetIds = this.currentDashboardWidgets.map(dw => dw.widget.id);
      filtered = filtered.filter(widget => 
        !currentWidgetIds.includes(widget.id)
      );
    }

    this.filteredWidgets = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onDataSourceChange(): void {
    this.applyFilters();
  }

  onChartTypeChange(): void {
    this.applyFilters();
  }

  onAvailableOnlyChange(): void {
    this.applyFilters();
  }

  isWidgetInCurrentDashboard(widgetId: number): boolean {
    if (!this.data.currentDashboard) return false;
    return this.currentDashboardWidgets.some(dw => dw.widget.id === widgetId);
  }

  addWidgetToDashboard(widget: WidgetWithUsage): void {
    if (!this.data.currentDashboard) {
      this.notificationService.error('Error', 'No dashboard selected');
      return;
    }

    if (this.isWidgetInCurrentDashboard(widget.id)) {
      this.notificationService.info('Info', 'Widget is already in the current dashboard');
      return;
    }

    this.isAddingWidget = true;

    const position = this.calculateNextPosition(widget.chartType);
    const request: AddWidgetToDashboardRequest = {
      widgetId: widget.id,
      positionX: position.positionX,
      positionY: position.positionY,
      width: position.width,
      height: position.height,
      layoutConfig: JSON.stringify({ title: widget.name })
    };

    const sub = this.apiService.addWidgetToDashboard(Number(this.data.currentDashboard.id), request).subscribe({
      next: (response) => {
        this.notificationService.success('Success', `${widget.name} added to dashboard successfully`);
        
        // Update current dashboard widgets
        this.currentDashboardWidgets.push(response.data);
        
        // Update usage info
        widget.isInUse = true;
        widget.usageCount++;
        if (!widget.usedInDashboards.includes(this.data.currentDashboard!.name)) {
          widget.usedInDashboards.push(this.data.currentDashboard!.name);
        }

        // Refresh dashboard
        this.dashboardService.refreshDashboards().subscribe();
        
        this.isAddingWidget = false;
        this.applyFilters(); // Refresh filters in case "Available Only" is selected
      },
      error: (error) => {
        console.error('Error adding widget:', error);
        this.notificationService.error('Error', 'Failed to add widget: ' + (error.message || 'Unknown error'));
        this.isAddingWidget = false;
      }
    });
    this.subscriptions.push(sub);
  }

  private calculateNextPosition(chartType: ChartType): any {
    const existingWidgets = this.currentDashboardWidgets || [];
    let maxY = 0;
    
    existingWidgets.forEach(widget => {
      const bottomY = widget.positionY + widget.height;
      if (bottomY > maxY) {
        maxY = bottomY;
      }
    });

    // Default dimensions based on chart type
    const dimensions = this.getChartTypeDimensions(chartType);
    
    return {
      positionX: 0,
      positionY: maxY,
      width: dimensions.width,
      height: dimensions.height
    };
  }

  private getChartTypeDimensions(chartType: ChartType): { width: number; height: number } {
    const dimensionMap: Record<ChartType, { width: number; height: number }> = {
      TABLE: { width: 12, height: 6 },
      PIE: { width: 6, height: 6 },
      DONUT: { width: 6, height: 6 },
      VERTICAL_BAR: { width: 8, height: 6 },
      HORIZONTAL_BAR: { width: 8, height: 6 },
      LINE_CHART: { width: 8, height: 6 },
      AREA_CHART: { width: 8, height: 6 },
      COUNT: { width: 4, height: 3 },
      RADAR_CHART: { width: 6, height: 6 }
    };

    return dimensionMap[chartType] || { width: 6, height: 4 };
  }

  getChartTypeIcon(chartType: ChartType): string {
    const iconMap: Record<ChartType, string> = {
      TABLE: 'table_chart',
      PIE: 'pie_chart',
      DONUT: 'donut_large',
      VERTICAL_BAR: 'bar_chart',
      HORIZONTAL_BAR: 'bar_chart',
      LINE_CHART: 'show_chart',
      AREA_CHART: 'area_chart',
      COUNT: 'assessment',
      RADAR_CHART: 'radar'
    };

    return iconMap[chartType] || 'widgets';
  }

  getDataSourceIcon(dataSource: string): string {
    const iconMap: { [key: string]: string } = {
      Payment: 'payment',
      BulkFile: 'file_copy',
      Ledger: 'account_balance',
      CRM: 'people',
      Documents: 'description',
      Notifications: 'notifications'
    };

    return iconMap[dataSource] || 'storage';
  }

  close(): void {
    this.dialogRef.close();
  }

  // Statistics getters
  get totalWidgets(): number {
    return this.allWidgets.length;
  }

  get filteredCount(): number {
    return this.filteredWidgets.length;
  }

  get availableInCurrentDashboard(): number {
    if (!this.data.currentDashboard) return this.totalWidgets;
    const currentWidgetIds = this.currentDashboardWidgets.map(dw => dw.widget.id);
    return this.allWidgets.filter(w => !currentWidgetIds.includes(w.id)).length;
  }

  get inUseCount(): number {
    return this.allWidgets.filter(w => w.isInUse).length;
  }
}
