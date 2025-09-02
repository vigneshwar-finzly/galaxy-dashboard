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
  imports: [CommonModule,FormsModule,WidgetHeaderComponent,NgChartsModule],
  selector: 'app-area-chart',
  templateUrl: './area-chart.component.html',
  styleUrls: ['./area-chart.component.scss']
})
export class AreaChartComponent implements OnInit, OnDestroy {
  @Input() data!: any;
  @Input() title: string = 'Area Chart';
  @Input() height: string = '300px';
  @Input() showArea: boolean = true;
  @Input() tension: number = 0.3;
  @Input() fillOpacity: number = 0.2;
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

  // Theme-driven palette for area charts - using subtle teal colors
  private colors = {
    primary: '#14b8a6',
    primaryLight: '#5eead4',
    primaryDark: '#0f766e',
    success: '#10b981',
    danger: '#ef4444',
    gray: '#6b7280',
    area: '#14b8a6',
    areaLight: '#5eead4',
    areaDark: '#0f766e'
  };

  public chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { 
      duration: 1000, 
      easing: 'easeInOutCubic',
      onComplete: () => {
        this.updateSelectedDataPoint();
      }
    },
    transitions: {
      active: {
        animation: {
          duration: 200
        }
      }
    },
    hover: {
      mode: 'nearest',
      intersect: false
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false,
        external: (context) => {
          this.updateSelectedDataPointFromTooltip(context);
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(20, 184, 166, 0.1)',
          lineWidth: 1
        },
        ticks: {
          color: '#14b8a6',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            size: 12,
            weight: 500
          },
          maxTicksLimit: 8,
          padding: 12
        },
        border: {
          color: 'rgba(107, 114, 128, 0.2)',
          width: 1
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(20, 184, 166, 0.08)',
          lineWidth: 1
        },
        ticks: {
          color: '#14b8a6',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            size: 12,
            weight: 500
          },
          padding: 15,
          callback: function(value: any) {
            if (typeof value === 'number') {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
            }
            return value;
          }
        },
        border: {
          color: 'rgba(107, 114, 128, 0.2)',
          width: 1
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    elements: {
      point: {
        hoverRadius: 8,
        hitRadius: 15
      }
    },
    onHover: (event, activeElements) => {
      if (activeElements.length > 0) {
        this.updateSelectedDataPointFromHover(activeElements[0]);
      }
    }
  };

  constructor(
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    console.log('🚀 Area Chart ngOnInit - Starting initialization');
    this.initializeChartData();
    this.updateColorsFromTheme();
    this.setupResizeObserver();
    this.setupViewportObserver();
    
    // Force immediate data generation and update
    setTimeout(() => {
      console.log('🔄 Area Chart - Forcing initial data update');
      this.generateRandomData();
      this.updateSelectedDataPoint();
      console.log('📊 Area Chart - Initial selectedDataPoint:', this.selectedDataPoint);
      
      // TEMPORARY TEST: Force a positive change to test colors
      console.log('🧪 TEST: Forcing positive change to test colors');
      this.selectedDataPoint = {
        ...this.selectedDataPoint,
        change: 15.5 // Force positive value
      };
      this.cdr.detectChanges();
      console.log('🧪 TEST: Forced selectedDataPoint:', this.selectedDataPoint);
    }, 100);
    
    this.themeSub = this.themeService.themeChanges$.subscribe(() => {
      this.updateColorsFromTheme();
      this.initializeChartData();
      if (this.chart?.chart) {
        this.chart.chart.update('none');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.themeSub) {
      this.themeSub.unsubscribe();
    }
    
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId);
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.viewportObserver) {
      this.viewportObserver.disconnect();
    }
  }

  onTimeFrameChange(timeFrame: string): void {
    this.selectedTimeFrame = timeFrame;
    this.refreshData();
  }

  private refreshData(): void {
    this.isRefreshing = true;
    this.cdr.detectChanges();
    
    // Simulate data loading
    setTimeout(() => {
      this.generateRandomData();
      this.isRefreshing = false;
      this.cdr.detectChanges();
    }, 1500);
  }

  private generateRandomData(): void {
    const periods = {
      '7d': 7,
      '1w': 7,
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
      'all': 500
    };
    
    const days = periods[this.selectedTimeFrame as keyof typeof periods] || 30;
    
    // Generate data with realistic trends - same logic as line chart
    const baseValue = 12500;
    const trend = Math.random() > 0.5 ? 1 : -1; // Random trend direction
    
    // Force a scenario that ensures we get positive changes sometimes
    const forcePositiveTrend = Date.now() % 2 === 0; // Every other refresh for more frequent positive trends
    const actualTrend = forcePositiveTrend ? 1 : trend;
    
    const data = Array.from({ length: days }, (_, i) => {
      const progress = i / (days - 1);
      const trendValue = baseValue + (actualTrend * progress * baseValue * 0.3);
      const noise = (Math.random() - 0.5) * baseValue * 0.1;
      let result = Math.round(trendValue + noise);
      
      // Ensure positive progression in the last few points if forcing positive
      if (forcePositiveTrend && i >= days - 3) {
        result = Math.max(result, baseValue + (i * 200)); // Stronger upward trend for more noticeable change
      }
      
      return result;
    });
    
    console.log('🔥 Area Chart Data Generation Debug:', {
      timeFrame: this.selectedTimeFrame,
      trend: actualTrend > 0 ? 'positive' : 'negative',
      forcePositiveTrend,
      firstValue: data[0],
      lastValue: data[data.length - 1],
      change: data.length > 1 ? ((data[data.length - 1] - data[data.length - 2]) / data[data.length - 2]) * 100 : 0,
      actualData: data.slice(-5) // Show last 5 values
    });
    
    this.chartData = {
      labels: Array.from({length: days}, (_, i) => `Day ${i + 1}`),
      datasets: [{
        data: data,
        label: 'Area Data',
        fill: true,
        tension: this.tension,
        borderColor: this.colors.primary,
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          const area = chart?.chartArea;
          if (!area) return this.hexToRgba(this.colors.primary, this.fillOpacity);
          const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          g.addColorStop(0, this.hexToRgba(this.colors.primary, 0.4));
          g.addColorStop(0.5, this.hexToRgba(this.colors.primaryLight, 0.25));
          g.addColorStop(1, this.hexToRgba(this.colors.primaryDark, 0.05));
          return g;
        },
        pointBackgroundColor: this.colors.primary,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: this.colors.primary,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBorderWidth: 2,
        borderWidth: 3,
        borderDash: [8, 4]  // Dashed line to distinguish from solid line charts
      }]
    };
    
    this.updateSelectedDataPoint();
    
    // Force change detection after data update
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 50);
  }

  private updateColorsFromTheme(): void {
    // Update colors based on current theme - using subtle teal
    const root = getComputedStyle(document.documentElement);
    this.colors.primary = '#14b8a6'; // Subtle teal
    this.colors.primaryLight = '#5eead4';
    this.colors.primaryDark = '#0f766e';
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
            borderWidth: 3,
            borderDash: [8, 4], // Distinguish from line charts
            backgroundColor: dataset.backgroundColor || ((ctx: any) => {
              const chart = ctx.chart;
              const area = chart?.chartArea;
              if (!area) return this.hexToRgba(baseColor, this.fillOpacity);
              const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              g.addColorStop(0, this.hexToRgba(baseColor, 0.4));
              g.addColorStop(0.5, this.hexToRgba(baseColor, 0.25));
              g.addColorStop(1, this.hexToRgba(baseColor, 0.05));
              return g;
            }),
            pointBackgroundColor: dataset.pointBackgroundColor || baseColor,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: baseColor,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBorderWidth: 2
          };
        })
      };
    } else {
      this.generateRandomData();
    }
  }

  private getColorByIndex(index: number): string {
    const colorArray = [
      this.colors.primary,
      this.colors.success,
      this.colors.danger,
      this.colors.gray,
      this.colors.primaryLight,
      this.colors.primaryDark
    ];
    return colorArray[index % colorArray.length];
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
    console.log('💚 Area Chart Stats Update:', {
      latestValue,
      previousValue,
      change,
      isPositive: change >= 0,
      changeCondition: `(${change} >= 0) = ${change >= 0}`,
      selectedDataPointBefore: { ...this.selectedDataPoint }
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
      
      console.log('💚 Area Chart Stats After Update:', this.selectedDataPoint);
      
      // Use markForCheck instead of detectChanges for smoother updates
      this.cdr.markForCheck();
    }
  }

  private updateSelectedDataPointFromTooltip(context: any): void {
    if (context.tooltip?.dataPoints?.[0]) {
      const dataPoint = context.tooltip.dataPoints[0];
      this.selectedDataPoint = {
        value: dataPoint.parsed.y,
        change: this.selectedDataPoint.change,
        period: dataPoint.label,
        trend: this.selectedDataPoint.trend
      };
      this.cdr.detectChanges();
    }
  }

  private updateSelectedDataPointFromHover(activeElement: any): void {
    if (!activeElement || !this.chartData.datasets) return;

    const datasetIndex = activeElement.datasetIndex;
    const index = activeElement.index;
    const value = this.chartData.datasets[datasetIndex].data[index] as number;
    const previousValue = index > 0 ? this.chartData.datasets[datasetIndex].data[index - 1] as number : value;
    const change = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;

    // Clear any pending updates
    if (this.updateTimeoutId) {
      cancelAnimationFrame(this.updateTimeoutId);
    }

    // Smooth updates using requestAnimationFrame with optimized change detection
    this.updateTimeoutId = window.setTimeout(() => {
      this.ngZone.run(() => {
        // Check if values actually changed to prevent unnecessary updates
        const newDataPoint = {
          value: value,
          change: change,
          period: this.chartData.labels?.[index] || 'Unknown',
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

  private getTimeFrameLabel(): string {
    const labels: { [key: string]: string } = {
      '7d': 'Last 7 days',
      '1w': 'Last week', 
      '1m': 'Last month',
      '3m': 'Last 3 months',
      '6m': 'Last 6 months',
      '1y': 'Last year',
      'all': 'All time'
    };
    return labels[this.selectedTimeFrame] || 'Current period';
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.runOutsideAngular(() => {
          if (this.updateTimeoutId) {
            clearTimeout(this.updateTimeoutId);
          }
          this.updateTimeoutId = window.setTimeout(() => {
            this.ngZone.run(() => {
              if (this.chart?.chart) {
                this.chart.chart.resize();
              }
            });
          }, 100);
        });
      });
    }
  }

  private setupViewportObserver(): void {
    if (typeof IntersectionObserver !== 'undefined') {
      this.viewportObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && this.chart?.chart) {
            this.chart.chart.resize();
          }
        });
      });
    }
  }

  // Widget action handlers
  handleRefresh(): void {
    this.refreshData();
  }

  handleExpand(data: any): void {
    const dialogRef = this.dialog.open(ExpandedWidgetDialogComponent, {
      width: '90vw',
      height: '80vh',
      maxWidth: '1200px',
      data: {
        title: this.title,
        type: 'area',
        data: this.getExpandedData()
      }
    });
  }

  handleClose(data: any): void {
    this.widgetRemoved.emit({ dashboardWidgetId: data?.dashboardWidgetId });
  }

  getExpandedData(): any {
    return {
      ...this.data,
      chartData: this.chartData,
      selectedDataPoint: this.selectedDataPoint,
      timeFrame: this.selectedTimeFrame
    };
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}