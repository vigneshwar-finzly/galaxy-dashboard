import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { Subscription } from 'rxjs';

import { DashboardService } from '../../services/dashboard.service';
import { WidgetDataRequest, WidgetDataResponse } from '../../models/dashboard.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChartData {
  type: 'line' | 'bar' | 'doughnut' | 'area' | 'pie';
  title: string;
  chartType?: string;
  period?: '7d' | '30d';
  widgetId?: number;
  dataSource?: string;
}

@Component({
  standalone: true,
  imports: [NgChartsModule,CommonModule,FormsModule],
  selector: 'app-chart-widget',
  templateUrl: './chart-widget.component.html',
  styleUrls: ['./chart-widget.component.scss']
})
export class ChartWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() data!: any;
  
  private dataSubscription?: Subscription;

  public isLoading = false;
  public hasError = false;
  public errorMessage = '';
  public realTimeData: any = null;

  // Custom color palette
  private readonly colors = {
    primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#3498db',
    secondary: '#82C91E', // Green accent
    red: '#FF6B6B',
    cyan: '#4ECDC4',
    blue: '#45B7D1',
    amber: '#FFA726',
    gray: '#6B7280'
  };

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [1250000, 1450000, 1320000, 1580000, 1420000, 1680000, 1750000],
        label: 'Payment Volume',
        fill: true,
        tension: 0.4,
        borderColor: this.colors.primary,
        backgroundColor: 'rgba(76, 110, 245, 0.1)',
        pointBackgroundColor: this.colors.primary,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: this.colors.primary,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['ACH', 'FEDNOW', 'FEDWIRE', 'RTP', 'SWIFT'],
    datasets: [
      {
        data: [850, 320, 280, 240, 157],
        label: 'Processed Payments',
        backgroundColor: [
          this.colors.primary,
          this.colors.secondary,
          this.colors.red,
          this.colors.cyan,
          this.colors.blue
        ],
        borderColor: [
          this.colors.primary,
          this.colors.secondary,
          this.colors.red,
          this.colors.cyan,
          this.colors.blue
        ],
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['ACH', 'FEDNOW', 'FEDWIRE', 'RTP', 'SWIFT'],
    datasets: [
      {
        data: [45, 18, 15, 12, 10],
        backgroundColor: [
          this.colors.primary,
          this.colors.secondary,
          this.colors.red,
          this.colors.cyan,
          this.colors.blue
        ],
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff'
      }
    ]
  };

  public areaChartData: ChartConfiguration<'line'>['data'] = {
    labels: Array.from({length: 30}, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        data: Array.from({length: 30}, () => Math.random() * 20 + 80), // 80-100% success rate
        label: 'Area Coverage',
        fill: true,
        tension: 0.3,
        borderColor: '#fd79a8',
        backgroundColor: 'rgba(253, 121, 168, 0.25)',
        pointBackgroundColor: '#fd79a8',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#fd79a8',
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 3,
        borderDash: [8, 4], // Dashed line to distinguish from solid line charts
        pointBorderWidth: 2
      }
    ]
  };

  public pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: ['Success', 'Failed', 'Pending'],
    datasets: [
      {
        data: [85, 10, 5],
        backgroundColor: [
          this.colors.secondary,
          this.colors.red,
          this.colors.amber
        ],
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff'
      }
    ]
  };

  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: this.colors.primary,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: this.colors.gray,
          font: {
            size: 12
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(107, 114, 128, 0.1)'
        },
        ticks: {
          color: this.colors.gray,
          font: {
            size: 12
          },
          callback: function(value) {
            return '$' + (Number(value) / 1000000).toFixed(1) + 'M';
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: this.colors.primary,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: this.colors.gray,
          font: {
            size: 12
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(107, 114, 128, 0.1)'
        },
        ticks: {
          color: this.colors.gray,
          font: {
            size: 12
          }
        }
      }
    }
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: this.colors.primary,
        borderWidth: 1,
        cornerRadius: 8
      }
    },
    cutout: '60%'
  };

  public areaChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fd79a8',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return 'Area Coverage: ' + context.parsed.y.toFixed(1) + '%';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(253, 121, 168, 0.1)',
          lineWidth: 1
        },
        ticks: {
          color: '#fd79a8',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            size: 11,
            weight: 500
          },
          maxTicksLimit: 10
        }
      },
      y: {
        grid: {
          display: true,
          color: 'rgba(253, 121, 168, 0.08)',
          lineWidth: 1
        },
        ticks: {
          color: '#fd79a8',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            size: 11,
            weight: 500
          },
          callback: function(value) {
            return value + '%';
          }
        },
        min: 70,
        max: 100
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    elements: {
      point: {
        hoverRadius: 7,
        hitRadius: 12
      }
    }
  };

  public pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: this.colors.primary,
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return context.label + ': ' + context.parsed + '%';
          }
        }
      }
    }
  };

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    // Initialize chart data based on chart type
    this.initializeChartData();

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.loadWidgetData();
    }
  }

  private normalizeId(id: any): string | undefined {
    if (id === null || id === undefined) return undefined;
    const str = String(id);
    const m = /^widget-(\d+)$/.exec(str);
    return m ? m[1] : str;
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

  }

  private loadWidgetData(): void {
    // If widget has an ID, fetch real data
    if (this.data.widgetId) {
      this.isLoading = true;
      this.hasError = false;

      this.dataSubscription = this.dashboardService.getWidgetDataById(this.data.widgetId).subscribe({
        next: (response: WidgetDataResponse) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.realTimeData = response.data;
            this.updateChartData(response.data, this.data.type);
          } else {
            this.hasError = true;
            this.errorMessage = response.errorMessage || 'Failed to load widget data';
            console.warn('Widget data error:', response.errorMessage);
            // Fall back to static data
            this.initializeChartData();
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.hasError = true;
          this.errorMessage = 'Failed to load widget data';
          console.error('Error loading widget data:', error);
          // Fall back to static data
          this.initializeChartData();
        }
      });
    } else {
      // No widget ID, use static data
      this.initializeChartData();
    }
  }

  private updateChartData(data: any, chartType: string): void {
    try {
      switch (chartType) {
        case 'bar':
        case 'bar-chart':
          this.updateBarChart(data);
          break;
        case 'doughnut':
        case 'donut':
          this.updateDoughnutChart(data);
          break;
        case 'line':
        case 'line-chart':
          this.updateLineChart(data);
          break;
        case 'area':
        case 'area-chart':
          this.updateAreaChart(data);
          break;
        case 'pie':
        case 'pie-chart':
          this.updatePieChart(data);
          break;
        default:
          console.warn('Unsupported chart type:', chartType);
          this.initializeChartData();
      }
    } catch (error) {
      console.error('Error updating chart data:', error);
      this.initializeChartData();
    }
  }

  private updateBarChart(data: any): void {
    if (typeof data === 'object' && data !== null) {
      const labels = Object.keys(data);
      const values = Object.values(data);
      
      this.barChartData = {
        labels: labels,
        datasets: [
          {
            data: values as number[],
            label: this.data.title || 'Data',
            backgroundColor: this.generateColors(labels.length),
            borderColor: this.generateColors(labels.length),
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false
          }
        ]
      };
    }
  }

  private updateDoughnutChart(data: any): void {
    if (typeof data === 'object' && data !== null) {
      const labels = Object.keys(data);
      const values = Object.values(data);
      
      this.doughnutChartData = {
        labels: labels,
        datasets: [
          {
            data: values as number[],
            backgroundColor: this.generateColors(labels.length),
            borderWidth: 0,
            hoverBorderWidth: 2,
            hoverBorderColor: '#fff'
          }
        ]
      };
    }
  }

  private updateLineChart(data: any): void {
    if (typeof data === 'object' && data !== null) {
      const labels = Object.keys(data);
      const values = Object.values(data);
      
      this.lineChartData = {
        labels: labels,
        datasets: [
          {
            data: values as number[],
            label: this.data.title || 'Data',
            fill: true,
            tension: 0.4,
            borderColor: this.colors.primary,
            backgroundColor: 'rgba(76, 110, 245, 0.1)',
            pointBackgroundColor: this.colors.primary,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: this.colors.primary,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      };
    }
  }

  private updateAreaChart(data: any): void {
    if (typeof data === 'object' && data !== null) {
      const labels = Object.keys(data);
      const values = Object.values(data);
      
      this.areaChartData = {
        labels: labels,
        datasets: [
          {
            data: values as number[],
            label: this.data.title || 'Data',
            fill: true,
            tension: 0.3,
            borderColor: '#fd79a8',
            backgroundColor: 'rgba(253, 121, 168, 0.25)',
            pointBackgroundColor: '#fd79a8',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#fd79a8',
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 3,
            borderDash: [8, 4], // Dashed line to distinguish from solid line charts
            pointBorderWidth: 2
          }
        ]
      };
    }
  }

  private updatePieChart(data: any): void {
    if (typeof data === 'object' && data !== null) {
      const labels = Object.keys(data);
      const values = Object.values(data);
      
      this.pieChartData = {
        labels: labels,
        datasets: [
          {
            data: values as number[],
            backgroundColor: this.generateColors(labels.length),
            borderWidth: 0,
            hoverBorderWidth: 2,
            hoverBorderColor: '#fff'
          }
        ]
      };
    }
  }

  private generateColors(count: number): string[] {
    const baseColors = [
      this.colors.primary,
      this.colors.secondary,
      this.colors.red,
      this.colors.cyan,
      this.colors.blue,
      this.colors.amber,
      this.colors.gray
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }

  private initializeChartData(): void {
    // Keep the existing static data as fallback
    if (this.data.chartType === 'payment-methods') {
      // Payment method distribution data is already set in doughnutChartData
    } else if (this.data.chartType === 'payment-rails') {
      // Payment rails data is already set in barChartData
    } else if (this.data.chartType === 'payment-volume') {
      // Payment volume data is already set in lineChartData
    } else if (this.data.chartType === 'success-rate') {
      // Success rate data is already set in areaChartData
    } else if (this.data.chartType === 'payment-status') {
      // Payment status data is already set in pieChartData
    }
  }
} 