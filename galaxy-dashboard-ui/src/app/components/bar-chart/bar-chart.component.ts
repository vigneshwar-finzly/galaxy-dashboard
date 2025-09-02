import { Component, Input, OnInit, OnDestroy, ViewChild, Output, EventEmitter } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ThemePalette, ThemeService } from '../../services/theme.service';
import { MatDialog } from '@angular/material/dialog';

import { ExpandedWidgetDialogComponent } from '../expanded-widget-dialog/expanded-widget-dialog.component';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WidgetHeaderComponent } from '../widget-header/widget-header.component';

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule,NgChartsModule,WidgetHeaderComponent],
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss']
})
export class BarChartComponent implements OnInit, OnDestroy {
  @Input() data!: any;
  @Input() title: string = 'Bar Chart';
  @Input() height: string = '300px';
  @Output() widgetRemoved = new EventEmitter<{dashboardWidgetId?: number}>();
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  private resizeObserver?: ResizeObserver;
  private viewportObserver?: any;
  
  isRefreshing = false;
  selectedTimeFrame = '1m';
  isLogScale = false;
  chartStatistics: any = null;

  

  // Theme-driven palette (reads from CSS variables)
  private readonly colors = {
    get primary() { return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#3498db'; },
    get primaryLight() { return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-light').trim() || '#5dade2'; },
    get primaryDark() { return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-dark').trim() || '#2e86c1'; },
    secondary: '#82C91E',
    danger: '#e74c3c',
    gray: '#7f8c8d'
  } as const;

  public chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1200,
      easing: 'easeOutQuart',
      onComplete: () => {
        this.updateChartStatistics();
      }
    },
    plugins: {
      legend: {
        display: false // Hidden for premium design
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: 'rgba(147, 51, 234, 0.2)',
        borderWidth: 1,
        cornerRadius: 16,
        padding: 16,
        boxPadding: 8,
        caretSize: 8,
        displayColors: true,
        titleFont: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          size: 14,
          weight: 600
        },
        bodyFont: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          size: 13,
          weight: 500
        },
        callbacks: {
          title: function(context) {
            return context[0].label || '';
          },
          label: function(context) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value.toLocaleString()}`;
          },
          afterLabel: function(context) {
            // Add percentage of total
            const dataset = context.dataset;
            const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
            return `${percentage}% of total`;
          }
        }
      },
      datalabels: {
        display: false
      }
    },
    
    scales: {
      x: {
        grid: {
          display: false,
          // drawBorder: false
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            size: 12,
            weight: 500
          },
          maxRotation: 45,
          padding: 8
        },
        border: {
          display: false
        }
      },
      y: {
        type: 'linear',
        beginAtZero: true,
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
          maxTicksLimit: 8,
          callback: function(value) {
            if (typeof value === 'number') {
              return value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toString();
            }
            return value;
          }
        },
        border: {
          display: false
        }
      }
    },
    
    elements: {
      bar: {
        borderRadius: 8,
        borderSkipped: false,
        borderWidth: 0
      }
    },
    
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    },
    
    onHover: (event, elements, chart) => {
      chart.canvas.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
    }
  };

  private themeSub?: any;

  constructor(
    private themeService: ThemeService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    // Initialize chart data and statistics
    this.initializeChartData();
    this.updateChartStatistics();
    this.setupResponsiveHandlers();


    
    // Wait for theme to be applied before initializing chart
    setTimeout(() => {
      this.initializeChartData();
      this.applyBarChartLogic();
      this.updateChartStatistics();
      
      // Live theme updates via CSS variables: simply updating fills on resize/next frame
      const ro = new ResizeObserver(() => {
        // Force re-render of gradients reading chartArea
        this.chartData = { ...this.chartData };
        this.chart?.update();
      });
      const el = document.querySelector('canvas');
      if (el) ro.observe(el);
    }, 100);

    // React to theme palette changes immediately
    this.themeSub = this.themeService.themeChanges$.subscribe(palette => {
      if (palette) {
        setTimeout(() => {
          this.updateChartColors(palette);
        }, 50);
      }
    });
  }

  private normalizeId(id: any): string | undefined {
    if (id === null || id === undefined) return undefined;
    const str = String(id);
    const m = /^widget-(\d+)$/.exec(str);
    return m ? m[1] : str;
  }

  ngOnDestroy(): void {
    if (this.themeSub) {
      this.themeSub.unsubscribe();
    }
    
    // Clean up observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.viewportObserver) {
      window.removeEventListener('resize', this.viewportObserver);
      window.removeEventListener('orientationchange', this.viewportObserver);
      
      if ('visualViewport' in window) {
        window.visualViewport!.removeEventListener('resize', this.viewportObserver);
      }
    }
  }

  private initializeChartData(): void {
    if (this.data && this.data.labels && this.data.datasets) {
      // Use provided data with premium styling
      this.chartData = {
        labels: this.data.labels,
        datasets: this.data.datasets.map((dataset: any) => ({
          ...dataset,
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return this.colors.primary;
            const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, this.hexToRgba(this.colors.primary, 0.6));
            gradient.addColorStop(0.5, this.hexToRgba(this.colors.primary, 0.8));
            gradient.addColorStop(1, this.hexToRgba(this.colors.primary, 0.95));
            return gradient;
          },
          hoverBackgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return this.colors.primary;
            const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, this.hexToRgba(this.colors.primary, 0.8));
            gradient.addColorStop(1, this.hexToRgba(this.colors.primary, 1));
            return gradient;
          },
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 12,
          borderSkipped: false
        }))
      };
    } else {
      // Generate sample data with time-based labels
      this.generateDataForTimeFrame(this.selectedTimeFrame);
    }
  }

  private applyBarChartLogic(): void {
    const numBars = this.chartData?.labels?.length || 0;
    const defaultThickness = 32;
    const minThickness = 8;
    const calculatedThickness = Math.max(minThickness, defaultThickness - numBars);

    const datasets = this.chartData?.datasets || [];
    datasets.forEach(dataset => {
      (dataset as any).barThickness = calculatedThickness;
      (dataset as any).maxBarThickness = calculatedThickness;
      (dataset as any).borderRadius = 4;
    });

    this.chartOptions = this.chartOptions || {};
    this.chartOptions.plugins = this.chartOptions.plugins || {};
    (this.chartOptions.plugins as any).datalabels = 
        (this.chartOptions.plugins as any).datalabels || {};
    (this.chartOptions.plugins as any).datalabels.display = true;

    this.chartOptions.scales = this.chartOptions.scales || {};
    const scales = this.chartOptions.scales;

    const isCartesian = (scale: any): boolean =>
      !scale || ['linear', 'category', 'time', 'logarithmic', 'timeseries'].includes(scale.type);

    // X scale
    const xScale = scales['x'] || {};
    if (isCartesian(xScale)) {
      scales['x'] = {
        ...(xScale as any),
        type: xScale.type || 'category',
        stacked: false,
        ticks: {
          ...(xScale.ticks || {}),
          font: { family: 'Inter' },
          maxRotation: 45,
          autoSkip: true
        }
      };
    }

    // Y scale
    const yScale = scales['y'] || {};
    if (isCartesian(yScale)) {
      scales['y'] = {
        ...(yScale as any),
        type: yScale.type || 'linear',
        ticks: {
          ...(yScale.ticks || {}),
          font: { family: 'Inter' }
        }
      };
    }
  }

  private updateChartColors(palette: ThemePalette): void {
    // Preserve gradient behavior on theme switch
    if (this.chart && this.chart.data && this.chart.data.datasets) {
      this.chart.data.datasets.forEach(dataset => {
        dataset.backgroundColor = (ctx: any) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return this.hexToRgba(palette.primary, 0.45);
          const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, this.hexToRgba(palette.primary, 0.55));
          gradient.addColorStop(1, this.hexToRgba(palette.primary, 0.85));
          return gradient;
        };
        dataset.hoverBackgroundColor = this.hexToRgba(palette.primary, 1);
        dataset.borderColor = palette.primaryDark;
      });

      if (this.chart.options?.plugins?.tooltip) {
        (this.chart.options.plugins.tooltip as any).borderColor = this.hexToRgba(palette.primary, 0.2);
      }

      this.chart.update();
    }
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
      this.initializeChartData();
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
        chartType: 'bar-chart',
        description: this.data?.description || 'Bar chart showing comparative data analysis'
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
      component: 'bar-chart',
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

  onLogScaleToggle(isLogScale: boolean): void {
    console.log('Log scale toggle clicked:', isLogScale);
    this.isLogScale = isLogScale;
    // Update immediately without timeout
    this.updateChartScale();
  }

  private refreshChartData(): void {
    this.isRefreshing = true;
    setTimeout(() => {
      this.generateDataForTimeFrame(this.selectedTimeFrame);
      this.chartData = { ...this.chartData }; // Trigger chart update
      this.updateChartStatistics();
      this.chart?.update();
      this.isRefreshing = false;
    }, 800);
  }

  private updateChartScale(): void {
    console.log('Updating chart scale, isLogScale:', this.isLogScale);
    if (!this.chart || !this.chart.chart) {
      console.log('Chart or chart instance not available');
      return;
    }
    
    const chartInstance = this.chart.chart;
    
    // Calculate and preserve bar thickness
    const numBars = this.chartData?.labels?.length || 0;
    const defaultThickness = 32;
    const minThickness = 8;
    const calculatedThickness = Math.max(minThickness, defaultThickness - numBars);
    
    // Update the chart instance options directly
    if (chartInstance.options && chartInstance.options.scales) {
      const yScale = chartInstance.options.scales['y'] as any;
      if (yScale) {
        yScale.type = this.isLogScale ? 'logarithmic' : 'linear';
        yScale.beginAtZero = !this.isLogScale;
        
        if (this.isLogScale) {
          yScale.min = 1;
        } else {
          delete yScale.min;
        }
      }
    }
    
    // Update the component's chart options
    if (this.chartOptions && this.chartOptions.scales) {
      const yScale = this.chartOptions.scales['y'] as any;
      if (yScale) {
        yScale.type = this.isLogScale ? 'logarithmic' : 'linear';
        yScale.beginAtZero = !this.isLogScale;
        
        if (this.isLogScale) {
          yScale.min = 1;
        } else {
          delete yScale.min;
        }
      }
    }
    
    // Preserve bar thickness and styling in datasets
    if (chartInstance.data && chartInstance.data.datasets) {
      chartInstance.data.datasets.forEach((dataset: any) => {
        dataset.barThickness = calculatedThickness;
        dataset.maxBarThickness = calculatedThickness;
        dataset.borderRadius = 12;
        dataset.borderSkipped = false;
        dataset.borderWidth = 0;
      });
    }
    
    // Also update component's chart data
    if (this.chartData && this.chartData.datasets) {
      this.chartData.datasets.forEach((dataset: any) => {
        dataset.barThickness = calculatedThickness;
        dataset.maxBarThickness = calculatedThickness;
        dataset.borderRadius = 12;
        dataset.borderSkipped = false;
        dataset.borderWidth = 0;
      });
    }
    
    // Set smooth animation for the transition
    if (chartInstance.options) {
      chartInstance.options.animation = {
        duration: 500,
        easing: 'easeInOutQuart'
      };
    }
    
    // Update the chart with smooth animation
    chartInstance.update('active');
    
    // Update statistics immediately
    this.updateChartStatistics();
  }

  private generateDataForTimeFrame(timeFrame: string): void {
    const timeFrameConfig = {
      '7d': { points: 7, label: 'Daily Revenue' },
      '1w': { points: 7, label: 'Daily Revenue' },
      '1m': { points: 30, label: 'Daily Revenue' },
      '3m': { points: 12, label: 'Weekly Revenue' },
      '6m': { points: 26, label: 'Bi-weekly Revenue' },
      '1y': { points: 12, label: 'Monthly Revenue' },
      'all': { points: 24, label: 'Monthly Revenue' }
    };

    const config = timeFrameConfig[timeFrame as keyof typeof timeFrameConfig] || timeFrameConfig['1m'];
    
    // Generate labels based on time frame
    const labels = this.generateTimeLabels(timeFrame, config.points);
    
    // Generate realistic data with growth trend
    const baseValue = 5000;
    const growthRate = 0.15; // 15% growth trend
    const data = Array.from({ length: config.points }, (_, i) => {
      const progress = i / (config.points - 1);
      const trendValue = baseValue * (1 + (growthRate * progress));
      const seasonality = Math.sin((i / config.points) * 2 * Math.PI) * baseValue * 0.1;
      const noise = (Math.random() - 0.5) * baseValue * 0.2;
      return Math.max(1, Math.round(trendValue + seasonality + noise));
    });

    this.chartData = {
      labels: labels,
      datasets: [
        {
          data: data,
          label: config.label,
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return this.colors.primary;
            const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, this.hexToRgba(this.colors.primary, 0.6));
            gradient.addColorStop(0.5, this.hexToRgba(this.colors.primary, 0.8));
            gradient.addColorStop(1, this.hexToRgba(this.colors.primary, 0.95));
            return gradient;
          },
          hoverBackgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return this.colors.primary;
            const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, this.hexToRgba(this.colors.primary, 0.8));
            gradient.addColorStop(1, this.hexToRgba(this.colors.primary, 1));
            return gradient;
          },
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 12,
          borderSkipped: false
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

  private updateChartStatistics(): void {
    if (!this.chartData.datasets || this.chartData.datasets.length === 0) {
      return;
    }

    const data = this.chartData.datasets[0].data as number[];
    const labels = this.chartData.labels as string[];
    
    const total = data.reduce((a, b) => a + b, 0);
    const average = total / data.length;
    const max = Math.max(...data);
    const maxIndex = data.indexOf(max);
    const maxLabel = labels[maxIndex];
    
    // Calculate growth rate (first vs last)
    const firstValue = data[0];
    const lastValue = data[data.length - 1];
    const growth = ((lastValue - firstValue) / firstValue) * 100;

    this.chartStatistics = {
      total: total,
      average: average,
      max: max,
      maxLabel: maxLabel,
      growth: growth
    };

    const topCategoryData = this.chartData.datasets[0].data as number[];
    const topCategoryLabels = this.chartData.labels as string[];

    if (topCategoryData && topCategoryData.length > 0) {
      const maxVal = Math.max(...topCategoryData);
      const maxIndex = topCategoryData.indexOf(maxVal);
      const topCategoryName = topCategoryLabels[maxIndex];

      this.chartStatistics.topCategory = topCategoryName;
    } else {
      this.chartStatistics.topCategory = 'N/A';
    }
  }

  getGrowthBadgeColor(growth: number): string {
    if (growth > 0) return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (growth < 0) return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }

  private setupResponsiveHandlers(): void {
    // Setup ResizeObserver for aggressive chart resizing
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.adjustChartForZoom();
        if (this.chart) {
          this.chart.chart?.resize();
          this.chart.update('none');
        }
      });
    });

    // Observe elements
    setTimeout(() => {
      const chartContainer = document.querySelector('.chart-container');
      const widget = document.querySelector('.premium-bar-chart-widget');
      if (chartContainer) this.resizeObserver!.observe(chartContainer);
      if (widget) this.resizeObserver!.observe(widget);
    }, 100);

    // Setup viewport change handler
    this.viewportObserver = () => {
      setTimeout(() => {
        this.adjustChartForZoom();
        if (this.chart) {
          this.chart.chart?.resize();
          this.chart.update('resize');
        }
      }, 100);
    };

    // Listen for viewport changes
    window.addEventListener('resize', this.viewportObserver);
    window.addEventListener('orientationchange', this.viewportObserver);
    
    if ('visualViewport' in window) {
      window.visualViewport!.addEventListener('resize', this.viewportObserver);
    }

    // Initial adjustment
    setTimeout(() => this.adjustChartForZoom(), 200);
  }

  private adjustChartForZoom(): void {
    const widget = document.querySelector('.premium-bar-chart-widget') as HTMLElement;
    const chartContainer = document.querySelector('.chart-container') as HTMLElement;
    const canvas = document.querySelector('.premium-bar-canvas') as HTMLElement;
    
    if (!widget || !chartContainer || !canvas) return;

    // Get browser zoom level
    const browserZoom = Math.round((window.outerWidth / window.innerWidth) * 100) / 100;
    const viewportHeight = window.innerHeight;
    const widgetRect = widget.getBoundingClientRect();
    const availableHeight = widgetRect.height || viewportHeight * 0.8;
    
    // Smart sizing for zoom levels
    let sizeFactor = 1;
    
    if (browserZoom < 0.75) {
      sizeFactor = 1.4; // Bigger when zoomed out
    } else if (browserZoom < 1) {
      sizeFactor = 1.15;
    } else if (browserZoom > 2) {
      sizeFactor = 0.4;
    } else if (browserZoom > 1.75) {
      sizeFactor = 0.5;
    } else if (browserZoom > 1.5) {
      sizeFactor = 0.6;
    } else if (browserZoom > 1.25) {
      sizeFactor = 0.7;
    } else if (browserZoom > 1.1) {
      sizeFactor = 0.8;
    }

    const reservedHeight = 140; // More space for controls
    const maxChartHeight = Math.max(120, (availableHeight - reservedHeight) * sizeFactor);
    
    // Apply sizing with better space utilization
    chartContainer.style.height = `${maxChartHeight}px`;
    chartContainer.style.minHeight = `${maxChartHeight}px`;
    chartContainer.style.maxHeight = `${maxChartHeight}px`;
    
    canvas.style.height = `${maxChartHeight - 10}px`;
    canvas.style.minHeight = `${maxChartHeight - 10}px`;
    canvas.style.maxHeight = `${maxChartHeight - 10}px`;
  }

  private applyIncrementalBarUpdate(payload: any): void {
    try {
      if (!this.chart) {
        // Fallback: initialize normally
        const labels = Object.keys(payload);
        const values = Object.values(payload).map(v => this.coerceToNumber(v));
        this.chartData = {
          labels,
          datasets: [{ data: values, label: this.title || 'Data' } as any]
        };
        this.applyBarChartLogic();
        this.updateChartStatistics();
        return;
      }

      const chartInstance = this.chart.chart;
      if (!chartInstance) return;

      // Ensure base structures exist
      if (!chartInstance.data || !chartInstance.data.datasets || chartInstance.data.datasets.length === 0) {
        chartInstance.data = chartInstance.data || {} as any;
        chartInstance.data.labels = Object.keys(payload);
        chartInstance.data.datasets = [
          { data: Object.values(payload).map(v => this.coerceToNumber(v)), label: this.title || 'Data' } as any
        ];
        // Keep component state in sync for statistics
        this.chartData.labels = [...(chartInstance.data.labels as any[])];
        this.chartData.datasets = [ { ...(chartInstance.data.datasets[0] as any) } ];
        this.applyBarChartLogic();
        this.updateChartStatistics();
        chartInstance.update('none');
        return;
      }

      const labelsArr: string[] = (chartInstance.data.labels as any[]).map(l => String(l));
      const dataset = chartInstance.data.datasets[0];
      const dataArr: number[] = (dataset.data as any[]).map(v => this.coerceToNumber(v));
      const indexByLabel = new Map<string, number>();
      labelsArr.forEach((l, i) => indexByLabel.set(String(l), i));

      // Apply updates per label without replacing arrays
      Object.entries(payload).forEach(([k, v]) => {
        const label = String(k);
        const value = this.coerceToNumber(v);
        const idx = indexByLabel.get(label);
        if (idx !== undefined) {
          dataArr[idx] = value;
        } else {
          labelsArr.push(label);
          dataArr.push(value);
          indexByLabel.set(label, dataArr.length - 1);
        }
      });

      // Mutate chart instance values in place
      (chartInstance.data.labels as any[]).length = 0;
      labelsArr.forEach(l => (chartInstance.data.labels as any[]).push(l));
      (dataset.data as any[]).length = 0;
      dataArr.forEach(v => (dataset.data as any[]).push(v));

      // Keep component state arrays in sync for statistics and dialogs
      if (Array.isArray(this.chartData.labels)) {
        (this.chartData.labels as any[]).length = 0;
        labelsArr.forEach(l => (this.chartData.labels as any[]).push(l));
      } else {
        this.chartData.labels = [...labelsArr];
      }
      if (this.chartData.datasets && this.chartData.datasets[0]) {
        const ds0 = this.chartData.datasets[0];
        (ds0.data as any[]).length = 0;
        dataArr.forEach(v => (ds0.data as any[]).push(v));
      } else {
        this.chartData.datasets = [{ data: [...dataArr], label: this.title || 'Data' } as any];
      }

      // Re-apply thickness/colors without forcing full redraw
      this.applyBarChartLogic();
      this.updateChartStatistics();
      chartInstance.update('none'); // no sweeping animation
    } catch {}
  }

  private coerceToNumber(value: any): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const n = Number(value.replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    if (value && typeof value === 'object') {
      const maybe = (value as any).value ?? (value as any)._value ?? undefined;
      const n = Number(maybe);
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
} 