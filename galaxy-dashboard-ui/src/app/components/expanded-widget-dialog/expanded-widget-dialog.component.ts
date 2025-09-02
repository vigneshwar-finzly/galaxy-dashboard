import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BaseChartDirective } from 'ng2-charts';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';
import { LineChartComponent } from '../line-chart/line-chart.component';
import { RadarChartComponent } from '../radar-chart/radar-chart.component';
import { BarChartComponent } from '../bar-chart/bar-chart.component';
import { DoughnutChartComponent } from '../doughnut-chart/doughnut-chart.component';
import { PieChartComponent } from '../pie-chart/pie-chart.component';
import { AreaChartComponent } from '../area-chart/area-chart.component';
import { HorizontalBarChartComponent } from '../horizontal-bar-chart/horizontal-bar-chart.component';
import { DataTableComponent } from '../data-table/data-table.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ExpandedWidgetData {
  widgetId?: number;
  data?: any;
  title: string;
  chartType?: string;
  description?: string;
}

@Component({
  standalone: true,
  imports: [KpiCardComponent, LineChartComponent,RadarChartComponent, BarChartComponent,DoughnutChartComponent,PieChartComponent,
    AreaChartComponent, HorizontalBarChartComponent, DataTableComponent, CommonModule, FormsModule
  ],
  selector: 'app-expanded-widget-dialog',
  templateUrl: './expanded-widget-dialog.component.html',
  styleUrls: ['./expanded-widget-dialog.component.scss']
})
export class ExpandedWidgetDialogComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  
  constructor(
    public dialogRef: MatDialogRef<ExpandedWidgetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExpandedWidgetData
  ) {}

  ngOnInit(): void {
    console.log('Expanded widget data:', this.data);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onRefresh(): void {
    // Implement refresh logic here
    console.log('Refreshing expanded widget data');
  }

  getChartComponent(): string {
    if (!this.data?.data?.component) return 'kpi-card';
    return this.data.data.component;
  }

  getChartLegendData(): any[] {
    const chartData = this.data?.data;
    if (!chartData) return [];

    // Extract legend data based on chart type
    if (this.isPieOrDonutChart()) {
      const datasets = chartData.datasets || [];
      const labels = chartData.labels || [];
      
      if (datasets.length > 0 && datasets[0].data) {
        return labels.map((label: string, index: number) => ({
          label,
          value: datasets[0].data[index],
          color: datasets[0].backgroundColor[index] || '#666',
          percentage: this.calculatePercentage(datasets[0].data[index], datasets[0].data)
        }));
      }
    }
    
    return [];
  }

  isPieOrDonutChart(): boolean {
    const component = this.getChartComponent();
    return component === 'pie-chart' || component === 'doughnut-chart';
  }

  isLineOrBarChart(): boolean {
    const component = this.getChartComponent();
    return component === 'line-chart' || component === 'bar-chart' || 
           component === 'area-chart' || component === 'horizontal-bar-chart';
  }

  isTableChart(): boolean {
    return this.getChartComponent() === 'data-table';
  }

  isKpiCard(): boolean {
    return this.getChartComponent() === 'kpi-card';
  }

  private calculatePercentage(value: number, allValues: number[]): number {
    const total = allValues.reduce((sum, val) => sum + val, 0);
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  formatValue(value: any): string {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value?.toString() || '';
  }

  getWidgetMetrics(): any {
    const chartData = this.data?.data;
    if (!chartData) return {};

    const metrics: any = {
      dataPoints: 0,
      chartType: this.getChartComponent(),
      lastUpdated: new Date().toLocaleString()
    };

    if (this.isPieOrDonutChart() && chartData.datasets?.[0]?.data) {
      metrics.dataPoints = chartData.datasets[0].data.length;
      metrics.totalValue = chartData.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);
    } else if (this.isLineOrBarChart() && chartData.datasets) {
      metrics.dataPoints = chartData.labels?.length || 0;
      metrics.datasets = chartData.datasets.length;
    }

    return metrics;
  }
}
