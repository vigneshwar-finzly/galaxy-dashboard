import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ThemeService } from '../../services/theme.service';

@Component({
  standalone: true,
  imports: [NgChartsModule],
  selector: 'app-radar-chart',
  templateUrl: './radar-chart.component.html',
  styleUrls: ['./radar-chart.component.scss']
})
export class RadarChartComponent implements OnInit, OnDestroy {
  @Input() data!: any;
  @Input() title: string = 'Radar Chart';
  @Input() height: string = '300px';
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  private themeSub?: any;

  // Theme-driven palette
  private readonly colors = {
    get primary() { return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#3498db'; },
    get primaryLight() { return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-light').trim() || '#5dade2'; },
    get primaryDark() { return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-dark').trim() || '#2e86c1'; },
    success: '#27ae60',
    gray: '#7f8c8d'
  } as const;

  public chartData: ChartConfiguration<'radar'>['data'] = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'radar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: this.colors.gray,
          font: {
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
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        grid: { color: '#e0e0e0' },
        ticks: {
          color: this.colors.gray,
          font: {
            family: 'Inter',
            size: 11
          },
          stepSize: 20
        },
        pointLabels: {
          color: this.colors.gray,
          font: {
            family: 'Inter',
            size: 11,
            weight: 500
          }
        }
      }
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
        borderWidth: 2
      },
      line: {
        borderWidth: 2
      }
    }
  };

  constructor(private themeService: ThemeService) { }

  ngOnInit(): void {
    // Wait for theme to be applied before initializing chart
    setTimeout(() => {
      this.initializeChartData();
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
        datasets: this.data.datasets.map((dataset: any, index: number) => {
          const baseColor = dataset.borderColor || this.getColorByIndex(index);
          // If dataset already has explicit colors, keep them; else theme-map it
          const borderColor = dataset.borderColor || baseColor;
          const bgColor = dataset.backgroundColor || ((ctx: any) => {
            const chart = ctx.chart;
            const { chartArea } = chart;
            if (!chartArea) return this.hexToRgba(baseColor, 0.2);
            const cx = (chartArea.left + chartArea.right) / 2;
            const cy = (chartArea.top + chartArea.bottom) / 2;
            const r = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
            const g = chart.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0, this.hexToRgba(baseColor, 0.22));
            g.addColorStop(1, this.hexToRgba(baseColor, 0.05));
            return g;
          });
          return {
            ...dataset,
            borderColor,
            backgroundColor: bgColor,
            pointBackgroundColor: dataset.pointBackgroundColor || baseColor,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: baseColor
          };
        })
      };
    } else {
      // Default data
      this.chartData = {
        labels: ['Speed', 'Reliability', 'Security', 'Cost', 'User Experience', 'Integration'],
        datasets: [
          {
            data: [85, 90, 95, 70, 88, 82],
            label: 'Current Performance',
            borderColor: this.colors.primary,
            backgroundColor: (ctx: any) => {
              const chart = ctx.chart;
              const { chartArea } = chart;
              if (!chartArea) return this.hexToRgba(this.colors.primary, 0.2);
              const cx = (chartArea.left + chartArea.right) / 2;
              const cy = (chartArea.top + chartArea.bottom) / 2;
              const r = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
              const g = chart.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
              g.addColorStop(0, this.hexToRgba(this.colors.primary, 0.22));
              g.addColorStop(1, this.hexToRgba(this.colors.primary, 0.05));
              return g;
            },
            pointBackgroundColor: this.colors.primary,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: this.colors.primary
          },
          {
            data: [95, 95, 98, 85, 92, 90],
            label: 'Target Performance',
            borderColor: this.colors.success,
            backgroundColor: (ctx: any) => {
              const chart = ctx.chart;
              const { chartArea } = chart;
              if (!chartArea) return this.hexToRgba(this.colors.success, 0.2);
              const cx = (chartArea.left + chartArea.right) / 2;
              const cy = (chartArea.top + chartArea.bottom) / 2;
              const r = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
              const g = chart.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
              g.addColorStop(0, this.hexToRgba(this.colors.success, 0.22));
              g.addColorStop(1, this.hexToRgba(this.colors.success, 0.05));
              return g;
            },
            pointBackgroundColor: this.colors.success,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: this.colors.success
          }
        ]
      };
    }
  }

  private getColorByIndex(index: number, opacity: number = 1): string {
    const colorArray = [
      this.colors.primary,
      // this.colors.secondary,
      // this.colors.accent,
      // this.colors.danger,
      // this.colors.info,
      this.colors.success,
      // this.colors.warning,
      // this.colors.purple,
      // this.colors.pink
    ];
    const color = colorArray[index % colorArray.length];
    
    if (opacity !== 1) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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
        const chart = ctx.chart;
        const { chartArea } = chart;
        if (!chartArea) return this.hexToRgba(baseColor, 0.2);
        const cx = (chartArea.left + chartArea.right) / 2;
        const cy = (chartArea.top + chartArea.bottom) / 2;
        const r = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
        const g = chart.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, this.hexToRgba(baseColor, 0.22));
        g.addColorStop(1, this.hexToRgba(baseColor, 0.05));
        return g;
      };
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