import { Component, OnInit, HostListener, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { GridsterConfig, GridsterItem, DisplayGrid, CompactType, GridsterModule } from 'angular-gridster2';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { SidebarService } from '../services/sidebar.service';
import { AnimationService } from '../services/animation.service';
import { DashboardService } from '../services/dashboard.service';
import { ThemeService } from '../services/theme.service';
import { EditWidgetDialogComponent } from '../components/edit-widget-dialog/edit-widget-dialog.component';
import { Dashboard, DashboardWidgetResponse } from '../models/dashboard.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KpiCardComponent } from '../components/kpi-card/kpi-card.component';
import { AreaChartComponent } from '../components/area-chart/area-chart.component';
import { LineChartComponent } from '../components/line-chart/line-chart.component';
import { BarChartComponent } from '../components/bar-chart/bar-chart.component';
import { PieChartComponent } from '../components/pie-chart/pie-chart.component';
import { RadarChartComponent } from '../components/radar-chart/radar-chart.component';
import { DoughnutChartComponent } from '../components/doughnut-chart/doughnut-chart.component';
import { HorizontalBarChartComponent } from '../components/horizontal-bar-chart/horizontal-bar-chart.component';
import { DataTableComponent } from '../components/data-table/data-table.component';


@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule,FormsModule,GridsterModule,KpiCardComponent,AreaChartComponent,LineChartComponent,BarChartComponent,AreaChartComponent,PieChartComponent,RadarChartComponent,DoughnutChartComponent,HorizontalBarChartComponent,DataTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  options: GridsterConfig = {};
  dashboard: GridsterItem[] = [];

  private subscription: Subscription = new Subscription();
  private resizeTimeout: any;
  private gridsterApi: any;
  private isDragging: boolean = false;
  private scrollContainer: HTMLElement | null = null;

  // Dynamic dashboard properties
  currentDashboard: Dashboard | null = null;
  isLoadingWidgets = false;

  constructor(
    private el: ElementRef,
    private sidebarService: SidebarService,
    private animationService: AnimationService,
    private dashboardService: DashboardService,
    private themeService: ThemeService,
    private dialog: MatDialog,

  ) {}

  ngOnInit(): void {
    this.initializeGridster();


    
    // Subscribe to sidebar state changes
    this.subscription.add(
      this.sidebarService.sidebarState$.subscribe(state => {
        // Debounce the resize calculation to avoid excessive recalculations
        this.debouncedRecalculate();
      })
    );

    // Subscribe to current dashboard changes
    this.subscription.add(
      this.dashboardService.currentDashboard$.subscribe(dashboard => {
        this.currentDashboard = dashboard;
        if (dashboard) {
          this.loadDashboardWidgets(dashboard.id);
        } else {
          this.dashboard = [];
        }
      })
    );

    // Subscribe to theme changes for animations
    this.subscription.add(
      this.themeService.themeChanges$.subscribe(() => {
        // Trigger a recalculation when theme changes
        this.debouncedRecalculate();
      })
    );
  }

  ngAfterViewInit(): void {
    // Ensure dimensions are calculated after the view has been initialized and rendered.
    // This is crucial because the 'main-content' element's width might not be available in ngOnInit.
    setTimeout(() => {
      this.calculateGridsterDimensions();
      this.changedOptions(); // Trigger Gridster to re-render with updated options
      this.setupScrollHandling(); // Setup scroll handling for drag operations
      
      // Animate dashboard elements on load
      this.animateDashboardElements();
    }, 50); // Increased timeout for better initialization
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }

  // HostListener to recalculate grid dimensions on window resize events
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    // Don't recalculate layout when dialog is open to prevent widget relocation
    if (!document.body.classList.contains('dialog-open') && !document.body.classList.contains('cdk-global-overlay-wrapper')) {
      this.debouncedRecalculate();
    }
  }

  private debouncedRecalculate(): void {
    // Don't recalculate layout when dialog is open to prevent widget relocation
    if (document.body.classList.contains('dialog-open') || document.body.classList.contains('cdk-global-overlay-wrapper')) {
      return;
    }
    
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      // Double check dialog state before executing
      if (!document.body.classList.contains('dialog-open') && !document.body.classList.contains('cdk-global-overlay-wrapper')) {
        this.calculateGridsterDimensions();
        this.changedOptions();
      }
    }, 300); // Increased debounce time for better performance
  }

  private initializeGridster(): void {
    // Initialize Gridster options
    this.options = {
      gridType: 'verticalFixed', // Use 'verticalFixed' to explicitly control column and row sizes
      displayGrid: DisplayGrid.None, // Show grid lines for better visual feedback
      compactType: CompactType.CompactUp, // Compact items upwards when space is available
      pushItems: true, // Push other items away when dragging/resizing
      swap: true, // Allow items to swap places when dragging
      draggable: {
        enabled: true, // Enable dragging of grid items
        delayStart: 0, // No delay for better responsiveness
        dragHandleClass: 'drag-handle', // Add specific drag handle class
        ignoreContentClass: 'no-drag', // Ignore elements with this class
        dropOverItems: false // Don't drop over other items
      },
      resizable: {
        enabled: true, // Enable resizing of grid items
        handles: {
          s: true,
          e: true,
          n: true,
          w: true,
          se: true,
          ne: true,
          sw: true,
          nw: true
        }
      },
      minCols: 6, // 6 columns for the payment analytics layout
      maxCols: 6, // 6 columns to maintain a consistent layout
      minRows: 10, // Increased minRows to accommodate the payment analytics layout
      maxRows: 50, // Increased for more vertical flexibility
      defaultItemCols: 1, // Default width for newly added items (1 column)
      defaultItemRows: 1, // Default height for newly added items (1 row)
      margin: 16, // Reduced margin for better space utilization
      outerMargin: true, // Apply outer margins around the grid
      fixedColWidth: 0, // Placeholder, will be calculated dynamically
      fixedRowHeight: 0, // Placeholder, will be calculated dynamically
      setGridSize: true, // Gridster will calculate its overall size based on items
      itemChangeCallback: this.itemChange.bind(this), // Callback for item position changes
      itemResizeCallback: this.itemResize.bind(this), // Callback for item resize changes
      disableWarnings: true, // Keep warnings enabled for development/debugging
      enableEmptyCellClick: false, // Disable empty cell clicks
      enableEmptyCellContextMenu: false, // Disable context menu on empty cells
      enableEmptyCellDrop: true, // Allow dropping on empty cells
      enableEmptyCellDrag: false, // Disable dragging from empty cells
      emptyCellDragMaxCols: 4, // Max columns for empty cell drag
      emptyCellDragMaxRows: 4, // Max rows for empty cell drag
      api: {
        optionsChanged: () => {
          if (this.gridsterApi) {
            this.gridsterApi.optionsChanged();
          }
        },
        resize: () => {
          if (this.gridsterApi) {
            this.gridsterApi.resize();
          }
        }
      },
      initCallback: (api: any) => {
        this.gridsterApi = api;
        console.log('Gridster API initialized');
        // Setup drag events after API is ready
        setTimeout(() => this.setupGridsterDragEvents(), 100);
      }
    };

    // Initialize empty dashboard - widgets will be loaded dynamically
    this.dashboard = [];

    // Perform initial calculation of grid dimensions
    this.calculateGridsterDimensions();
  }

  /**
   * Calculates the fixed column width and row height for Gridster.
   * This method implements the responsive 'calc' logic based on the available container width.
   */
  calculateGridsterDimensions(): void {
    // Select the main content container to get the available width
    const mainContentElement = this.el.nativeElement.querySelector('.main-content');
    if (!mainContentElement) {
      console.warn('Main content element not found for gridster dimension calculation.');
      return;
    }

    // Get the effective width of the main content area
    const availableGridWidth = mainContentElement.offsetWidth;
    
    // Account for padding and margins
    const padding = 48; // Increased padding for better spacing
    const effectiveWidth = availableGridWidth - padding;

    // Get gridster options (using current values for calculation)
    const options = this.options;
    const numCols = options.maxCols || 4; // Use maxCols to determine the number of columns to fit
    const margin = options.margin || 16; // Margin between grid items

    // Calculate fixed column width:
    // (Total available width - (number of columns - 1) * margin) / number of columns
    // This evenly distributes the width among columns, accounting for margins between them.
    const fixedColWidth = Math.max(280, (effectiveWidth - (numCols - 1) * margin) / numCols);

    // Calculate fixed row height optimized for different widget types
    // For 1x1 KPI cards: square aspect ratio works well
    // For 2x2 charts: slightly rectangular works better
    const aspectRatio = 0.75; // Optimized ratio for both KPI cards and charts
    const fixedRowHeight = Math.max(180, fixedColWidth * aspectRatio);

    // Ensure minimum dimensions for readability
    const minColWidth = 280; // Minimum width for proper chart rendering
    const minRowHeight = 180; // Minimum height for proper chart rendering
    
    const finalColWidth = Math.max(minColWidth, fixedColWidth);
    const finalRowHeight = Math.max(minRowHeight, fixedRowHeight);

    // Update gridster options with the newly calculated dimensions
    this.options = {
      ...this.options, // Spread existing options to maintain other configurations
      fixedColWidth: finalColWidth,
      fixedRowHeight: finalRowHeight,
    };
    
    console.log(`Gridster dimensions updated: ColWidth=${finalColWidth.toFixed(2)}, RowHeight=${finalRowHeight.toFixed(2)}, AvailableWidth=${availableGridWidth}, EffectiveWidth=${effectiveWidth}`);
    
    // Trigger gridster to recalculate with new dimensions
    if (this.gridsterApi) {
      this.gridsterApi.optionsChanged();
    }
  }

  /**
   * Triggers Gridster to recalculate its layout when options change.
   */
  changedOptions(): void {
    if (this.options.api && this.options.api.optionsChanged) {
      this.options.api.optionsChanged();
    }
  }



  /**
   * Callback function when a grid item's position changes.
   * @param item The GridsterItem that changed.
   * @param itemComponent The GridsterItemComponent instance.
   */
  itemChange(item: GridsterItem, itemComponent: any): void {
    // Persist layout on drag end or item move
    const dashboardId = this.currentDashboard?.id;
    const dashboardWidgetId = item['data']?.dashboardWidgetId;
    if (!dashboardId || !dashboardWidgetId) return;

    this.dashboardService.updateDashboardWidgetLayout(dashboardId, dashboardWidgetId, {
      positionX: item.x,
      positionY: item.y,
      width: item.cols,
      height: item.rows
    }).subscribe({
      next: () => {},
      error: (err) => console.error('Failed to persist widget position', err)
    });
  }

  /**
   * Callback function when a grid item is resized.
   * @param item The GridsterItem that was resized.
   * @param itemComponent The GridsterItemComponent instance.
   */
  itemResize(item: GridsterItem, itemComponent: any): void {
    // Persist layout on resize
    const dashboardId = this.currentDashboard?.id;
    const dashboardWidgetId = item['data']?.dashboardWidgetId;
    if (!dashboardId || !dashboardWidgetId) return;

    this.dashboardService.updateDashboardWidgetLayout(dashboardId, dashboardWidgetId, {
      positionX: item.x,
      positionY: item.y,
      width: item.cols,
      height: item.rows
    }).subscribe({
      next: () => {},
      error: (err) => console.error('Failed to persist widget size', err)
    });
  }

  /**
   * Removes a specified item from the dashboard.
   * @param item The GridsterItem to remove.
   */
  removeItem(item: GridsterItem): void {
    this.dashboard.splice(this.dashboard.indexOf(item), 1);
    this.changedOptions(); // Notify Gridster of the change
  }

  /**
   * Adds a new default widget to the dashboard.
   */
  addItem(): void {
    // Adds a new item to the dashboard. Gridster's compactType will try to place it optimally.
    this.dashboard.push({ cols: this.options.defaultItemCols || 2, rows: this.options.defaultItemRows || 1, y: 0, x: 0, component: 'new-widget', data: { title: 'New Widget' } });
    this.changedOptions(); // Notify Gridster of the new item
  }

  /**
   * Load dashboard widgets from backend and convert to gridster format
   */
  private loadDashboardWidgets(dashboardId: number): void {
    this.isLoadingWidgets = true;
    
    this.subscription.add(
      this.dashboardService.getDashboardWidgets(dashboardId).subscribe({
        next: (widgets) => {
          this.dashboard = this.convertWidgetsToGridsterItems(widgets);
          this.isLoadingWidgets = false;
          
          // Trigger gridster to recalculate layout
          setTimeout(() => {
            this.changedOptions();
            this.animateDashboardElements();
          }, 100);
        },
        error: (error) => {
          console.error('Error loading dashboard widgets:', error);
          this.dashboard = [];
          this.isLoadingWidgets = false;
        }
      })
    );
  }

  /**
   * Setup scroll handling for drag operations
   */
  private setupScrollHandling(): void {
    // Get the scroll container
    this.scrollContainer = this.el.nativeElement.querySelector('.dashboard-content');
    
    if (!this.scrollContainer) {
      console.warn('Dashboard scroll container not found');
      return;
    }

    // Listen for gridster drag start and end events
    this.setupGridsterDragEvents();
  }

  /**
   * Setup gridster drag event listeners
   */
  private setupGridsterDragEvents(): void {
    if (!this.gridsterApi) {
      // Retry after API is available
      setTimeout(() => this.setupGridsterDragEvents(), 100);
      return;
    }

    // Monitor DOM changes to detect drag state
    this.observeDragStates();

    // Override gridster's drag start and end callbacks
    const originalItemChange = this.options.itemChangeCallback;
    
    this.options.itemChangeCallback = (item: GridsterItem, itemComponent: any) => {
      // Call original callback first
      if (originalItemChange) {
        originalItemChange(item, itemComponent);
      }
      
      // Check for drag state after a small delay to ensure DOM has updated
      setTimeout(() => this.checkDragState(), 10);
    };
  }

  /**
   * Observe DOM changes to detect drag states
   */
  private observeDragStates(): void {
    const gridsterElement = this.el.nativeElement.querySelector('gridster');
    if (!gridsterElement) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          this.checkDragState();
        }
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.classList.contains('gridster-item-moving')) {
                this.startDrag();
              }
            }
          });
        }
      });
    });

    observer.observe(gridsterElement, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true
    });

    // Store observer for cleanup
    this.subscription.add({
      unsubscribe: () => observer.disconnect()
    });
  }

  /**
   * Check current drag state
   */
  private checkDragState(): void {
    const movingElements = this.el.nativeElement.querySelectorAll('.gridster-item-moving');
    const wasDragging = this.isDragging;
    this.isDragging = movingElements.length > 0;

    if (this.isDragging && !wasDragging) {
      this.startDrag();
    } else if (!this.isDragging && wasDragging) {
      this.endDrag();
    }
  }

  /**
   * Start drag operation
   */
  private startDrag(): void {
    this.enableScrollDuringDrag();
    console.log('Drag started - scroll support enabled');
  }

  /**
   * End drag operation
   */
  private endDrag(): void {
    this.disableScrollDuringDrag();
    console.log('Drag ended - scroll support disabled');
  }

  /**
   * Enable scroll support during drag operations
   */
  private enableScrollDuringDrag(): void {
    if (!this.scrollContainer) return;
    
    // Add scroll event listener
    this.scrollContainer.addEventListener('scroll', this.handleScrollDuringDrag.bind(this), { passive: true });
    
    // Add CSS class for scroll indication
    this.scrollContainer.classList.add('drag-scroll-active');
  }

  /**
   * Disable scroll support after drag operations
   */
  private disableScrollDuringDrag(): void {
    if (!this.scrollContainer) return;
    
    // Remove scroll event listener
    this.scrollContainer.removeEventListener('scroll', this.handleScrollDuringDrag.bind(this));
    
    // Remove CSS class
    this.scrollContainer.classList.remove('drag-scroll-active');
  }

  /**
   * Handle scroll events during drag operations
   */
  private handleScrollDuringDrag(event: Event): void {
    if (!this.isDragging || !this.gridsterApi) return;
    
    // Force gridster to recalculate positions during scroll
    requestAnimationFrame(() => {
      if (this.gridsterApi && this.isDragging) {
        // Update gridster layout
        this.gridsterApi.resize();
        
        // Ensure drag position follows scroll
        const movingItems = this.el.nativeElement.querySelectorAll('.gridster-item-moving');
        movingItems.forEach((item: HTMLElement) => {
          // Trigger a position update for the moving item
          item.style.transform = item.style.transform;
        });
      }
    });
  }

  /**
   * Convert backend dashboard widgets to gridster items
   */
  private convertWidgetsToGridsterItems(widgets: DashboardWidgetResponse[]): GridsterItem[] {
    return widgets.map((dashboardWidget) => {
      const widget = dashboardWidget.widget;
      const componentType = this.mapChartTypeToComponent(widget.chartType);
      
      return {
        cols: dashboardWidget.width || 2,
        rows: dashboardWidget.height || 2,
        y: dashboardWidget.positionY || 0,
        x: dashboardWidget.positionX || 0,
        component: componentType,
        widgetId: widget.id,
        data: {
          ...this.createWidgetData(widget, componentType),
          dashboardWidgetId: dashboardWidget.id
        }
      };
    });
  }

  /**
   * Create appropriate data structure for each widget component type
   */
  private createWidgetData(widget: any, componentType: string): any {
    const baseData = {
      widgetId: widget.id,
      title: widget.name,
      dataSource: widget.dataSource,
      description: widget.description,
      refreshInterval: widget.refreshInterval || 30,
      chartType: widget.chartType,
      groupFields: widget.groupFields,
      measureFields: widget.measureFields,
      filterCriteria: widget.filterCriteria,
      widgetConfig: widget.widgetConfig,
      // Include the actual widget data from backend
      widgetData: widget.widgetData,
      dataLoadSuccess: widget.dataLoadSuccess,
      dataLoadError: widget.dataLoadError
    };

    // If we have actual widget data from backend, use it
    if (widget.widgetData && widget.dataLoadSuccess) {
      // For KPI cards (COUNT widgets)
      if (componentType === 'kpi-card') {
        const data = widget.widgetData;
        const totalValue = data.total || Object.values(data)[0] || 0;
        return {
          ...baseData,
          value: this.formatNumberValue(totalValue),
          change: 0, // Could be calculated from historical data if available
          trend: 'neutral',
          icon: 'chart',
          subtitle: widget.description || 'Total count',
          data: this.convertBackendDataToChartFormat(data, componentType)
        };
      }

      // For other chart components, convert backend data to chart format
      const chartData = this.convertBackendDataToChartFormat(widget.widgetData, componentType);
      return {
        ...baseData,
        ...chartData
      };
    }

    // Fallback: If no backend data or data load failed, use mock data
    // For KPI cards (COUNT widgets)
    if (componentType === 'kpi-card') {
      return {
        ...baseData,
        value: widget.dataLoadError ? 'Error' : 'Loading...',
        change: 0,
        trend: 'neutral',
        icon: 'chart',
        subtitle: widget.dataLoadError || widget.description || 'Total count',
        data: {}
      };
    }

    // For chart components, provide mock data structure as fallback
    const mockChartData = this.getMockDataForChartType(componentType);
    
    return {
      ...baseData,
      ...mockChartData,
      isLoadingData: !widget.dataLoadSuccess && !widget.dataLoadError,
      hasDataError: !!widget.dataLoadError
    };
  }

  /**
   * Format a numeric value for display
   */
  private formatNumberValue(value: any): string {
    const numValue = Number(value);
    if (isNaN(numValue)) return '0';
    
    if (numValue >= 1000000) {
      return (numValue / 1000000).toFixed(1) + 'M';
    } else if (numValue >= 1000) {
      return (numValue / 1000).toFixed(1) + 'K';
    }
    return numValue.toLocaleString();
  }

  /**
   * Convert backend widget data to chart format based on component type
   */
  private convertBackendDataToChartFormat(data: any, componentType: string): any {
    if (!data || typeof data !== 'object') {
      return {};
    }

    switch (componentType) {
      case 'bar-chart':
      case 'horizontal-bar-chart':
        return {
          labels: Object.keys(data),
          datasets: [{
            data: Object.values(data),
            label: 'Values'
          }]
        };

      case 'line-chart':
      case 'area-chart':
        return {
          labels: Object.keys(data),
          datasets: [{
            data: Object.values(data),
            label: 'Values',
            tension: 0.4
          }]
        };

      case 'pie-chart':
      case 'doughnut-chart':
        return {
          labels: Object.keys(data),
          datasets: [{
            data: Object.values(data),
            label: 'Values'
          }]
        };

      case 'radar-chart':
        return {
          labels: Object.keys(data),
          datasets: [{
            data: Object.values(data),
            label: 'Values'
          }]
        };

      case 'data-table':
        // Convert object data to table rows
        const tableData = Object.entries(data).map(([key, value]) => ({
          category: key,
          value: value
        }));
        return {
          data: tableData,
          columns: ['category', 'value']
        };

      case 'kpi-card':
        const total = data.total || Object.values(data).reduce((sum: number, val: any) => sum + Number(val || 0), 0);
        return {
          value: this.formatNumberValue(total),
          data: data
        };

      default:
        return { data: data };
    }
  }

  /**
   * Generate mock data structure for different chart types
   */
  private getMockDataForChartType(componentType: string): any {
    switch (componentType) {
      case 'bar-chart':
      case 'horizontal-bar-chart':
        return {
          labels: ['ACH', 'FEDNOW', 'FEDWIRE', 'RTP', 'SWIFT'],
          datasets: [{
            data: [850, 320, 480, 240, 157],
            label: 'Payments'
            // Note: backgroundColor will be handled by the chart component
          }]
        };
      
      case 'pie-chart':
      case 'doughnut-chart':
        return {
          labels: ['Completed', 'Pending', 'Failed', 'Cancelled'],
          datasets: [{
            data: [160, 45, 23, 12]
            // Note: backgroundColor will be overridden by theme colors in the component
          }]
        };
      
      case 'line-chart':
      case 'area-chart':
        return {
          labels: [],
          datasets: []
        };
      
      case 'radar-chart':
        return {
          labels: ['Speed', 'Reliability', 'Security', 'Cost', 'UX', 'Integration'],
          datasets: [{
            data: [85, 90, 95, 70, 88, 82],
            label: 'Performance Score',
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)'
          }]
        };
      
      case 'data-table':
        return {
          tableType: 'payment-transactions',
          columns: ['Payment ID', 'Amount', 'Status', 'Date'],
          data: [
            ['PMT001', '$1,250', 'Completed', '2024-01-15'],
            ['PMT002', '$890', 'Pending', '2024-01-15'],
            ['PMT003', '$2,100', 'Completed', '2024-01-14']
          ]
        };
      
      default:
        return {
          labels: ['Category A', 'Category B', 'Category C'],
          datasets: [{
            data: [420, 380, 280],
            label: 'Data'
          }]
        };
    }
  }

  /**
   * Map backend chart type to frontend component type
   */
  private mapChartTypeToComponent(chartType: string): string {
    switch (chartType.toUpperCase()) {
      case 'TABLE': return 'data-table';
      case 'PIE': return 'pie-chart';
      case 'DONUT': return 'doughnut-chart';
      case 'VERTICAL_BAR': return 'bar-chart';
      case 'HORIZONTAL_BAR': return 'horizontal-bar-chart';
      case 'LINE_CHART': return 'line-chart';
      case 'AREA_CHART': return 'area-chart';
      case 'COUNT': return 'kpi-card';
      case 'RADAR_CHART': return 'radar-chart';
      default: 
        console.warn(`Unknown chart type: ${chartType}, defaulting to bar-chart`);
        return 'bar-chart';
    }
  }

  /**
   * Animates dashboard elements on load with smooth stagger effects
   */
    private animateDashboardElements(): void {
    // 1. Animate gridster items with stagger effect
    // Instead of directly animating transform/opacity, add a class that triggers CSS transitions.
    // This ensures elements are visually hidden/scaled but still occupy their layout space initially.
    const gridsterItems = this.el.nativeElement.querySelectorAll('gridster-item');
    if (gridsterItems.length > 0) {
      Array.from(gridsterItems).forEach((el, index) => {
        // Apply initial hidden/scaled state *after* a slight delay
        // but let Gridster calculate the layout first.
        // Then add 'animate-item' class to trigger the transition.
        setTimeout(() => {
          (el as HTMLElement).classList.add('animate-item'); // This class will trigger the animation
        }, 200 + (index * 150)); // Stagger delay
      });
    }

    // 2. Animate individual widgets within gridster items (optional, consider if needed)
    // You might only need to animate the gridster-item itself. If you want a nested animation,
    // ensure the widget-container also has a hidden initial state that doesn't affect parent layout.
    const widgets = this.el.nativeElement.querySelectorAll('.widget-container');
    if (widgets.length > 0) {
      Array.from(widgets).forEach((el, index) => {
        setTimeout(() => {
          (el as HTMLElement).classList.add('animate-widget'); // This class will trigger the animation
        }, 500 + (index * 100)); // Stagger delay
      });
    }
  }

  /**
   * Handle widget removal from dashboard
   */
  handleWidgetRemoval(event: any): void {
    if (!event.dashboardWidgetId || !this.currentDashboard?.id) {
      console.error('Missing dashboard widget ID or current dashboard ID');
      return;
    }

    // Show loading state
    this.isLoadingWidgets = true;

    // Call the dashboard service to remove the widget
    this.dashboardService.removeWidgetFromDashboard(
      this.currentDashboard.id, 
      event.dashboardWidgetId
    ).subscribe({
      next: () => {
        // Remove the widget from the local dashboard array
        this.dashboard = this.dashboard.filter(item => 
          item['data']?.dashboardWidgetId !== event.dashboardWidgetId
        );
        
        // Update gridster layout
        this.options = { ...this.options };
        this.isLoadingWidgets = false;
        
        console.log('Widget removed successfully from dashboard');
      },
      error: (error) => {
        console.error('Error removing widget from dashboard:', error);
        this.isLoadingWidgets = false;
        // Show error message to user
        alert('Failed to remove widget from dashboard. Please try again.');
      }
    });
  }

  /**
   * Remove widget from dashboard using X button
   */
  removeWidgetFromDashboard(dashboardWidgetId: number): void {
    if (!dashboardWidgetId || !this.currentDashboard?.id) {
      console.error('Missing dashboard widget ID or current dashboard ID');
      return;
    }

    if (!confirm('Are you sure you want to remove this widget from the dashboard?')) {
      return;
    }

    // Show loading state
    this.isLoadingWidgets = true;

    // Call the dashboard service to remove the widget
    this.dashboardService.removeWidgetFromDashboard(
      this.currentDashboard.id, 
      dashboardWidgetId
    ).subscribe({
      next: () => {
        // Remove the widget from the local dashboard array
        this.dashboard = this.dashboard.filter(item => 
          item['data']?.dashboardWidgetId !== dashboardWidgetId
        );
        
        // Update gridster layout
        this.options = { ...this.options };
        this.isLoadingWidgets = false;
        
        console.log('Widget removed successfully from dashboard');
      },
      error: (error) => {
        console.error('Error removing widget from dashboard:', error);
        this.isLoadingWidgets = false;
        // Show error message to user
        alert('Failed to remove widget from dashboard. Please try again.');
      }
    });
  }

  /**
   * Edit widget from dashboard using edit button
   */
  editWidgetFromDashboard(widgetId: number): void {
    if (!widgetId) {
      console.error('Missing widget ID');
      return;
    }

    const dialogRef = this.dialog.open(EditWidgetDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: 'auto',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: false, // Allow closing with ESC and backdrop click
      closeOnNavigation: true, // Close when navigating
      hasBackdrop: true, // Show backdrop
      panelClass: ['create-dashboard-dialog-container', 'centered-dialog-pane'],
      backdropClass: 'create-dashboard-backdrop', // Use same backdrop class as other dialogs
      restoreFocus: true, // Restore focus when closed
      position: {
        // Remove specific positioning to let flexbox centering work
      },
      data: {
        widgetId: widgetId
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.success) {
        console.log('Widget updated successfully:', result.widget);
        // Dashboard refresh is handled by the dialog itself
      }
    });
  }

}
