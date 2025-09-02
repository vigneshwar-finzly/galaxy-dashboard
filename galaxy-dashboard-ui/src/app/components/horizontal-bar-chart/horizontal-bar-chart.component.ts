import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ThemeService } from '../../services/theme.service';

@Component({
  standalone: true,
  imports: [NgChartsModule],
  selector: 'app-horizontal-bar-chart',
  templateUrl: './horizontal-bar-chart.component.html',
  styleUrls: ['./horizontal-bar-chart.component.scss']
})
export class HorizontalBarChartComponent implements OnInit, OnDestroy {
  @Input() data!: any;
  @Input() title: string = 'Horizontal Bar Chart';
  @Input() height: string = '300px';
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  private themeSub?: any;

  // Theme-driven palette
  private readonly colors = {
    get primary() { return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#3498db'; },
    get primaryLight() { return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-light').trim() || '#5dade2'; },
    get primaryDark() { return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-dark').trim() || '#2e86c1'; },
    gray: '#7f8c8d'
  } as const;

  public chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: this.colors.gray,
          font: {
            family: 'Inter',
            size: 12,
            weight: 500
          },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#333333',
        bodyColor: '#333333',
        borderColor: this.hexToRgba(this.colors.primary, 0.2),
        borderWidth: 1,
        cornerRadius: 10,
        displayColors: true,
        titleFont: {
          family: 'Poppins',
          size: 14,
          weight: 600
        },
        bodyFont: {
          family: 'Inter',
          size: 12
        },
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + context.parsed.y;
          }
        }
      },
      datalabels: { display: false }
    },
    scales: {
      x: {
        grid: {
          color: '#e0e0e0'
        },
        border: { display: false },
        ticks: {
          color: this.colors.gray,
          font: {
            family: 'Inter',
            size: 11
          },
          padding: 8
        }
      },
      y: {
        grid: {
          display: false
        },
        border: { display: false },
        ticks: {
          color: this.colors.gray,
          font: {
            family: 'Inter',
            size: 11
          }
        }
      }
    },
    elements: {
      bar: {
        borderRadius: 8,
        borderSkipped: false,
        borderWidth: 0
      }
    }
  };

  constructor(private themeService: ThemeService) { }

  ngOnInit(): void {
    // Wait for theme to be applied before initializing chart
    setTimeout(() => {
      this.initializeChartData();
      // this.applyBarChartLogic();
      const ro = new ResizeObserver(() => {
        this.chartData = { ...this.chartData };
        this.chart?.update();
      });
      const el = document.querySelector('canvas');
      if (el) ro.observe(el);
    }, 100);

    this.themeSub = this.themeService.themeChanges$.subscribe(() => {
      // Re-initialize chart data with new theme colors
      setTimeout(() => {
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
  }

  private initializeChartData(): void {
    if (this.data && this.data.labels && this.data.datasets) {
      // Use provided data
      this.chartData = {
        labels: this.data.labels,
        datasets: this.data.datasets.map((dataset: any) => ({
          ...dataset,
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return this.hexToRgba(this.colors.primary, 0.45);
            const gradient = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            gradient.addColorStop(0, this.hexToRgba(this.colors.primary, 0.55));
            gradient.addColorStop(1, this.hexToRgba(this.colors.primary, 0.85));
            return gradient;
          },
          hoverBackgroundColor: this.hexToRgba(this.colors.primary, 1),
          borderColor: this.colors.primaryDark,
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false
        }))
      };
    } else {
      // Default data
      this.chartData = {
        labels: ['Customer Support', 'Sales Team', 'Marketing', 'Engineering', 'Product'],
        datasets: [
          {
            data: [85, 72, 68, 90, 78],
            label: 'Satisfaction Score',
            backgroundColor: this.colors.primary,
            borderColor: this.colors.primary
          }
        ]
      };
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

  private updateChartColors(): void {
    if (!this.chart || !this.chart.data || !this.chart.data.datasets) return;

    this.chart.data.datasets.forEach((dataset: any) => {
      dataset.backgroundColor = (ctx: any) => {
        const chart = ctx.chart;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return this.hexToRgba(this.colors.primary, 0.45);
        const gradient = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
        gradient.addColorStop(0, this.hexToRgba(this.colors.primary, 0.55));
        gradient.addColorStop(1, this.hexToRgba(this.colors.primary, 0.85));
        return gradient;
      };
      dataset.hoverBackgroundColor = this.hexToRgba(this.colors.primary, 1);
      dataset.borderColor = this.colors.primaryDark;
    });

    if (this.chart.options?.plugins?.tooltip) {
      (this.chart.options.plugins.tooltip as any).borderColor = this.hexToRgba(this.colors.primary, 0.2);
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
} 