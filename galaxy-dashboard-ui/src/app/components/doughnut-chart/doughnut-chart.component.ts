import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { Chart, ChartConfiguration, ChartData, Plugin } from 'chart.js';
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
  selector: 'app-doughnut-chart',
  templateUrl: './doughnut-chart.component.html',
  styleUrls: ['./doughnut-chart.component.scss']
})
export class DoughnutChartComponent implements OnInit, OnDestroy {
  @Input() data!: any;
  @Input() title: string = 'Modern Donut Analytics';
  @Input() height: string = '400px';
  @Input() showLegend: boolean = true;
  @Input() cutout: string = '85%'; // Thinner donut
  @Input() spacing: number = 2;
  @Output() widgetRemoved = new EventEmitter<{dashboardWidgetId?: number}>();
  
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  private themeObserver?: MutationObserver;
  private resizeObserver?: ResizeObserver;
  private viewportObserver?: any;

  public chartInstance!: Chart<'doughnut'>;
  public activeIndex: number = -1;
  private centerTextPlugin: Plugin<'doughnut'>;
  private themeSub?: any;
  isRefreshing = false;
  selectedTimeFrame = '1m';
  chartSummary: any = null;

  // Responsive legend based on container size
  public shouldShowLegend: boolean = true;

  public chartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    cutout: '75%', // Large cutout for center visibility
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    layout: { 
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      }
    },
    // animation: {
    //   animateRotate: true,
    //   animateScale: true,
    //   duration: 800,
    //   easing: 'easeOutQuart'
    // },
    elements: {
      arc: {
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff',
        borderRadius: 8,
        hoverOffset: 12,
        spacing: 4
      }
    },
    plugins: {
      legend: {
        display: false // Custom legend in template
      },
      tooltip: {
        enabled: false,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: 'rgba(147, 51, 234, 0.2)',
        borderWidth: 1,
        cornerRadius: 16,
        padding: 16,
        boxPadding: 8,
        caretSize: 8,
        caretPadding: 12,
        displayColors: true,
        titleFont: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          size: 14,
          weight: 600
        },
        bodyFont: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          size: 13,
          weight: 400
        },
        filter: function(tooltipItem) {
          return tooltipItem.parsed !== 0;
        },
        callbacks: {
          title: function(context) {
            return context[0].label || '';
          },
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${percentage}% (${value.toLocaleString()})`;
          },
          footer: function(tooltipItems) {
            const total = tooltipItems[0].dataset.data.reduce((a: number, b: number) => a + b, 0);
            return `Total: ${total.toLocaleString()}`;
          },
          labelColor: function(context) {
            const bgColors = context.dataset.backgroundColor as string[];
            return {
              borderColor: 'transparent',
              backgroundColor: bgColors?.[context.dataIndex] || '#6366f1',
              borderWidth: 0,
              borderRadius: 4
            };
          }
        }
      }
    }
  };

  // Ultra-modern gradient color palette with premium feel
  private readonly modernColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple-Blue gradient
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink-Red gradient  
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Blue-Cyan gradient
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green-Teal gradient
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Pink-Yellow gradient
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Mint-Pink gradient
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Coral-Pink gradient
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Peach gradient
  ];

  // Solid modern colors for Chart.js compatibility
  private readonly solidColors = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#F97316', // Orange
  '#14B8A6'  // Teal
];

private readonly hoverColors = [
  '#4F46E5', // Deeper Indigo
  '#DB2777', // Deeper Pink
  '#0891B2', // Deeper Cyan
  '#059669', // Deeper Emerald
  '#D97706', // Deeper Amber
  '#7C3AED', // Deeper Violet
  '#EA580C', // Deeper Orange
  '#0D9488'  // Deeper Teal
];


  constructor(
    private el: ElementRef,
    private themeService: ThemeService,
    private dialog: MatDialog
  ) {
    // In the constructor, update the centerTextPlugin
this.centerTextPlugin = {
  id: 'centerText',
  afterDraw: (chart: Chart<'doughnut'>) => {
    const { ctx } = chart;
    const active = chart.getActiveElements() || [];
    const dataset = chart.data.datasets[0];
    
    if (!dataset || !dataset.data || dataset.data.length === 0) {
      return; // No data to display
    }
    
    const total = dataset.data.reduce((a: number, b: number) => a + b, 0);

    let displayText = {
      count: total.toLocaleString(),
      label: this.chartSummary?.totalLabel || 'Total',
      percentage: '100%'
    };

    // Show specific segment data when hovering (activeIndex is set by hover handlers)
    if (this.activeIndex >= 0 && this.activeIndex < dataset.data.length) {
      const value = dataset.data[this.activeIndex] as number;
      const percentage = ((value / total) * 100).toFixed(1);
      const segmentLabel = chart.data.labels?.[this.activeIndex]?.toString() || `Segment ${this.activeIndex + 1}`;
      displayText = {
        count: value.toLocaleString(),
        label: segmentLabel,
        percentage: percentage + '%'
      };
    }

    ctx.save();

    // Modern thin donut center styling
    const { width, height } = chart;
    const chartArea = chart.chartArea;
    const trueCenterX = chartArea.left + (chartArea.right - chartArea.left) / 2;
    const trueCenterY = chartArea.top + (chartArea.bottom - chartArea.top) / 2;

    // Draw elegant center background with modern styling
    const centerRadius = Math.min(
      (chartArea.right - chartArea.left) * 0.35,
      (chartArea.bottom - chartArea.top) * 0.35
    );
    
    // Main background circle
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.fill();
    
    // Add subtle gradient overlay
    const shadowGradient = ctx.createRadialGradient(
      trueCenterX, trueCenterY, 0, 
      trueCenterX, trueCenterY, centerRadius
    );
    shadowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    shadowGradient.addColorStop(0.7, 'rgba(248, 250, 252, 0.95)');
    shadowGradient.addColorStop(1, 'rgba(241, 245, 249, 0.92)');
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = shadowGradient;
    ctx.fill();
    
    // Bold border for visibility
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, centerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner accent ring
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, centerRadius - 10, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Primary count - very large and bold for maximum visibility
    ctx.font = '700 44px Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    
    // High contrast text
    ctx.fillStyle = '#111827'; // Very dark for maximum contrast
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText.count, trueCenterX, trueCenterY - 12);

    // Percentage text with bright pink accent
    ctx.font = '600 22px Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.fillStyle = '#ec4899'; // Bright pink
    ctx.fillText(displayText.percentage, trueCenterX, trueCenterY + 18);

    // Label text - clear and readable
    const labelFont = this.activeIndex !== -1 ? '600 16px' : '500 14px';
    ctx.font = `${labelFont} Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
    ctx.fillStyle = this.activeIndex !== -1 ? '#374151' : '#6b7280';
    
    // Ensure text fits within the circle
    let labelText = displayText.label;
    if (labelText.length > 12) {
      labelText = labelText.substring(0, 12) + '...';
    }
    ctx.fillText(labelText, trueCenterX, trueCenterY + 42);

    ctx.restore();
  }
};
  }

  // Generate modern color palette for chart data
  private getModernColors(count: number): string[] {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(this.solidColors[i % this.solidColors.length]);
    }
    return colors;
  }

  // Generate hover colors with modern palette
  private getModernHoverColors(count: number): string[] {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(this.hoverColors[i % this.hoverColors.length]);
    }
    return colors;
  }

  // Create gradient background for enhanced visual appeal
  private createGradientBackground(ctx: CanvasRenderingContext2D, color: string): CanvasGradient {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 150);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, this.adjustColorBrightness(color, -20));
    return gradient;
  }

  // Utility to adjust color brightness
  private adjustColorBrightness(color: string, amount: number): string {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }

  ngOnInit(): void {
    // Initialize chart immediately with current theme
    
    this.generateDataForTimeFrame(this.selectedTimeFrame);
    this.renderChart();
    this.updateChartSummary();
    this.setupResponsiveHandlers();
    
    // Initialize responsive legend
    setTimeout(() => this.updateResponsiveLegend(), 100);
    
    // Wait for theme to be applied before rendering chart
    setTimeout(() => {
      this.renderChart();
      this.updateChartSummary();
      const ro = new ResizeObserver(() => {
        // For doughnut, re-render to adapt to theme changes
        this.renderChart();
      });
      const host = this.el.nativeElement as HTMLElement;
      ro.observe(host);

      // Observe theme class/attribute changes on documentElement to re-render
      this.themeObserver = new MutationObserver(() => this.renderChart());
      this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    }, 100);

    // Also subscribe to theme service to ensure updates
    this.themeSub = this.themeService.themeChanges$.subscribe(() => {
      // Re-render chart with new theme colors
      setTimeout(() => {
        if (this.chartInstance) {
          this.updateDatasetColorsFromTheme();
          this.chartInstance.update();
        } else {
          this.renderChart();
        }
      }, 50);
    });
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
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

  private renderChart(): void {
    // Use ElementRef to find the canvas within the component's view
    const canvas = this.el.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Doughnut Chart Canvas element not found!');
      return;
    }

    // Set height based on input property
    canvas.style.height = this.height;
    canvas.style.width = '100%';

    // Destroy existing chart instance before creating a new one
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const defaultData: ChartData<'doughnut'> = {
      labels: ['Completed', 'Pending', 'In Progress', 'Failed', 'Cancelled'],
      datasets: [{
        data: [45, 25, 15, 10, 5],
        backgroundColor: this.getModernGradientColors(5),
        borderWidth: 0,
        borderColor: 'transparent',
        hoverBorderWidth: 0,
        hoverBorderColor: 'transparent',
        hoverBackgroundColor: this.getHoverColors(5),
        spacing: this.spacing,
        borderRadius: 3,
        hoverOffset: 8
      }]
    };

    // Use generated chart data if available, otherwise use input data, finally fallback to default
    const finalChartData = this.chartData.labels?.length ? { ...this.chartData } : (this.data ? { ...this.data } : defaultData);
    
    // Apply premium thin donut styling
    const firstDataset = finalChartData.datasets[0] as any;
    firstDataset.backgroundColor = this.getModernGradientColors((firstDataset.data as number[]).length);
    firstDataset.borderWidth = 3;
    firstDataset.borderColor = '#ffffff';
    firstDataset.hoverBorderWidth = 4;
    firstDataset.hoverBorderColor = '#ffffff';
    firstDataset.hoverBackgroundColor = this.getHoverColors((firstDataset.data as number[]).length);
    firstDataset.spacing = 0; // Remove spacing between slices
    firstDataset.borderRadius = 0;
    firstDataset.hoverOffset = 8;

    const chartOptions: ChartConfiguration<'doughnut'>['options'] = {
      cutout: '75%', // Larger cutout for better center visibility
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      layout: { 
        padding: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 800,
        easing: 'easeOutQuart'
      },
      onHover: (event, elements, chart) => {
        const canvas = chart.canvas;
        if (elements && elements.length > 0) {
          canvas.style.cursor = 'pointer';
          this.activeIndex = elements[0].index;
          chart.setActiveElements(elements);
          // Force complete redraw with plugins
          chart.update('none');
          // Ensure center text updates immediately
          setTimeout(() => this.drawCenterTextManually(), 10);
        } else {
          canvas.style.cursor = 'default';
          this.activeIndex = -1;
          chart.setActiveElements([]);
          // Force complete redraw with plugins
          chart.update('none');
          // Ensure center text returns to total
          setTimeout(() => this.drawCenterTextManually(), 10);
        }
      },

      elements: {
        arc: {
          borderWidth: 0,
          borderColor: 'transparent',
          hoverBorderWidth: 0,
          hoverBorderColor: 'transparent',
          borderRadius: 8,
          hoverOffset: 12,
          spacing: 4
        }
      },
      plugins: {
        legend: {
          display: false, // Disable built-in legend, using custom side legend instead
          position: 'bottom',
          align: 'center',
          labels: {
            color: '#374151',
            font: {
              family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              size: 13,
              weight: 500
            },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 18,
            boxWidth: 10,
            boxHeight: 10,
            generateLabels: (chart) => {
              const data = chart.data;
              if (data.labels && data.datasets.length) {
                const dataset = data.datasets[0];
                return data.labels.map((label, i) => {
                  const value = dataset.data[i] as number;
                  const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return {
                    text: `${label} ${percentage}%`,
                    fillStyle: (dataset.backgroundColor as string[])[i],
                    strokeStyle: 'transparent',
                    lineWidth: 0,
                    pointStyle: 'circle',
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          },
          onHover: (event, legendItem, legend) => {
            const chart = legend.chart;
            chart.canvas.style.cursor = 'pointer';
            if (legendItem.index !== undefined) {
              chart.setActiveElements([{
                datasetIndex: 0,
                index: legendItem.index
              }]);
              chart.update('none');
            }
          },
          onLeave: (event, legendItem, legend) => {
            const chart = legend.chart;
            chart.canvas.style.cursor = 'default';
            chart.setActiveElements([]);
            chart.update('none');
          }
        },
        tooltip: {
          enabled: false, // Disabled - using center display instead
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          titleColor: '#1f2937',
          bodyColor: '#374151',
          borderColor: 'rgba(147, 51, 234, 0.2)',
          borderWidth: 1,
          cornerRadius: 16,
          padding: 16,
          boxPadding: 8,
          caretSize: 8,
          caretPadding: 12,
          displayColors: true,
          titleFont: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            size: 14,
            weight: 600
          },
          bodyFont: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            size: 13,
            weight: 400
          },
          filter: function(tooltipItem: any) {
            return tooltipItem.parsed !== 0;
          },
          callbacks: {
            title: function(context: any) {
              return context[0].label || '';
            },
            label: function(context: any) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${percentage}% (${value.toLocaleString()})`;
            },
            footer: function(tooltipItems: any) {
              const total = tooltipItems[0].dataset.data.reduce((a: number, b: number) => a + b, 0);
              return `Total: ${total.toLocaleString()}`;
            },
            labelColor: function(context: any) {
              const bgColors = context.dataset.backgroundColor as string[];
              return {
                borderColor: 'transparent',
                backgroundColor: bgColors?.[context.dataIndex] || '#6366f1',
                borderWidth: 0,
                borderRadius: 4
              };
            }
          }
        }
        }
      };

          const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: finalChartData,
      options: chartOptions,
      plugins: [this.centerTextPlugin]
    };

    this.chartInstance = new Chart<'doughnut'>(canvas, config);
    
    // Initialize the chart summary for center display
    this.updateChartSummary();
    
    // Ensure the chart renders with the plugin
    this.chartInstance.update('active');
    
    // Force center text to appear immediately
    setTimeout(() => {
      this.drawCenterTextManually();
      this.chartInstance?.update('none');
    }, 100);
  }

    private getModernGradientColors(length: number): string[] {
      // Use the new ultra-modern color palette
      return this.getModernColors(length);
    }

    private getHoverColors(length: number): string[] {
      // Use the new modern hover colors
      return this.getModernHoverColors(length);
    }

    private getThemeSegmentColors(length: number): string[] {
      const primaryColor = this.getPrimaryThemeColor();
      
      // Create highly distinguishable color variations
      const colors: string[] = [];
      
      if (length <= 2) {
        // For 2 slices: very distinct contrast
        colors.push(this.darkenColor(primaryColor, 0.4));
        colors.push(this.lightenColor(primaryColor, 0.4));
      } else if (length <= 6) {
        // For 3-6 slices: use dramatic variation pattern
        const patterns = [
          this.lightenColor(primaryColor, 0.3),  
          this.darkenColor(primaryColor, 0.2),  
          this.lightenColor(primaryColor, 0.5),
          this.darkenColor(primaryColor, 0.1),   // Medium light
          this.adjustSaturation(this.darkenColor(primaryColor, 0.1), 1.5), // Saturated dark
          this.adjustSaturation(this.lightenColor(primaryColor, 0.3), 0.6) // Desaturated light
        ];
        
        for (let i = 0; i < length; i++) {
          colors.push(patterns[i]);
        }
      } else {
        // For 7+ slices: dynamic generation with maximum contrast
        for (let i = 0; i < length; i++) {
          const position = i / (length - 1); // 0 to 1
          
          if (i % 4 === 0) {
            // Every 4th: Very dark shades
            colors.push(this.darkenColor(primaryColor, 0.3 + (position * 0.4)));
          } else if (i % 4 === 1) {
            // Every 4th+1: Very light shades
            colors.push(this.lightenColor(primaryColor, 0.3 + (position * 0.4)));
          } else if (i % 4 === 2) {
            // Every 4th+2: Medium dark with saturation boost
            colors.push(this.adjustSaturation(this.darkenColor(primaryColor, 0.1 + (position * 0.2)), 1.3));
          } else {
            // Every 4th+3: Medium light with saturation reduction
            colors.push(this.adjustSaturation(this.lightenColor(primaryColor, 0.1 + (position * 0.3)), 0.7));
          }
        }
      }
      
      return colors;
    }

    private getPrimaryThemeColor(): string {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      // Try to get the primary color from CSS custom properties
      let primaryColor = computedStyle.getPropertyValue('--color-primary').trim();
      
      // If not found, try alternative property names
      if (!primaryColor) {
        primaryColor = computedStyle.getPropertyValue('--color-purple-500').trim();
      }
      
      // If still not found, get from theme service
      if (!primaryColor) {
        const currentPalette = this.themeService.getCurrentPalette();
        primaryColor = currentPalette?.primary || '#3498db';
      }
      
      // Ensure we have a valid color (remove any extra whitespace and validate hex format)
      if (!primaryColor || !primaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
        primaryColor = '#3498db'; // Default blue
      }
      
      return primaryColor;
    }

    private darkenColor(hex: string, factor: number): string {
      const color = hex.replace('#', '');
      // Enhanced darkening with non-linear transformation for better contrast
      const r = Math.max(0, parseInt(color.substr(0, 2), 16) * Math.pow(1 - factor, 1.2));
      const g = Math.max(0, parseInt(color.substr(2, 2), 16) * Math.pow(1 - factor, 1.2));
      const b = Math.max(0, parseInt(color.substr(4, 2), 16) * Math.pow(1 - factor, 1.2));
      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    }

    private lightenColor(hex: string, factor: number): string {
      const color = hex.replace('#', '');
      // Enhanced lightening with non-linear transformation for better contrast
      const r = Math.min(255, parseInt(color.substr(0, 2), 16) + (255 - parseInt(color.substr(0, 2), 16)) * Math.pow(factor, 0.8));
      const g = Math.min(255, parseInt(color.substr(2, 2), 16) + (255 - parseInt(color.substr(2, 2), 16)) * Math.pow(factor, 0.8));
      const b = Math.min(255, parseInt(color.substr(4, 2), 16) + (255 - parseInt(color.substr(4, 2), 16)) * Math.pow(factor, 0.8));
      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    }

    private adjustSaturation(hex: string, factor: number): string {
      // Enhanced saturation adjustment for more dramatic color differences
      const color = hex.replace('#', '');
      let r = parseInt(color.substr(0, 2), 16);
      let g = parseInt(color.substr(2, 2), 16);
      let b = parseInt(color.substr(4, 2), 16);
      
      // Convert to HSL for better saturation control
      r /= 255;
      g /= 255;
      b /= 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      const sum = max + min;
      const l = sum / 2;
      
      if (diff === 0) {
        // For grayscale, add a slight color tint based on factor
        const tint = factor > 1 ? 0.1 : -0.1;
        r = Math.min(1, Math.max(0, r + tint));
        g = Math.min(1, Math.max(0, g + tint * 0.5));
        b = Math.min(1, Math.max(0, b + tint * 0.8));
      } else {
        const s = l > 0.5 ? diff / (2 - sum) : diff / sum;
        let newS = s * factor;
        
        // Clamp saturation more aggressively for better visibility
        if (factor > 1) {
          newS = Math.min(0.95, newS); // Max saturation for high contrast
        } else {
          newS = Math.max(0.2, newS);  // Min saturation to maintain visibility
        }
        
        const c = (1 - Math.abs(2 * l - 1)) * newS;
        let h;
        
        if (max === r) {
          h = ((g - b) / diff) % 6;
        } else if (max === g) {
          h = (b - r) / diff + 2;
        } else {
          h = (r - g) / diff + 4;
        }
        
        h /= 6;
        
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        
        if (h < 1/6) {
          [r, g, b] = [c + m, x + m, m];
        } else if (h < 2/6) {
          [r, g, b] = [x + m, c + m, m];
        } else if (h < 3/6) {
          [r, g, b] = [m, c + m, x + m];
        } else if (h < 4/6) {
          [r, g, b] = [m, x + m, c + m];
        } else if (h < 5/6) {
          [r, g, b] = [x + m, m, c + m];
        } else {
          [r, g, b] = [c + m, m, x + m];
        }
      }
      
      const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    private updateDatasetColorsFromTheme(): void {
      if (!this.chartInstance) return;
      const ds = this.chartInstance.data.datasets[0] as any;
      if (!ds || !Array.isArray(ds.data)) return;
      ds.backgroundColor = this.getModernGradientColors((ds.data as number[]).length);
      ds.hoverBackgroundColor = this.getHoverColors((ds.data as number[]).length);
    }

    // Widget action handlers
    handleRefresh(): void {
      this.isRefreshing = true;
      
      // Simulate data refresh - replace with actual API call
      setTimeout(() => {
        this.updateDatasetColorsFromTheme();
        this.isRefreshing = false;
      }, 2000);
    }

    handleExpand(event: {widgetId?: number, data?: any}): void {
      const dialogRef = this.dialog.open(ExpandedWidgetDialogComponent, {
        width: '95vw',
        maxWidth: '1400px',
        height: '90vh',
        maxHeight: '900px',
        data: {
          widgetId: event.widgetId,
          data: this.getExpandedData(),
          title: this.title,
          chartType: 'doughnut-chart',
          description: this.data?.description || 'Doughnut chart showing data distribution'
        },
        panelClass: ['expanded-widget-dialog-container']
      });
    }

    handleClose(event: {dashboardWidgetId?: number}): void {
      if (confirm('Are you sure you want to remove this widget from the dashboard?')) {
        this.widgetRemoved.emit(event);
      }
    }

      getExpandedData(): any {
    return {
      component: 'doughnut-chart',
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
    console.log("clicked time frame:", timeFrame);
    
    this.selectedTimeFrame = timeFrame;
    this.refreshChartData();
  }

  private refreshChartData(): void {
    this.isRefreshing = true;
    setTimeout(() => {
      this.generateDataForTimeFrame(this.selectedTimeFrame);
      this.renderChart();
      this.updateChartSummary();
      this.isRefreshing = false;
    }, 800);
  }

  private generateDataForTimeFrame(timeFrame: string): void {
    const categories = ['Processed', 'Pending Approval', 'System Rejected', 'Failed', 'Staged'];
    
    // Generate realistic data based on time frame
    const timeFrameMultipliers = {
      '7d': [0.45, 0.35, 0.15, 0.03, 0.02],
      '1w': [0.42, 0.38, 0.15, 0.03, 0.02],
      '1m': [0.48, 0.32, 0.15, 0.03, 0.02],
      '3m': [0.50, 0.30, 0.15, 0.03, 0.02],
      '6m': [0.52, 0.28, 0.15, 0.03, 0.02],
      '1y': [0.55, 0.25, 0.15, 0.03, 0.02],
      'all': [0.58, 0.22, 0.15, 0.03, 0.02]
    };

    const multipliers = timeFrameMultipliers[timeFrame as keyof typeof timeFrameMultipliers] || timeFrameMultipliers['1m'];
    const baseTotal = 10000;
    
    const data = multipliers.map(mult => {
      const value = mult * baseTotal;
      const noise = (Math.random() - 0.5) * value * 0.1;
      return Math.round(value + noise);
    });

    this.chartData = {
      labels: categories,
      datasets: [
        {
          data: data,
          backgroundColor: this.getModernGradientColors(categories.length),
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverBorderWidth: 4,
          hoverBorderColor: '#ffffff',
          hoverBackgroundColor: this.getHoverColors(categories.length),
          spacing: 0, // Remove spacing between slices
          borderRadius: 0,
          hoverOffset: 8
        }
      ]
    };
  }

  private updateChartSummary(): void {
    if (!this.chartData.datasets || this.chartData.datasets.length === 0) {
      return;
    }

    const data = this.chartData.datasets[0].data as number[];
    const labels = this.chartData.labels as string[];
    
    const total = data.reduce((a, b) => a + b, 0);
    const maxValue = Math.max(...data);
    const maxIndex = data.indexOf(maxValue);
    const largestPercentage = (maxValue / total) * 100;

    this.chartSummary = {
      total: total,
      totalLabel: 'Users',
      largest: largestPercentage,
      largestLabel: labels[maxIndex],
      segments: data.length
    };
  }

  // Legend interaction methods with enhanced center display
  highlightSegment(index: number): void {
    this.activeIndex = index;
    if (this.chartInstance) {
      this.chartInstance.setActiveElements([{
        datasetIndex: 0,
        index: index
      }]);
      // Force complete redraw with plugins
      this.chartInstance.update('none');
      // Ensure center text updates immediately
      setTimeout(() => this.drawCenterTextManually(), 10);
    }
  }

  clearHighlight(): void {
    this.activeIndex = -1;
    if (this.chartInstance) {
      this.chartInstance.setActiveElements([]);
      // Force complete redraw with plugins
      this.chartInstance.update('none');
      // Ensure center text returns to total
      setTimeout(() => this.drawCenterTextManually(), 10);
    }
  }

  getSegmentColor(index: number): string {
    const colors = this.getModernGradientColors(this.chartData.labels?.length || 5);
    return colors[index] || '#6366f1';
  }

  // Manual center text drawing as backup
  private drawCenterTextManually(): void {
    if (!this.chartInstance) return;
    
    const chart = this.chartInstance;
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    
    if (!dataset || !dataset.data || dataset.data.length === 0) return;
    
    const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
    const chartArea = chart.chartArea;
    const trueCenterX = chartArea.left + (chartArea.right - chartArea.left) / 2;
    const trueCenterY = chartArea.top + (chartArea.bottom - chartArea.top) / 2;

    let displayText = {
      count: total.toLocaleString(),
      label: this.chartSummary?.totalLabel || 'Total',
      percentage: '100%'
    };

    // Show specific segment data when hovering (activeIndex is set by hover handlers)
    if (this.activeIndex >= 0 && this.activeIndex < dataset.data.length) {
      const value = dataset.data[this.activeIndex] as number;
      const percentage = ((value / total) * 100).toFixed(1);
      const segmentLabel = chart.data.labels?.[this.activeIndex]?.toString() || `Segment ${this.activeIndex + 1}`;
      displayText = {
        count: value.toLocaleString(),
        label: segmentLabel,
        percentage: percentage + '%'
      };
    }

    ctx.save();

    // Draw elegant center background with modern styling
    const centerRadius = Math.min(
      (chartArea.right - chartArea.left) * 0.35,
      (chartArea.bottom - chartArea.top) * 0.35
    );
    
    // Main background circle
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.fill();
    
    // Add subtle gradient overlay
    const shadowGradient = ctx.createRadialGradient(
      trueCenterX, trueCenterY, 0, 
      trueCenterX, trueCenterY, centerRadius
    );
    shadowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    shadowGradient.addColorStop(0.7, 'rgba(248, 250, 252, 0.95)');
    shadowGradient.addColorStop(1, 'rgba(241, 245, 249, 0.92)');
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = shadowGradient;
    ctx.fill();
    
    // Bold border for visibility
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, centerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner accent ring
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, centerRadius - 10, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Primary count - very large and bold for maximum visibility
    ctx.font = '700 40px Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    
    // High contrast text
    ctx.fillStyle = '#111827'; // Very dark for maximum contrast
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText.count, trueCenterX, trueCenterY - 12);

    // Percentage text with bright pink accent
    ctx.font = '600 20px Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.fillStyle = '#ec4899'; // Bright pink
    ctx.fillText(displayText.percentage, trueCenterX, trueCenterY + 18);

    // Label text - clear and readable
    const labelFont = this.activeIndex !== -1 ? '600 16px' : '500 14px';
    ctx.font = `${labelFont} Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
    ctx.fillStyle = this.activeIndex !== -1 ? '#374151' : '#6b7280';
    
    // Ensure text fits within the circle
    let labelText = displayText.label;
    if (labelText.length > 12) {
      labelText = labelText.substring(0, 12) + '...';
    }
    ctx.fillText(labelText, trueCenterX, trueCenterY + 40);

    ctx.restore();
  }

  getSegmentPercentage(index: number): string {
    if (!this.chartData.datasets || this.chartData.datasets.length === 0) {
      return '0';
    }
    
    const data = this.chartData.datasets[0].data as number[];
    const total = data.reduce((a, b) => a + b, 0);
    const value = data[index];
    const percentage = ((value / total) * 100).toFixed(1);
    
    return percentage;
  }

  private updateResponsiveLegend(): void {
    // Get the widget container size
    const widgetElement = document.querySelector('.premium-donut-chart-widget') as HTMLElement;
    if (!widgetElement) return;
    
    const containerWidth = widgetElement.clientWidth;
    const containerHeight = widgetElement.clientHeight;
    
    // Hide legend if container is too small
    // Threshold: less than 400px width or less than 300px height
    const shouldShow = this.showLegend && containerWidth >= 400 && containerHeight >= 300;
    
    if (this.shouldShowLegend !== shouldShow) {
      this.shouldShowLegend = shouldShow;
      // Trigger change detection if needed
      setTimeout(() => {
        if (this.chartInstance) {
          this.chartInstance.update('none');
        }
      }, 0);
    }
  }

  private setupResponsiveHandlers(): void {
    // Setup ResizeObserver for aggressive chart resizing
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.updateResponsiveLegend();
        this.adjustChartForZoom();
        if (this.chartInstance) {
          this.chartInstance.resize();
          this.chartInstance.update('none');
        }
      });
    });

    // Observe elements
    setTimeout(() => {
      const chartContainer = document.querySelector('.chart-container');
      const widget = document.querySelector('.premium-donut-widget');
      if (chartContainer) this.resizeObserver!.observe(chartContainer);
      if (widget) this.resizeObserver!.observe(widget);
    }, 100);

    // Setup viewport change handler
    this.viewportObserver = () => {
      setTimeout(() => {
        this.adjustChartForZoom();
        if (this.chartInstance) {
          this.chartInstance.resize();
          this.chartInstance.update('resize');
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
    const widget = document.querySelector('.premium-donut-widget') as HTMLElement;
    const chartContainer = document.querySelector('.chart-container') as HTMLElement;
    const canvas = document.querySelector('.premium-donut-canvas') as HTMLElement;
    
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

    const reservedHeight = 120;
    const chartSize = Math.max(120, (availableHeight - reservedHeight) * sizeFactor);
    
    // CRITICAL: For donut charts, maintain perfect circle (1:1 aspect ratio)
    chartContainer.style.width = `${chartSize}px`;
    chartContainer.style.height = `${chartSize}px`;
    chartContainer.style.minWidth = `${chartSize}px`;
    chartContainer.style.minHeight = `${chartSize}px`;
    chartContainer.style.maxWidth = `${chartSize}px`;
    chartContainer.style.maxHeight = `${chartSize}px`;
    
    // Canvas should also be square
    canvas.style.width = `${chartSize - 10}px`;
    canvas.style.height = `${chartSize - 10}px`;
    canvas.style.minWidth = `${chartSize - 10}px`;
    canvas.style.minHeight = `${chartSize - 10}px`;
    canvas.style.maxWidth = `${chartSize - 10}px`;
    canvas.style.maxHeight = `${chartSize - 10}px`;
  }
}