import { Component, Input, OnInit, OnDestroy, ViewChild, Output, EventEmitter, ChangeDetectorRef, NgZone } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ThemeService } from '../../services/theme.service';
import { MatDialog } from '@angular/material/dialog';
import { ExpandedWidgetDialogComponent } from '../expanded-widget-dialog/expanded-widget-dialog.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WidgetHeaderComponent } from '../widget-header/widget-header.component';


@Component({
  standalone: true,
  imports: [NgChartsModule,CommonModule,FormsModule,WidgetHeaderComponent],
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements OnInit, OnDestroy {
  @Input() data!: any;
  @Input() title: string = 'Line Chart';
  @Input() height: string = '300px';
  @Input() showArea: boolean = true;
  @Input() tension: number = 0.4;
  @Output() widgetRemoved = new EventEmitter<{dashboardWidgetId?: number}>();
  
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  private themeSub?: any;
  private updateTimeoutId?: number;
  private resizeObserver?: ResizeObserver;
  private viewportObserver?: any;

  
  isRefreshing = false;
  selectedTimeFrame = '1m';
  selectedDataPoint: any = {
    value: 12500,
    change: 4.16, // Start with a positive value for testing
    period: 'Loading...',
    trend: 'Bullish'
  };

  // Theme-driven palette - will be updated dynamically
  private colors = {
    primary: '#3498db',
    primaryLight: '#5dade2',
    primaryDark: '#2e86c1',
    success: '#27ae60',
    danger: '#e74c3c',
    gray: '#7f8c8d'
  };

  public chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { 
      duration: 800, 
      easing: 'easeOutQuart',
      onComplete: () => {
        this.updateSelectedDataPoint();
      }
    },
    transitions: {
      active: {
        animation: {
          duration: 0 // Instant transitions for hover states
        }
      }
    },
    hover: {
      mode: 'nearest',
      intersect: false
    },
    plugins: {
      legend: {
        display: false // Hidden in premium design
      },
      tooltip: {
        enabled: false, // Disabled in favor of persistent data display
        external: (context) => {
          this.updateSelectedDataPointFromTooltip(context);
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(148, 163, 184, 0.1)',
          lineWidth: 1,
          // drawBorder: false
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            size: 12,
            weight: 500
          },
          maxTicksLimit: 8,
          padding: 12
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          lineWidth: 1,
          // drawBorder: false
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            size: 12,
            weight: 500
          },
          padding: 16,
          maxTicksLimit: 6,
          callback: function(value) {
            return typeof value === 'number' ? value.toLocaleString() : value;
          }
        },
        border: {
          display: false
        }
      }
    },
    elements: {
      point: {
        radius: 0, // Hide points by default like LeetCode
        hoverRadius: 6, // Show point only on hover
        borderWidth: 2,
        borderColor: '#ffffff',
        backgroundColor: this.colors.primary,
        hoverBackgroundColor: this.colors.primary,
        hoverBorderWidth: 3,
        hitRadius: 30, // Large invisible hit area for smooth detection
        pointStyle: 'circle'
      },
      line: {
        tension: 0.3, // Slightly less tension for smoother curves
        borderWidth: 3,
        borderColor: this.colors.primary,
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const area = chart?.chartArea;
          if (!area) return this.hexToRgba(this.colors.primary, 0.05);
          const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          g.addColorStop(0, this.hexToRgba(this.colors.primary, 0.2));
          g.addColorStop(0.5, this.hexToRgba(this.colors.primary, 0.08));
          g.addColorStop(1, this.hexToRgba(this.colors.primary, 0.02));
          return g;
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'nearest', // Use nearest for smooth point detection
      axis: 'x',
      includeInvisible: true // Allow interaction with invisible points
    },
    onHover: (event, elements, chart) => {
      if (elements && elements.length > 0) {
        const element = elements[0];
        
        // Update stats smoothly with throttling
        this.updateSelectedDataPointFromElement(element);
        chart.canvas.style.cursor = 'pointer';
        
        // Set active element for point highlighting (LeetCode style)
        chart.setActiveElements([{
          datasetIndex: element.datasetIndex,
          index: element.index
        }]);
        
        // Update without animation for instant response
        chart.update('none');
        
      } else {
        chart.canvas.style.cursor = 'crosshair';
        
        // Clear active elements when not hovering over points
        chart.setActiveElements([]);
        chart.update('none');
        
        // Reset to latest point smoothly without forced change detection
        this.ngZone.runOutsideAngular(() => {
          requestAnimationFrame(() => {
            this.ngZone.run(() => {
              this.updateSelectedDataPoint();
            });
          });
        });
      }
    },
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    }
  };

  constructor(
    private themeService: ThemeService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,

  ) { }

  ngOnInit(): void {
    // Update colors from theme service
    this.updateColorsFromTheme();
    
    // Initialize chart data immediately with current theme
    this.initializeChartData();
    
    // Initialize selected data point with latest data
    this.updateSelectedDataPoint();
    
    // Wait for theme to be applied before initializing chart
    setTimeout(() => {
      this.updateColorsFromTheme();
      this.initializeChartData();
      this.updateSelectedDataPoint();
      this.setupResponsiveHandlers();
    }, 100);

    this.themeSub = this.themeService.themeChanges$.subscribe(() => {
      // Re-initialize chart data with new theme colors
      setTimeout(() => {
        this.updateColorsFromTheme();
        this.initializeChartData(); // Re-initialize with new theme colors
        this.updateChartColors();
        this.chartData = { ...this.chartData };
        this.chart?.update();
      }, 50);
    });


  }

  ngOnDestroy(): void {
    if (this.themeSub) {
      this.themeSub.unsubscribe();
    }

    
    // Clean up animation frames
    if (this.updateTimeoutId) {
      cancelAnimationFrame(this.updateTimeoutId);
    }
    
    // Clean up observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.viewportObserver) {
      window.removeEventListener('resize', this.viewportObserver);
      window.removeEventListener('orientationchange', this.viewportObserver);
      window.removeEventListener('scroll', this.viewportObserver);
      
      if ('visualViewport' in window) {
        window.visualViewport!.removeEventListener('resize', this.viewportObserver);
        window.visualViewport!.removeEventListener('scroll', this.viewportObserver);
      }
    }
  }

  private normalizeId(id: any): string | undefined {
    if (id === null || id === undefined) return undefined;
    const str = String(id);
    const match = str.match(/\d+$/);
    return match ? match[0] : str;
  }

  private applyRealtimePayload(raw: any): void {
    try {
      // Case 1: Full chart.js structure provided
      if (raw && typeof raw === 'object' && Array.isArray(raw.labels) && Array.isArray(raw.datasets)) {
        this.chartData = {
          labels: (raw.labels as any[]).map(l => (l != null ? String(l) : '')),
          datasets: raw.datasets.map((dataset: any, index: number) => {
            const baseColor = dataset.borderColor || this.getColorByIndex(index);
            return {
              ...dataset,
              data: this.normalizeNumericDatasetValues(dataset.data),
              fill: this.showArea,
              tension: this.tension,
              borderColor: baseColor,
              backgroundColor: dataset.backgroundColor || ((ctx: any) => {
                const { chart } = ctx;
                const area = chart?.chartArea;
                if (!area) return this.hexToRgba(baseColor, 0.12);
                const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                g.addColorStop(0, this.hexToRgba(baseColor, 0.25));
                g.addColorStop(1, this.hexToRgba(baseColor, 0.05));
                return g;
              }),
              pointBackgroundColor: dataset.pointBackgroundColor || baseColor,
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: baseColor,
              pointRadius: 3,
              pointHoverRadius: 5
            } as any;
          })
        };
      }
      // Case 2: Object map { label: value }
      else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const labels = Object.keys(raw);
        const values = this.normalizeNumericDatasetValues(Object.values(raw));
        this.chartData = {
          labels,
          datasets: [
            {
              data: values,
              label: this.title || 'Data',
              fill: this.showArea,
              tension: this.tension,
              borderColor: this.colors.primary,
              backgroundColor: (ctx: any) => {
                const { chart } = ctx;
                const area = chart?.chartArea;
                if (!area) return this.hexToRgba(this.colors.primary, 0.12);
                const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                g.addColorStop(0, this.hexToRgba(this.colors.primary, 0.25));
                g.addColorStop(1, this.hexToRgba(this.colors.primary, 0.05));
                return g;
              },
              pointBackgroundColor: this.colors.primary,
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: this.colors.primary,
              pointRadius: 0,
              pointHoverRadius: 6
            } as any
          ]
        };
      }
      // Case 3: Array of values -> generate index labels
      else if (Array.isArray(raw)) {
        const values = this.normalizeNumericDatasetValues(raw);
        const labels = values.map((_, i) => `${i + 1}`);
        this.chartData = {
          labels,
          datasets: [
            {
              data: values,
              label: this.title || 'Data',
              fill: this.showArea,
              tension: this.tension,
              borderColor: this.colors.primary,
              backgroundColor: (ctx: any) => {
                const { chart } = ctx;
                const area = chart?.chartArea;
                if (!area) return this.hexToRgba(this.colors.primary, 0.12);
                const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                g.addColorStop(0, this.hexToRgba(this.colors.primary, 0.25));
                g.addColorStop(1, this.hexToRgba(this.colors.primary, 0.05));
                return g;
              }
            } as any
          ]
        };
      }
      // Case 4: Single number -> single-point series
      else if (typeof raw === 'number') {
        this.chartData = {
          labels: ['Now'],
          datasets: [
            {
              data: [raw],
              label: this.title || 'Data',
              fill: this.showArea,
              tension: this.tension,
              borderColor: this.colors.primary,
              backgroundColor: this.hexToRgba(this.colors.primary, 0.12)
            } as any
          ]
        };
      }

      // Finalize
      this.updateSelectedDataPoint();
      this.chartData = { ...this.chartData };
      this.chart?.update('active');
    } catch {}
  }

  private normalizeNumericDatasetValues(arr: any[]): number[] {
    if (!Array.isArray(arr)) return [];
    return arr.map(v => this.coerceToNumber(v));
  }

  private coerceToNumber(value: any): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const n = Number(value.replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    if (value && typeof value === 'object') {
      // Common patterns: { value: 123 }, or numeric-like objects
      const maybe = (value as any).value ?? (value as any)._value ?? undefined;
      const n = Number(maybe);
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private updateColorsFromTheme(): void {
    const currentPalette = this.themeService.getCurrentPalette();
    if (currentPalette) {
      this.colors.primary = currentPalette.primary;
      this.colors.primaryLight = currentPalette.primaryLight;
      this.colors.primaryDark = currentPalette.primaryDark;
    } else {
      // Fallback to CSS custom properties
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      this.colors.primary = computedStyle.getPropertyValue('--color-primary').trim() || '#3498db';
      this.colors.primaryLight = computedStyle.getPropertyValue('--color-primary-light').trim() || '#5dade2';
      this.colors.primaryDark = computedStyle.getPropertyValue('--color-primary-dark').trim() || '#2e86c1';
    }
  }

  private initializeChartData(): void {
    if (this.data && this.data.labels && this.data.datasets) {
      // Use provided data
      this.chartData = {
        labels: this.data.labels,
        datasets: this.data.datasets.map((dataset: any, index: number) => {
          const baseColor = dataset.borderColor || this.getColorByIndex(index);
          return {
            ...dataset,
            fill: this.showArea,
            tension: this.tension,
            borderColor: baseColor,
            backgroundColor: dataset.backgroundColor || ((ctx: any) => {
              const { chart } = ctx;
              const area = chart?.chartArea;
              if (!area) return this.hexToRgba(baseColor, 0.12);
              const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              g.addColorStop(0, this.hexToRgba(baseColor, 0.25));
              g.addColorStop(1, this.hexToRgba(baseColor, 0.05));
              return g;
            }),
            pointBackgroundColor: dataset.pointBackgroundColor || baseColor,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: baseColor,
            pointRadius: 3,
            pointHoverRadius: 5
          };
        })
      };
    } else {
      // Default data
      this.chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            data: [65, 59, 80, 81, 56, 55],
            label: 'Bitcoin Price',
            fill: this.showArea,
            tension: this.tension,
            borderColor: this.colors.primary,
            backgroundColor: (ctx: any) => {
              const { chart } = ctx;
              const area = chart?.chartArea;
              if (!area) return this.hexToRgba(this.colors.primary, 0.12);
              const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              g.addColorStop(0, this.hexToRgba(this.colors.primary, 0.25));
              g.addColorStop(1, this.hexToRgba(this.colors.primary, 0.05));
              return g;
            },
            pointBackgroundColor: this.colors.primary,
            pointBorderColor: '#fff',
            // pointHoverBackgroundColor: this.colors.secondary,
            pointHoverBorderColor: this.colors.primary
          },
          {
            data: [28, 48, 40, 19, 86, 27],
            label: 'Trading Volume',
            fill: this.showArea,
            tension: this.tension,
            borderColor: this.colors.success,
            backgroundColor: (ctx: any) => {
              const { chart } = ctx;
              const area = chart?.chartArea;
              if (!area) return this.hexToRgba(this.colors.success, 0.12);
              const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              g.addColorStop(0, this.hexToRgba(this.colors.success, 0.25));
              g.addColorStop(1, this.hexToRgba(this.colors.success, 0.05));
              return g;
            },
            pointBackgroundColor: this.colors.success,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: this.colors.primary,
            // pointHoverBorderColor: this.colors.secondary
          }
        ]
      };
    }
  }

  private getColorByIndex(index: number, opacity: number = 1): string {
    // Use theme colors from CSS variables for consistency
    const colorArray = [
      this.colors.primary,
      getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim() || '#27ae60',
      getComputedStyle(document.documentElement).getPropertyValue('--color-error').trim() || '#e74c3c',
      getComputedStyle(document.documentElement).getPropertyValue('--color-warning').trim() || '#f59e0b',
      this.colors.primaryLight,
      this.colors.primaryDark
    ];
    const color = colorArray[index % colorArray.length];
    
    if (opacity !== 1) {
      return this.hexToRgba(color, opacity);
    }
    
    return color;
  }

  private updateChartColors(): void {
    if (!this.chart || !this.chart.data || !this.chart.data.datasets) return;

    this.chart.data.datasets.forEach((dataset: any, index: number) => {
      const baseColor = this.getColorByIndex(index);
      dataset.borderColor = baseColor;
      dataset.pointBackgroundColor = baseColor;
      dataset.pointHoverBorderColor = baseColor;
      dataset.backgroundColor = (ctx: any) => {
        const { chart } = ctx;
        const area = chart?.chartArea;
        if (!area) return this.hexToRgba(baseColor, 0.12);
        const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
        g.addColorStop(0, this.hexToRgba(baseColor, 0.25));
        g.addColorStop(1, this.hexToRgba(baseColor, 0.05));
        return g;
      };
    });

    if (this.chart.options?.plugins?.tooltip) {
      (this.chart.options.plugins.tooltip as any).borderColor = this.hexToRgba(this.colors.primary, 0.2);
    }
    if (this.chart.options?.elements && (this.chart.options.elements as any).line) {
      (this.chart.options.elements as any).line.borderColor = this.colors.primary;
    }

    this.chart.update();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Widget action handlers
  handleRefresh(): void {
    this.isRefreshing = true;
    
    // Simulate data refresh - replace with actual API call
    setTimeout(() => {
      this.updateChartColors();
      this.isRefreshing = false;
    }, 2000);
  }

  handleExpand(event: {widgetId?: number, data?: any}): void {
    const dialogRef = this.dialog.open(ExpandedWidgetDialogComponent, {
      width: 'auto',
      height: 'auto',
      maxWidth: '95vw',
      maxHeight: '90vh',
      hasBackdrop: true,
      closeOnNavigation: true,
      panelClass: ['expanded-widget-dialog-container'],
      backdropClass: 'create-dashboard-backdrop',
      restoreFocus: true,
      position: {},
      data: {
        widgetId: event.widgetId,
        data: this.getExpandedData(),
        title: this.title,
        chartType: 'line-chart',
        description: this.data?.description || 'Line chart showing trends over time'
      }
    });
  }

  handleClose(event: {dashboardWidgetId?: number}): void {
    if (confirm('Are you sure you want to remove this widget from the dashboard?')) {
      this.widgetRemoved.emit(event);
    }
  }

  getExpandedData(): any {
    return {
      component: 'line-chart',
      title: this.title,
      dashboardWidgetId: this.data?.dashboardWidgetId,
      datasets: this.chartData.datasets,
      labels: this.chartData.labels,
      description: this.data?.description,
      ...this.data
    };
  }

  // Premium Features

  onTimeFrameChange(timeFrame: string): void {
    this.selectedTimeFrame = timeFrame;
    this.refreshChartData();
  }

  private refreshChartData(): void {
    // Simulate data refresh based on time frame
    this.isRefreshing = true;
    setTimeout(() => {
      this.generateDataForTimeFrame(this.selectedTimeFrame);
      this.chartData = { ...this.chartData }; // Trigger chart update
      this.updateSelectedDataPoint();
      this.chart?.update();
      this.isRefreshing = false;
    }, 800);
  }

  private generateDataForTimeFrame(timeFrame: string): void {
    const timeFrameConfig = {
      '7d': { points: 7, label: 'Daily' },
      '1w': { points: 7, label: 'Daily' },
      '1m': { points: 30, label: 'Daily' },
      '3m': { points: 12, label: 'Weekly' },
      '6m': { points: 26, label: 'Bi-weekly' },
      '1y': { points: 12, label: 'Monthly' },
      'all': { points: 24, label: 'Monthly' }
    };

    const config = timeFrameConfig[timeFrame as keyof typeof timeFrameConfig] || timeFrameConfig['1m'];
    
    // Generate labels based on time frame
    const labels = this.generateTimeLabels(timeFrame, config.points);
    
    // Generate realistic data with trends - Force alternating positive/negative trends
    const baseValue = 12500;
    const trend = Math.random() > 0.5 ? 1 : -1; // Keep random but ensure variety
    
    console.log('Data Generation Debug:', { 
      timeFrame, 
      trend: trend > 0 ? 'positive' : 'negative',
      baseValue 
    });
    
    // Force a scenario that ensures we get positive changes sometimes
    const forcePositiveTrend = Date.now() % 3 === 0; // Every third refresh
    const actualTrend = forcePositiveTrend ? 1 : trend;
    
    const data1 = Array.from({ length: config.points }, (_, i) => {
      const progress = i / (config.points - 1);
      const trendValue = baseValue + (actualTrend * progress * baseValue * 0.3);
      const noise = (Math.random() - 0.5) * baseValue * 0.1;
      let result = Math.round(trendValue + noise);
      
      // Ensure positive progression in the last few points if forcing positive
      if (forcePositiveTrend && i >= config.points - 3) {
        result = Math.max(result, baseValue + (i * 100)); // Ensure upward trend
      }
      
      // Debug first few and last few values
      if (i < 3 || i >= config.points - 3) {
        console.log(`Data point ${i}:`, result, forcePositiveTrend ? '(forced positive)' : '');
      }
      
      return result;
    });

    const data2 = Array.from({ length: config.points }, (_, i) => {
      const progress = i / (config.points - 1);
      const trendValue = baseValue * 0.7 + (-trend * progress * baseValue * 0.2);
      const noise = (Math.random() - 0.5) * baseValue * 0.08;
      return Math.round(trendValue + noise);
    });

    this.chartData = {
      labels: labels,
      datasets: [
        {
          data: data1,
          label: 'Revenue',
          fill: this.showArea,
          tension: this.tension,
          borderColor: this.colors.primary,
          backgroundColor: (ctx: any) => {
            const { chart } = ctx;
            const area = chart?.chartArea;
            if (!area) return this.hexToRgba(this.colors.primary, 0.05);
            const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
            g.addColorStop(0, this.hexToRgba(this.colors.primary, 0.2));
            g.addColorStop(0.5, this.hexToRgba(this.colors.primary, 0.08));
            g.addColorStop(1, this.hexToRgba(this.colors.primary, 0.02));
            return g;
          },
          pointBackgroundColor: this.colors.primary,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: this.colors.primary,
          pointHoverBorderColor: this.colors.primary,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          data: data2,
          label: 'Profit',
          fill: this.showArea,
          tension: this.tension,
          borderColor: this.colors.success,
          backgroundColor: (ctx: any) => {
            const { chart } = ctx;
            const area = chart?.chartArea;
            if (!area) return this.hexToRgba(this.colors.success, 0.05);
            const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
            g.addColorStop(0, this.hexToRgba(this.colors.success, 0.2));
            g.addColorStop(0.5, this.hexToRgba(this.colors.success, 0.08));
            g.addColorStop(1, this.hexToRgba(this.colors.success, 0.02));
            return g;
          },
          pointBackgroundColor: this.colors.success,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: this.colors.success,
          pointHoverBorderColor: this.colors.success,
          pointRadius: 0,
          pointHoverRadius: 6
        }
      ]
    };
  }

  private generateTimeLabels(timeFrame: string, points: number): string[] {
    const now = new Date();
    const labels: string[] = [];

    for (let i = points - 1; i >= 0; i--) {
      const date = new Date(now);
      
      switch (timeFrame) {
        case '7d':
        case '1w':
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          break;
        case '1m':
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          break;
        case '3m':
          date.setDate(date.getDate() - (i * 7));
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          break;
        case '6m':
          date.setDate(date.getDate() - (i * 14));
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          break;
        case '1y':
        case 'all':
          date.setMonth(date.getMonth() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
          break;
        default:
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
    }

    return labels;
  }

  private updateSelectedDataPoint(): void {
    if (!this.chartData.datasets || this.chartData.datasets.length === 0) {
      return;
    }

    const latestIndex = this.chartData.datasets[0].data.length - 1;
    const latestValue = this.chartData.datasets[0].data[latestIndex] as number;
    const previousValue = latestIndex > 0 ? this.chartData.datasets[0].data[latestIndex - 1] as number : latestValue;
    
    // Fix the change calculation - ensure we handle division by zero
    let change = 0;
    if (previousValue !== 0) {
      change = ((latestValue - previousValue) / previousValue) * 100;
    } else if (latestValue > 0) {
      change = 100; // If previous was 0 and current is positive, it's 100% increase
    }

    // Debug logging to see actual values
    console.log('Line Chart Stats Debug:', {
      latestValue,
      previousValue,
      change,
      isPositive: change >= 0
    });

    // Create new data point
    const newDataPoint = {
      value: latestValue,
      change: change,
      period: this.chartData.labels?.[latestIndex] || 'Current',
      trend: change > 0 ? 'Bullish' : change < 0 ? 'Bearish' : 'Stable'
    };

    // Only update if values changed to prevent unnecessary re-renders
    if (this.selectedDataPoint.value !== newDataPoint.value || 
        Math.abs(this.selectedDataPoint.change - newDataPoint.change) > 0.01) {
      this.selectedDataPoint = newDataPoint;
      
      // Use markForCheck instead of detectChanges for smoother updates
      this.cdr.markForCheck();
    }
  }

  private updateSelectedDataPointFromElement(element: any): void {
    if (!element || !this.chartData.datasets) return;

    const datasetIndex = element.datasetIndex;
    const index = element.index;
    const value = this.chartData.datasets[datasetIndex].data[index] as number;
    const previousValue = index > 0 ? this.chartData.datasets[datasetIndex].data[index - 1] as number : value;
    const change = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;

    // Clear any pending updates
    if (this.updateTimeoutId) {
      cancelAnimationFrame(this.updateTimeoutId);
    }

    // Smooth updates using requestAnimationFrame with optimized change detection
    this.updateTimeoutId = requestAnimationFrame(() => {
      this.ngZone.run(() => {
        // Check if values actually changed to prevent unnecessary updates
        const newDataPoint = {
          value: value,
          change: change,
          period: this.chartData.labels?.[index] || 'N/A',
          trend: change > 0 ? 'Bullish' : change < 0 ? 'Bearish' : 'Stable'
        };
        
        // Only update if values changed to prevent flashing
        if (this.selectedDataPoint.value !== newDataPoint.value || 
            Math.abs(this.selectedDataPoint.change - newDataPoint.change) > 0.01) {
          this.selectedDataPoint = newDataPoint;
          this.cdr.markForCheck();
        }
      });
    });
  }

  private updateSelectedDataPointFromTooltip(context: any): void {
    // This method can be used for tooltip-based updates if needed
    // Currently using onHover for real-time updates
  }

  getChangeColor(change: number): string {
    if (change > 0) return 'text-emerald-600';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  }

  getTrendBadgeColor(trend: string): string {
    switch (trend) {
      case 'Bullish': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Bearish': return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  private setupResponsiveHandlers(): void {
    // Setup ResizeObserver for aggressive chart resizing
    this.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        this.ngZone.runOutsideAngular(() => {
          requestAnimationFrame(() => {
            this.ngZone.run(() => {
              this.adjustChartForZoom();
              if (this.chart) {
                this.chart.chart?.resize();
                this.chart.update('none');
              }
            });
          });
        });
      }
    });

    // Observe multiple elements
    const chartContainer = document.querySelector('.chart-container');
    const widget = document.querySelector('.premium-chart-widget');
    if (chartContainer) this.resizeObserver.observe(chartContainer);
    if (widget) this.resizeObserver.observe(widget);

    // Setup aggressive viewport change handler
    this.viewportObserver = () => {
      this.ngZone.runOutsideAngular(() => {
        clearTimeout(this.updateTimeoutId);
        this.updateTimeoutId = setTimeout(() => {
          this.ngZone.run(() => {
            this.adjustChartForZoom();
            if (this.chart) {
              this.chartData = { ...this.chartData };
              this.chart.chart?.resize();
              this.chart.update('resize');
            }
          });
        }, 100) as any; // Faster response
      });
    };

    // Listen for all possible viewport changes
    window.addEventListener('resize', this.viewportObserver);
    window.addEventListener('orientationchange', this.viewportObserver);
    window.addEventListener('scroll', this.viewportObserver);
    
    // Visual viewport for zoom detection
    if ('visualViewport' in window) {
      window.visualViewport!.addEventListener('resize', this.viewportObserver);
      window.visualViewport!.addEventListener('scroll', this.viewportObserver);
    }

    // Initial adjustment
    setTimeout(() => this.adjustChartForZoom(), 100);
  }

  private adjustChartForZoom(): void {
    const widget = document.querySelector('.premium-chart-widget') as HTMLElement;
    const chartContainer = document.querySelector('.chart-container') as HTMLElement;
    const canvas = document.querySelector('.chart-canvas') as HTMLElement;
    
    if (!widget || !chartContainer || !canvas) return;

    // Get browser zoom level (more accurate)
    const browserZoom = Math.round((window.outerWidth / window.innerWidth) * 100) / 100;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Get actual available space
    const widgetRect = widget.getBoundingClientRect();
    const availableHeight = widgetRect.height || viewportHeight * 0.8;
    
    // Smart sizing: grow when zoomed out, shrink when zoomed in
    let sizeFactor = 1;
    
    if (browserZoom < 0.75) {
      // Zoomed out (50%, 67%): make charts BIGGER to fill space
      sizeFactor = 1.5;
    } else if (browserZoom < 1) {
      // Slightly zoomed out (75%, 80%): slightly bigger
      sizeFactor = 1.2;
    } else if (browserZoom > 2) {
      // Very zoomed in (200%+): very small
      sizeFactor = 0.4;
    } else if (browserZoom > 1.75) {
      // Zoomed in (175%): small
      sizeFactor = 0.5;
    } else if (browserZoom > 1.5) {
      // Zoomed in (150%): smaller
      sizeFactor = 0.6;
    } else if (browserZoom > 1.25) {
      // Slightly zoomed in (125%): reduced
      sizeFactor = 0.7;
    } else if (browserZoom > 1.1) {
      // Slightly zoomed in (110%): slightly smaller
      sizeFactor = 0.8;
    }

    // Additional responsive adjustments
    if (viewportHeight < 600) sizeFactor *= 0.9;
    if (viewportWidth < 768) sizeFactor *= 0.95;

    // Reserve space for controls and stats
    const reservedHeight = 140;
    const maxChartHeight = Math.max(120, (availableHeight - reservedHeight) * sizeFactor);
    
    // Apply dynamic sizing with better fill
    chartContainer.style.height = `${maxChartHeight}px`;
    chartContainer.style.minHeight = `${maxChartHeight}px`;
    chartContainer.style.maxHeight = `${maxChartHeight}px`;
    
    canvas.style.height = `${maxChartHeight - 10}px`;
    canvas.style.minHeight = `${maxChartHeight - 10}px`;
    canvas.style.maxHeight = `${maxChartHeight - 10}px`;
    
    console.log(`Zoom: ${browserZoom.toFixed(2)}, Chart Height: ${maxChartHeight}px, Factor: ${sizeFactor}`);
  }

  // Test method to force positive change for debugging
  public testPositiveChange(): void {
    console.log('Forcing positive change for test...');
    this.selectedDataPoint = {
      value: 15000,
      change: 12.5, // Force positive change
      period: 'Test Period',
      trend: 'Bullish'
    };
    console.log('Test positive data set:', this.selectedDataPoint);
  }

  // Test method to force negative change for debugging  
  public testNegativeChange(): void {
    console.log('Forcing negative change for test...');
    this.selectedDataPoint = {
      value: 11000,
      change: -8.3, // Force negative change
      period: 'Test Period', 
      trend: 'Bearish'
    };
    console.log('Test negative data set:', this.selectedDataPoint);
  }
} 