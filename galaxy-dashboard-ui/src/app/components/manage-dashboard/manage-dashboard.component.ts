import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingService } from '../../services/loading.service';
import { 
  DashboardSummaryResponse, 
  WidgetResponse, 
  DashboardWidgetResponse,
  AddWidgetToDashboardRequest,
  ChartType,
  Dashboard
} from '../../models/dashboard.models';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [MatIconModule,CommonModule,FormsModule],
  selector: 'app-manage-dashboard',
  templateUrl: './manage-dashboard.component.html',
  styleUrls: ['./manage-dashboard.component.scss']
})
export class ManageDashboardComponent implements OnInit, OnDestroy {
  @Input() currentDashboard: Dashboard | null = null;
  Math = Math; // Expose Math for use in templates
  selectedDashboard: number = 0;
  searchTerm: string = '';
  selectedDataSource: string = 'all';
  isLoading = false;
  
  // Premium Modal Properties
  showSummaryModal = false;
  selectedWidget: WidgetResponse | null = null;
  
  // Data
  availableDashboards: DashboardSummaryResponse[] = [];
  availableWidgets: WidgetResponse[] = [];
  dashboardWidgets: DashboardWidgetResponse[] = [];

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Data sources for filtering
  dataSources = [
    { name: 'All Widgets', value: 'all', icon: 'widgets', description: 'View all available widgets', color: '#6366f1' },
    { name: 'Payment', value: 'Payment', icon: 'payment', description: 'Payment transaction widgets', color: '#059669' },
    { name: 'BulkFile', value: 'BulkFile', icon: 'file_copy', description: 'File processing widgets', color: '#dc2626' },
    { name: 'Ledger', value: 'Ledger', icon: 'account_balance', description: 'Ledger widgets', color: '#7c3aed' },
    { name: 'CRM', value: 'CRM', icon: 'people', description: 'Customer widgets', color: '#ea580c' }
  ];

  constructor(
    private dashboardService: DashboardService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadDashboards();
    this.loadAvailableWidgets();
    
    // Set current dashboard if provided
    if (this.currentDashboard) {
      this.selectedDashboard = this.currentDashboard.id;
      this.loadDashboardWidgets();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Load available dashboards
  loadDashboards(): void {
    this.isLoading = true;
    const sub = this.apiService.getAllDashboards().subscribe({
      next: (response) => {
        this.availableDashboards = response.data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboards:', error);
        this.notificationService.error('Load Failed', 'Failed to load dashboards');
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // Load all available widgets
  loadAvailableWidgets(): void {
    this.isLoading = true;
    const sub = this.apiService.getAllWidgets().subscribe({
      next: (response) => {
        this.availableWidgets = response.data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading widgets:', error);
        this.notificationService.error('Load Failed', 'Failed to load widgets');
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // Load widgets for the selected dashboard
  loadDashboardWidgets(): void {
    if (!this.selectedDashboard) return;

    const dashboardId = this.selectedDashboard;
    
    const sub = this.apiService.getDashboardWidgets(dashboardId).subscribe({
      next: (response) => {
        this.dashboardWidgets = response.data;
      },
      error: (error) => {
        console.error('Error loading dashboard widgets:', error);
        this.notificationService.error('Load Failed', 'Failed to load dashboard widgets');
      }
    });
    this.subscriptions.push(sub);
  }

  // Handle dashboard selection change
  onDashboardSelectionChange(): void {
    console.log('Dashboard selection changed to:', this.selectedDashboard);
    this.loadDashboardWidgets();
  }

  // Handle data source filter change
  onDataSourceFilterChange(): void {
    // Filter logic is handled in the getter
  }

  // Filtered widgets based on search and data source
  get filteredWidgets() {
    let widgets = this.availableWidgets;

    // Filter by data source
    if (this.selectedDataSource !== 'all') {
      widgets = widgets.filter(widget => widget.dataSource === this.selectedDataSource);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const searchTerm = this.searchTerm.toLowerCase();
      widgets = widgets.filter(widget =>
        widget.name.toLowerCase().includes(searchTerm) ||
        (widget.description && widget.description.toLowerCase().includes(searchTerm)) ||
        widget.dataSource.toLowerCase().includes(searchTerm) ||
        widget.chartType.toLowerCase().includes(searchTerm)
      );
    }

    return widgets;
  }

  // Toggle widget in dashboard (add/remove)
  toggleWidgetInDashboard(widgetId: number): void {
    if (!this.selectedDashboard) {
      this.notificationService.error('Error', 'Please select a dashboard first.');
      return;
    }

    if (this.isWidgetInDashboard(widgetId)) {
      // Remove widget from dashboard
      const dashboardWidget = this.dashboardWidgets.find(dw => dw.widget.id === widgetId);
      if (dashboardWidget) {
        this.removeWidgetFromDashboard(dashboardWidget.id);
      }
    } else {
      // Add widget to dashboard
      this.addSingleWidget(widgetId);
    }
  }

  // Add a single widget to dashboard
  private addSingleWidget(widgetId: number): void {
    if (!this.selectedDashboard) return;

    this.isLoading = true;
    const dashboardId = this.selectedDashboard;

    // Get the widget to access its chart type
    const widget = this.availableWidgets.find(w => w.id === widgetId);
    const chartType = widget ? widget.chartType : undefined;
    
    const position = this.calculateNextPosition(chartType);
    const request: AddWidgetToDashboardRequest = {
      widgetId: widgetId,
      positionX: position.positionX,
      positionY: position.positionY,
      width: position.width,
      height: position.height,
      layoutConfig: JSON.stringify({ title: '' })
    };

    const sub = this.apiService.addWidgetToDashboard(dashboardId, request).subscribe({
      next: (response) => {
        this.notificationService.success('Success', 'Widget added to dashboard successfully.');
        this.loadDashboardWidgets(); // Refresh the widget list
        
        // Refresh current dashboard if it matches the selected one
        if (this.currentDashboard && this.currentDashboard.id === this.selectedDashboard) {
          this.dashboardService.refreshDashboards().subscribe();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error adding widget:', error);
        this.notificationService.error('Error', 'Failed to add widget to dashboard: ' + error.message);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // Get count of widgets in current dashboard
  getWidgetCountInDashboard(): number {
    return this.dashboardWidgets.length;
  }

  // Check if widget is already in dashboard
  isWidgetInDashboard(widgetId: number): boolean {
    return this.dashboardWidgets.some(dw => dw.widget.id === widgetId);
  }

  // Get default widget size based on chart type
  private getDefaultSizeForChartType(chartType: string): { width: number; height: number } {
    const normalizedChartType = chartType.toUpperCase();
    
    switch (normalizedChartType) {
      case 'COUNT':
      case 'KPI':
        return { width: 1, height: 1 }; // KPI components: 1x1 (perfect square for metrics)
      
      case 'TABLE':
      case 'AGGREGATED_TABLE':
      case 'DATA_TABLE':
        return { width: 4, height: 3 }; // Tables: Full width, adequate height for data
      
      case 'PIE':
      case 'DONUT':
        return { width: 2, height: 2 }; // Circular charts: 2x2 (square for proper circle)
      
      case 'VERTICAL_BAR':
      case 'BAR':
        return { width: 2, height: 2 }; // Bar charts: 2x2 (good for vertical bars)
      
      case 'HORIZONTAL_BAR':
        return { width: 2, height: 2 }; // Horizontal bars: 2x2 (adequate width for labels)
      
      case 'LINE_CHART':
      case 'AREA_CHART':
        return { width: 2, height: 2 }; // Line/Area charts: 2x2 (good for trends)
      
      case 'RADAR_CHART':
        return { width: 2, height: 2 }; // Radar chart: 2x2 (square for proper radar display)
      
      default:
        return { width: 2, height: 2 }; // Default: 2x2 (good balance for most visualizations)
    }
  }

  // Calculate automatic positioning for new widget
  private calculateNextPosition(chartType?: string): { positionX: number; positionY: number; width: number; height: number } {
    // Grid system: 4 columns wide (based on dashboard component configuration)
    const GRID_COLUMNS = 4;
    
    // Get size based on chart type, fallback to default 2x2
    const { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT } = chartType 
      ? this.getDefaultSizeForChartType(chartType)
      : { width: 2, height: 2 };

    if (this.dashboardWidgets.length === 0) {
      // First widget - top left position
      return { positionX: 0, positionY: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }

    // Find the next available position by checking occupied spaces
    const occupiedPositions = this.dashboardWidgets.map(dw => ({
      x: dw.positionX,
      y: dw.positionY,
      width: dw.width,
      height: dw.height
    }));

    // Start from top and find next available position
    for (let y = 0; y < 20; y++) { // Maximum 20 rows
      for (let x = 0; x <= GRID_COLUMNS - DEFAULT_WIDTH; x++) {
        const isOccupied = occupiedPositions.some(pos => 
          this.doPositionsOverlap(
            { x, y, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
            pos
          )
        );

        if (!isOccupied) {
          return { positionX: x, positionY: y, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
        }
      }
    }

    // If no position found, add at bottom
    const maxY = Math.max(...occupiedPositions.map(pos => pos.y + pos.height));
    return { positionX: 0, positionY: maxY, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }

  // Check if two positions overlap
  private doPositionsOverlap(pos1: any, pos2: any): boolean {
    return !(pos1.x + pos1.width <= pos2.x ||
             pos2.x + pos2.width <= pos1.x ||
             pos1.y + pos1.height <= pos2.y ||
             pos2.y + pos2.height <= pos1.y);
  }

  // Remove widget from dashboard
  removeWidgetFromDashboard(dashboardWidgetId: number): void {
    if (!confirm('Are you sure you want to remove this widget from the dashboard?')) {
      return;
    }

    if (!this.selectedDashboard) {
      this.notificationService.error('Error', 'No dashboard selected.');
      return;
    }

    const dashboardId = this.selectedDashboard;
    this.isLoading = true;

    const sub = this.apiService.removeWidgetFromDashboard(dashboardId, dashboardWidgetId).subscribe({
      next: () => {
        this.notificationService.success('Success', 'Widget removed from dashboard successfully.');
        this.loadDashboardWidgets(); // Refresh the widget list
        
        // Refresh current dashboard if it matches the selected one
        if (this.currentDashboard && this.currentDashboard.id === this.selectedDashboard) {
          this.dashboardService.refreshDashboards().subscribe();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error removing widget from dashboard:', error);
        this.notificationService.error('Error', 'Failed to remove widget from dashboard: ' + error.message);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }



  // Get chart type icon (Material Icons)
  getChartTypeIcon(chartType: any): string {
    const iconMap: { [key: string]: string } = {
      'TABLE': 'table_chart',
      'PIE': 'pie_chart',
      'DONUT': 'pie_chart',
      'VERTICAL_BAR': 'bar_chart',
      'HORIZONTAL_BAR': 'bar_chart',
      'COUNT': 'tag',
      'LINE_CHART': 'show_chart',
      'AREA_CHART': 'area_chart',
      'RADAR_CHART': 'radar'
    };
    return iconMap[chartType] || 'bar_chart';
  }

  // Get data source icon (Material Icons)
  getDataSourceIcon(dataSource: string): string {
    const iconMap: { [key: string]: string } = {
      'all': 'dashboard',
      'Payment': 'payment',
      'BulkFile': 'description',
      'Ledger': 'account_balance',
      'CRM': 'people'
    };
    return iconMap[dataSource] || 'dashboard';
  }

  // Get data source color
  getDataSourceColor(dataSource: string): string {
    const dataSourceObj = this.dataSources.find(ds => ds.value === dataSource);
    return dataSourceObj?.color || '#6366f1';
  }

  // Get comprehensive widget summary for tooltip
  getWidgetSummary(widget: WidgetResponse): string {
    const parts = [];
    
    // Basic info
    parts.push(`📊 ${widget.name}`);
    if (widget.description) {
      parts.push(`📝 ${widget.description}`);
    }
    
    // Chart and data source info
    parts.push(`📈 Chart Type: ${widget.chartType}`);
    parts.push(`🔗 Data Source: ${widget.dataSource}`);
    
    // Configuration details
    if (widget.refreshInterval) {
      parts.push(`🔄 Refresh: Every ${widget.refreshInterval} seconds`);
    }
    
    if (widget.groupFields) {
      parts.push(`👥 Group By: ${widget.groupFields}`);
    }
    
    if (widget.measureFields) {
      parts.push(`📊 Measures: ${widget.measureFields}`);
    }
    
    if (widget.filterCriteria) {
      parts.push(`🔍 Filters: ${widget.filterCriteria}`);
    }
    
    // Creation info
    parts.push(`👤 Created by: ${widget.createdBy}`);
    parts.push(`📅 Created: ${this.formatDate(widget.createdDateTime)}`);
    
    if (widget.updatedDateTime) {
      parts.push(`📅 Last Updated: ${this.formatDate(widget.updatedDateTime)}`);
    }
    
    return parts.join('\n');
  }

  // Premium Modal Methods
  showWidgetSummary(widget: WidgetResponse, event: Event): void {
    event.stopPropagation();
    this.selectedWidget = widget;
    this.showSummaryModal = true;
    // Add elegant fade-in animation
    setTimeout(() => {
      const modal = document.querySelector('.premium-summary-modal');
      if (modal) {
        modal.classList.add('animate-in');
      }
    }, 10);
  }

  closeSummaryModal(): void {
    const modal = document.querySelector('.premium-summary-modal');
    if (modal) {
      modal.classList.add('animate-out');
      setTimeout(() => {
        this.showSummaryModal = false;
        this.selectedWidget = null;
      }, 300);
    } else {
      this.showSummaryModal = false;
      this.selectedWidget = null;
    }
  }

  // Format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
