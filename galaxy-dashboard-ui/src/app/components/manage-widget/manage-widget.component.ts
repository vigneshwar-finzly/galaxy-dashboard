import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingService } from '../../services/loading.service';
import { 
  WidgetResponse, 
  ChartType,
  DashboardSummaryResponse,
  DashboardWidgetResponse,
  CreateWidgetRequest,
  UpdateWidgetRequest
} from '../../models/dashboard.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WidgetCreatorComponent } from './widget-creator.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule,WidgetCreatorComponent,MatIconModule],
  selector: 'app-manage-widget',
  templateUrl: './manage-widget.component.html',
  styleUrls: ['./manage-widget.component.scss']
})
export class ManageWidgetComponent implements OnInit, OnDestroy {
  [x: string]: any;
  Math = Math; // Expose Math for use in templates
  
  // Tab management
  activeTab: 'manage' | 'create' | 'edit' = 'manage';
  
  // Filter and search
  searchTerm: string = '';
  selectedDataSource: string = 'all';
  selectedChartType: string = 'all';
  isLoading = false;
  
  // Widget creation/editing
  isCreatingWidget = false;
  isEditingWidget = false;
  editingWidget: WidgetResponse | null = null;
  
  // Post-creation popup
  showAddToDashboardPopup = false;
  newlyCreatedWidget: WidgetResponse | null = null;
  currentDashboard: any = null; // Will be populated from dashboard service
  
  // Data
  allWidgets: WidgetResponse[] = [];
  filteredWidgets: WidgetResponse[] = [];
  dashboards: DashboardSummaryResponse[] = [];
  widgetUsageMap: Map<number, DashboardSummaryResponse[]> = new Map();

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Data sources for filtering
  dataSources = [
    { name: 'All Widgets', value: 'all', icon: 'widgets', description: 'View all available widgets' },
    { name: 'Payment', value: 'Payment', icon: 'payment', description: 'Payment transaction widgets' },
    { name: 'BulkFile', value: 'BulkFile', icon: 'file_copy', description: 'File processing widgets' },
    { name: 'Ledger', value: 'Ledger', icon: 'account_balance', description: 'Ledger widgets' },
    { name: 'CRM', value: 'CRM', icon: 'people', description: 'Customer widgets' }
  ];

  // Chart types for filtering
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
    private dashboardService: DashboardService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private loadingService: LoadingService
  ) {}

  // Computed properties for template
  get inUseWidgetCount(): number {
    return this.allWidgets.filter(w => this.isWidgetInUse(w.id)).length;
  }

  get unusedWidgetCount(): number {
    return this.allWidgets.filter(w => !this.isWidgetInUse(w.id)).length;
  }

  ngOnInit(): void {
    // Initialize with non-loading state to ensure UI is interactive
    this.isLoading = false;
    this.loadWidgets();
    this.loadDashboards();
    this.loadCurrentDashboard();
  }
  
  // Load current dashboard for adding widgets
  loadCurrentDashboard(): void {
    // For now, we'll get the current dashboard from the dashboard service
    // This is a placeholder - in a real implementation, you would have a method to get the current dashboard
    try {
      // Temporary implementation - get first available dashboard
      const sub = this.apiService.getAllDashboards().subscribe({
        next: (response) => {
          if (response.data && response.data.length > 0) {
            // Use the first dashboard as current dashboard
            this.currentDashboard = response.data[0];
          }
        },
        error: (error: any) => {
          console.error('Error loading current dashboard:', error);
        }
      });
      this.subscriptions.push(sub);
    } catch (error) {
      console.error('Error loading current dashboard:', error);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Load all widgets
  loadWidgets(): void {
    this.isLoading = true;
    const sub = this.apiService.getAllWidgets().subscribe({
      next: (response) => {
        this.allWidgets = response.data;
        this.applyFilters();
        this.loadWidgetUsage();
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

  // Load all dashboards to track widget usage
  loadDashboards(): void {
    const sub = this.apiService.getAllDashboards().subscribe({
      next: (response) => {
        this.dashboards = response.data;
        this.loadWidgetUsage();
      },
      error: (error) => {
        console.error('Error loading dashboards:', error);
        this.notificationService.error('Load Failed', 'Failed to load dashboards');
      }
    });
    this.subscriptions.push(sub);
  }

  // Load widget usage information for all dashboards
  loadWidgetUsage(): void {
    if (this.dashboards.length === 0 || this.allWidgets.length === 0) return;

    this.widgetUsageMap.clear();
    
    // For each dashboard, get its widgets and track usage
    this.dashboards.forEach(dashboard => {
      const sub = this.apiService.getDashboardWidgets(dashboard.id).subscribe({
        next: (response) => {
          const dashboardWidgets = response.data;
          
          dashboardWidgets.forEach(dw => {
            const widgetId = dw.widget.id;
            if (!this.widgetUsageMap.has(widgetId)) {
              this.widgetUsageMap.set(widgetId, []);
            }
            this.widgetUsageMap.get(widgetId)!.push(dashboard);
          });
        },
        error: (error) => {
          console.error(`Error loading widgets for dashboard ${dashboard.id}:`, error);
        }
      });
      this.subscriptions.push(sub);
    });
  }

  // Apply search and filter logic
  applyFilters(): void {
    let filtered = [...this.allWidgets];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(searchLower) ||
        (widget.description && widget.description.toLowerCase().includes(searchLower)) ||
        widget.dataSource.toLowerCase().includes(searchLower) ||
        widget.chartType.toLowerCase().includes(searchLower)
      );
    }

    // Apply data source filter
    if (this.selectedDataSource !== 'all') {
      filtered = filtered.filter(widget => widget.dataSource === this.selectedDataSource);
    }

    // Apply chart type filter
    if (this.selectedChartType !== 'all') {
      filtered = filtered.filter(widget => widget.chartType === this.selectedChartType);
    }

    this.filteredWidgets = filtered;
  }

  // Event handlers
  onSearchChange(): void {
    console.log('Search changed:', this.searchTerm);
    this.applyFilters();
  }

  onDataSourceFilterChange(): void {
    console.log('Data source filter changed:', this.selectedDataSource);
    this.applyFilters();
  }

  onChartTypeFilterChange(): void {
    console.log('Chart type filter changed:', this.selectedChartType);
    this.applyFilters();
  }

  // Get widget usage information
  getWidgetUsage(widgetId: number): DashboardSummaryResponse[] {
    return this.widgetUsageMap.get(widgetId) || [];
  }

  isWidgetInUse(widgetId: number): boolean {
    return this.getWidgetUsage(widgetId).length > 0;
  }

  getUsageCount(widgetId: number): number {
    return this.getWidgetUsage(widgetId).length;
  }

  // Widget actions
  editWidget(widget: WidgetResponse): void {
    console.log('Edit widget clicked:', widget);
    this.editingWidget = widget;
    this.isEditingWidget = true;
    this.activeTab = 'edit';
    console.log('Switched to edit tab, editing widget:', this.editingWidget);
  }

  deleteWidget(widget: WidgetResponse): void {
    // Check if widget is in use
    if (this.isWidgetInUse(widget.id)) {
      const confirmMessage = `Are you sure you want to delete the widget "${widget.name}"?\n\nThis will affect many dashboards.\n\nThis action cannot be undone.`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    } else {
      const confirmMessage = `Are you sure you want to delete the widget "${widget.name}"?\n\nThis action cannot be undone.`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    this.isLoading = true;
    const sub = this.apiService.deleteWidget(widget.id).subscribe({
      next: () => {
        this.notificationService.success('Success', `Widget "${widget.name}" deleted successfully`);
        // Remove from local arrays immediately for better UX
        this.allWidgets = this.allWidgets.filter(w => w.id !== widget.id);
        this.applyFilters(); // Refresh filtered list
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error deleting widget:', error);
        const errorMessage = error.error?.message || error.message || 'Unknown error occurred';
        this.notificationService.error('Delete Failed', `Failed to delete widget: ${errorMessage}`);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  duplicateWidget(widget: WidgetResponse): void {
    const newName = prompt(`Enter name for the duplicated widget:`, `${widget.name} (Copy)`);
    if (!newName || !newName.trim()) {
      return; // User cancelled or entered empty name
    }

    const duplicatedWidget: CreateWidgetRequest = {
      name: newName.trim(),
      description: widget.description ? `${widget.description} (Duplicate)` : 'Duplicated widget',
      chartType: widget.chartType,
      dataSource: widget.dataSource,
      refreshInterval: widget.refreshInterval,
      groupFields: widget.groupFields,
      measureFields: widget.measureFields,
      filterCriteria: widget.filterCriteria,
      widgetConfig: widget.widgetConfig
    };

    this.isLoading = true;
    const sub = this.apiService.createWidget(duplicatedWidget).subscribe({
      next: (response) => {
        this.notificationService.success('Success', `Widget "${newName.trim()}" created successfully`);
        this.loadWidgets(); // Refresh the list
      },
      error: (error) => {
        console.error('Error duplicating widget:', error);
        const errorMessage = error.error?.message || error.message || 'Unknown error occurred';
        this.notificationService.error('Duplicate Failed', `Failed to duplicate widget: ${errorMessage}`);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // Utility methods
  getChartTypeIcon(chartType: string): string {
    const chartTypeMap: { [key: string]: string } = {
      'TABLE': 'table_chart',
      'PIE': 'pie_chart',
      'DONUT': 'donut_large',
      'VERTICAL_BAR': 'bar_chart',
      'HORIZONTAL_BAR': 'bar_chart',
      'COUNT': 'assessment',
      'LINE_CHART': 'show_chart',
      'AREA_CHART': 'area_chart',
      'RADAR_CHART': 'radar'
    };
    return chartTypeMap[chartType] || 'bar_chart';
  }

  getDataSourceIcon(dataSource: string): string {
    const dataSourceMap: { [key: string]: string } = {
      'Payment': 'payment',
      'BulkFile': 'file_copy',
      'Ledger': 'account_balance',
      'CRM': 'people',
      'all': 'widgets'
    };
    return dataSourceMap[dataSource] || 'storage';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatUsageTooltip(widgetId: number): string {
    const usage = this.getWidgetUsage(widgetId);
    if (usage.length === 0) {
      return 'Not used in any dashboard';
    }
    return `Used in: ${usage.map(d => d.name).join(', ')}`;
  }

  // Filter helper methods
  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedDataSource = 'all';
    this.selectedChartType = 'all';
    this.applyFilters();
  }

  getFilterChipCount(): number {
    let count = 0;
    if (this.searchTerm.trim()) count++;
    if (this.selectedDataSource !== 'all') count++;
    if (this.selectedChartType !== 'all') count++;
    return count;
  }

  // Tab management
  switchTab(tab: 'manage' | 'create' | 'edit'): void {
    console.log('Switching to tab:', tab);
    this.activeTab = tab;
    if (tab === 'create') {
      this.isCreatingWidget = true;
      this.isEditingWidget = false;
      this.editingWidget = null;
    } else if (tab === 'edit') {
      this.isEditingWidget = true;
      this.isCreatingWidget = false;
    } else {
      this.isCreatingWidget = false;
      this.isEditingWidget = false;
      this.editingWidget = null;
    }
  }

  // Widget creation success handler
  onWidgetCreated(newWidget: WidgetResponse): void {
    this.newlyCreatedWidget = newWidget;
    this.showAddToDashboardPopup = true;
    this.loadWidgets(); // Refresh the widget list
    this.activeTab = 'manage'; // Switch back to manage tab
  }

  // Widget update success handler
  onWidgetUpdated(updatedWidget: WidgetResponse): void {
    this.notificationService.success('Updated', `Widget "${updatedWidget.name}" has been updated`);
    this.loadWidgets(); // Refresh the widget list
    this.activeTab = 'manage'; // Switch back to manage tab
    this.editingWidget = null;
    this.isEditingWidget = false;
  }

  // Add widget to current dashboard
  addWidgetToCurrentDashboard(): void {
    if (!this.newlyCreatedWidget) {
      this.notificationService.error('Error', 'No widget available to add');
      return;
    }

    if (!this.currentDashboard) {
      this.notificationService.info('Info', 'No current dashboard selected. Widget has been created and is available in the widget list.');
      this.closeAddToDashboardPopup();
      return;
    }

    // Create request to add widget to dashboard
    const position = this.calculateWidgetPosition();
    const addRequest = {
      widgetId: this.newlyCreatedWidget.id,
      positionX: position.x,
      positionY: position.y,
      width: position.width,
      height: position.height,
      layoutConfig: JSON.stringify({ title: this.newlyCreatedWidget.name })
    };

    this.isLoading = true;
    const sub = this.apiService.addWidgetToDashboard(this.currentDashboard.id, addRequest).subscribe({
      next: () => {
        this.notificationService.success('Added', `Widget "${this.newlyCreatedWidget!.name}" added to dashboard "${this.currentDashboard!.name}"`);
        this.closeAddToDashboardPopup();
        this.isLoading = false;
        
        // Refresh current dashboard if it's being viewed
        this.dashboardService.refreshDashboards().subscribe();
      },
      error: (error) => {
        console.error('Error adding widget to dashboard:', error);
        const errorMessage = error.error?.message || error.message || 'Unknown error occurred';
        this.notificationService.error('Add Failed', `Failed to add widget to dashboard: ${errorMessage}`);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // Calculate position for new widget on dashboard
  private calculateWidgetPosition(): { x: number, y: number, width: number, height: number } {
    // Simple positioning logic - place at next available position
    return {
      x: 0,
      y: 0,
      width: 6,
      height: 4
    };
  }

  // Close the add to dashboard popup
  closeAddToDashboardPopup(): void {
    this.showAddToDashboardPopup = false;
    this.newlyCreatedWidget = null;
  }
}
