import { Component, Input, OnInit, OnDestroy, ViewChild, Output, EventEmitter } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ThemeService } from '../../services/theme.service';

import { MatDialog } from '@angular/material/dialog';
import { ExpandedWidgetDialogComponent } from '../expanded-widget-dialog/expanded-widget-dialog.component';
import 'chartjs-plugin-datalabels'; // Import a useful plugin for data labels
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WidgetHeaderComponent } from '../widget-header/widget-header.component';

@Component({
  standalone: true,
  imports: [NgChartsModule,CommonModule,FormsModule,WidgetHeaderComponent],
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss']
})
export class PieChartComponent implements OnInit, OnDestroy {
  @Input() data!: any;
  @Input() title: string = 'SaaS Dashboard Metrics';
  @Input() showLegend: boolean = true;
  @Output() widgetRemoved = new EventEmitter<{dashboardWidgetId?: number}>();
  
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  private themeSub?: any;

  private resizeObserver?: ResizeObserver;
  private viewportObserver?: any;
  private centerTextPlugin: any;
  
  isRefreshing = false;
  selectedTimeFrame = '1m';
  chartSummary: any = null;
  public activeIndex: number = -1;
  
  // Responsive legend based on container size
  public shouldShowLegend: boolean = true;

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


  public chartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
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
      padding: 15
    },
    // animation: {
    //   animateRotate: true,
    //   animateScale: true,
    //   duration: 800,
    //   easing: 'easeOutQuart'
    // },
            onHover: (event, elements, chart) => {
          const canvas = chart.canvas;
          if (elements && elements.length > 0) {
            canvas.style.cursor = 'pointer';
            this.activeIndex = elements[0].index;
            chart.setActiveElements(elements);
            chart.update('none');
            // Ensure center text updates immediately
            setTimeout(() => this.drawCenterTextManually(), 10);
          } else {
            canvas.style.cursor = 'default';
            this.activeIndex = -1;
            chart.setActiveElements([]);
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
          borderRadius: 0,
          hoverOffset: 8, // Reduced pop-out effect
          spacing: 0 // Remove spacing between slices
        }
      },
    plugins: {
      legend: {
        display: false, // Disable built-in legend, using custom side legend instead
        position: 'bottom',
        align: 'center',
        labels: {
          color: this.getCurrentThemeTextColor(),
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
          // Highlight corresponding slice
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
        borderColor: 'rgba(99, 102, 241, 0.1)',
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
          weight: 500
        },
        footerFont: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          size: 11,
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

  constructor(
    private themeService: ThemeService,
    private dialog: MatDialog,

  ) {
    // Center text plugin for dynamic content display
    this.centerTextPlugin = {
      id: 'centerText',
      afterDraw: (chart: any) => {
        const { ctx } = chart;
        const active = chart.getActiveElements() || [];
        const dataset = chart.data.datasets[0];
        const total = dataset.data.reduce((a: number, b: number) => a + b, 0);

        let displayText = {
          count: total.toLocaleString(),
          label: this.chartSummary?.totalLabel || 'Total',
          percentage: '100%'
        };

        // Show specific segment data when hovering
        if (this.activeIndex !== -1) {
          const value = dataset.data[this.activeIndex] as number;
          const percentage = ((value / total) * 100).toFixed(1);
          displayText = {
            count: value.toLocaleString(),
            label: chart.data.labels?.[this.activeIndex]?.toString() || 'Segment',
            percentage: percentage + '%'
          };
        }

        ctx.save();

        // Modern pie chart center styling
        const { width, height } = chart;
        const chartArea = chart.chartArea;
        const trueCenterX = chartArea.left + (chartArea.right - chartArea.left) / 2;
        const trueCenterY = chartArea.top + (chartArea.bottom - chartArea.top) / 2;

        // Draw elegant center background
        ctx.beginPath();
        ctx.arc(trueCenterX, trueCenterY, 65, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trueCenterX, trueCenterY, 65, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Primary count with gradient effect
        ctx.font = '700 34px Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
        
        // Create gradient for the main value
        const gradient = ctx.createLinearGradient(0, trueCenterY - 18, 0, trueCenterY + 18);
        gradient.addColorStop(0, '#1f2937');
        gradient.addColorStop(1, '#374151');
        ctx.fillStyle = gradient;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText.count, trueCenterX, trueCenterY - 6);

        // Percentage text with modern styling
        ctx.font = '600 16px Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
        const percentageGradient = ctx.createLinearGradient(0, trueCenterY + 8, 0, trueCenterY + 18);
        percentageGradient.addColorStop(0, '#6366f1');
        percentageGradient.addColorStop(1, '#4338ca');
        ctx.fillStyle = percentageGradient;
        ctx.fillText(displayText.percentage, trueCenterX, trueCenterY + 14);

        // Label text - more prominent when showing segment
        const labelFont = this.activeIndex !== -1 ? '600 12px' : '500 10px';
        ctx.font = `${labelFont} Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
        ctx.fillStyle = this.activeIndex !== -1 ? '#4b5563' : '#6b7280';
        ctx.fillText(displayText.label, trueCenterX, trueCenterY + 28);

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
    // Initialize chart data and statistics
    this.generateDataForTimeFrame(this.selectedTimeFrame);
    this.initializeChartData();
    this.updateChartSummary();
    this.setupResponsiveHandlers();
    
    // Initialize responsive legend
    setTimeout(() => this.updateResponsiveLegend(), 100);
    
    // Wait for theme to be applied before initializing chart
    setTimeout(() => {
      this.initializeChartData();
      this.updateChartSummary();
      
      // Register the center text plugin when chart is ready and force initial render
      setTimeout(() => {
        if (this.chart?.chart) {
          // Register the plugin
          const plugins = this.chart.chart.config.plugins || [];
          plugins.push(this.centerTextPlugin);
          this.chart.chart.config.plugins = plugins;
          
          // Force multiple updates to ensure plugin renders
          this.chart.update('none');
          setTimeout(() => {
            this.chart?.update('active');
            // Draw center text immediately
            this.drawCenterTextManually();
          }, 50);
        }
      }, 200);
      
      const ro = new ResizeObserver(() => {
        this.chartData = { ...this.chartData };
        this.chart?.update();
      });
      const el = document.querySelector('canvas');
      if (el) ro.observe(el);
    }, 100);

    this.themeSub = this.themeService.themeChanges$.subscribe(() => {
      // Re-initialize chart data with new colors when theme changes
      setTimeout(() => {
        this.updateChartOptionsForTheme();
        this.initializeChartData();
        this.chartData = { ...this.chartData };
        this.chart?.update();
      }, 50);
    });


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

  private normalizeId(id: any): string | undefined {
    if (id === null || id === undefined) return undefined;
    const str = String(id);
    const m = /^widget-(\d+)$/.exec(str);
    return m ? m[1] : str;
  }

  private initializeChartData(): void {
    if (this.data && this.data.labels && this.data.datasets) {
      this.chartData = {
        labels: this.data.labels,
        datasets: this.data.datasets.map((dataset: any, idx: number) => ({
          ...dataset,
          // Modern gradient colors with premium styling
          backgroundColor: this.getModernGradientColors(dataset.data.length, idx),
          borderColor: 'transparent',
          borderWidth: 0,
          hoverBorderWidth: 0,
          hoverBorderColor: 'transparent',
          hoverBackgroundColor: this.getHoverColors(dataset.data.length, idx),
          spacing: 0,
          borderRadius: 0,
          hoverOffset: 8,
          borderAlign: 'center'
        }))
      };
    } else {
      // Default data with theme-based colors
      this.chartData = {
        labels: ['Completed', 'Pending', 'Failed', 'Cancelled'],
        datasets: [
          {
            data: [55, 20, 15, 10],
            backgroundColor: this.getModernGradientColors(4, 0),
            borderColor: 'transparent',
            borderWidth: 0,
            hoverBorderWidth: 0,
            hoverBorderColor: 'transparent',
            hoverBackgroundColor: this.getHoverColors(4, 0),
            spacing: 0,
            borderRadius: 0,
            hoverOffset: 8,
            borderAlign: 'center'
          }
        ]
      };
    }
  }

  private getModernGradientColors(length: number, offset: number): string[] {
    // Use the new ultra-modern color palette
    return this.getModernColors(length);
  }

  private getHoverColors(length: number, offset: number): string[] {
    // Use the new modern hover colors
    return this.getModernHoverColors(length);
  }



  private getSegmentColors(length: number, offset: number): string[] {
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

  private updateChartColors(): void {
    if (!this.chart || !this.chart.data || !this.chart.data.datasets) return;
    this.chart.data.datasets.forEach((dataset: any, idx: number) => {
      if (!this.data || !this.data.datasets || !this.data.datasets[idx] || !this.data.datasets[idx].backgroundColor) {
        dataset.backgroundColor = this.getModernGradientColors((dataset.data as number[]).length, idx);
        dataset.hoverBackgroundColor = this.getHoverColors((dataset.data as number[]).length, idx);
      }
    });
    if (this.chart.options?.plugins?.tooltip) {
      (this.chart.options.plugins.tooltip as any).borderColor = 'rgba(99, 102, 241, 0.1)';
    }
  }
  // private getColorArray(length: number): string[] {
  //   const colorArray = [
  //     this.colors.primary,
  //     this.colors.success,
  //     this.colors.info,
  //     this.colors.warning,
  //     this.colors.accent,
  //     this.colors.secondary,
  //     this.colors.danger
  //   ];
    
  //   const colors = [];
  //   for (let i = 0; i < length; i++) {
  //     colors.push(colorArray[i % colorArray.length]);
  //   }
  //   return colors;
  // }

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
        chartType: 'pie-chart',
        description: this.data?.description || 'Pie chart showing data distribution'
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
      component: 'pie-chart',
      title: this.title,
      dashboardWidgetId: this.data?.dashboardWidgetId,
      datasets: this.chartData.datasets,
      labels: this.chartData.labels,
      description: this.data?.description,
      ...this.data
    };
  }

  private getCurrentThemeTextColor(): string {
    // Use the current theme's text color or fallback to a standard dark gray
    return getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim() || 
           this.themeService.getCurrentPalette()?.scale?.[900] || 
           '#1f2937';
  }

  private updateChartOptionsForTheme(): void {
    if (this.chartOptions?.plugins?.legend?.labels) {
      this.chartOptions.plugins.legend.labels.color = this.getCurrentThemeTextColor();
    }
  }

  // Premium Features

  onTimeFrameChange(timeFrame: string): void {
    this.selectedTimeFrame = timeFrame;
    this.refreshChartData();
  }

  private refreshChartData(): void {
    this.isRefreshing = true;
    setTimeout(() => {
      this.generateDataForTimeFrame(this.selectedTimeFrame);
      this.initializeChartData();
      this.updateChartSummary();
      this.chartData = { ...this.chartData };
      this.chart?.update();
      this.isRefreshing = false;
    }, 800);
  }

  private generateDataForTimeFrame(timeFrame: string): void {
    const categories = ['Web Traffic', 'Email Marketing', 'Social Media', 'Direct', 'Referrals'];
    
    // Generate realistic data based on time frame
    const timeFrameMultipliers = {
      '7d': [0.40, 0.25, 0.20, 0.10, 0.05],
      '1w': [0.42, 0.24, 0.19, 0.10, 0.05],
      '1m': [0.45, 0.23, 0.18, 0.09, 0.05],
      '3m': [0.47, 0.22, 0.17, 0.09, 0.05],
      '6m': [0.49, 0.21, 0.16, 0.09, 0.05],
      '1y': [0.52, 0.20, 0.15, 0.08, 0.05],
      'all': [0.55, 0.19, 0.14, 0.08, 0.04]
    };

    const multipliers = timeFrameMultipliers[timeFrame as keyof typeof timeFrameMultipliers] || timeFrameMultipliers['1m'];
    const baseTotal = 15000;
    
    const data = multipliers.map(mult => {
      const value = mult * baseTotal;
      const noise = (Math.random() - 0.5) * value * 0.08;
      return Math.round(value + noise);
    });

    this.chartData = {
      labels: categories,
      datasets: [
        {
          data: data,
          backgroundColor: this.getModernGradientColors(categories.length, 0),
          borderColor: 'transparent',
          borderWidth: 0,
          hoverBorderWidth: 0,
          hoverBorderColor: 'transparent',
          hoverBackgroundColor: this.getHoverColors(categories.length, 0),
          spacing: 0,
          borderRadius: 0,
          hoverOffset: 8,
          borderAlign: 'center'
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
      totalLabel: 'Total',
      largest: largestPercentage,
      largestLabel: labels[maxIndex],
      segments: data.length
    };
  }

  // Legend interaction methods with enhanced center display
  highlightSegment(index: number): void {
    this.activeIndex = index;
    if (this.chart) {
      this.chart.chart?.setActiveElements([{
        datasetIndex: 0,
        index: index
      }]);
      this.chart.chart?.update('active');
      // Ensure center text updates immediately
      setTimeout(() => this.drawCenterTextManually(), 10);
    }
  }

  clearHighlight(): void {
    this.activeIndex = -1;
    if (this.chart) {
      this.chart.chart?.setActiveElements([]);
      this.chart.chart?.update('active');
      // Ensure center text returns to total
      setTimeout(() => this.drawCenterTextManually(), 10);
    }
  }

  getSegmentColor(index: number): string {
    const colors = this.getModernGradientColors(this.chartData.labels?.length || 5, 0);
    return colors[index] || '#6366f1';
  }

  // Manual center text drawing as backup
  private drawCenterTextManually(): void {
    if (!this.chart?.chart) return;
    
    const chart = this.chart.chart;
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    
    if (!dataset || !dataset.data || dataset.data.length === 0) return;
    
    const total = dataset.data.filter(d => d !== null && d !== undefined).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
    const chartArea = chart.chartArea;
    const trueCenterX = chartArea.left + (chartArea.right - chartArea.left) / 2;
    const trueCenterY = chartArea.top + (chartArea.bottom - chartArea.top) / 2;

    let displayText = {
      count: total.toLocaleString(),
      label: this.chartSummary?.totalLabel || 'Total',
      percentage: '100%'
    };

    // Show specific segment data when hovering
    if (this.activeIndex !== -1 && this.activeIndex < dataset.data.length) {
      const value = dataset.data[this.activeIndex] as number;
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
      displayText = {
        count: value.toLocaleString(),
        label: chart.data.labels?.[this.activeIndex]?.toString() || 'Segment',
        percentage: percentage + '%'
      };
    }

    ctx.save();

    // Draw elegant center background
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, 75, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(trueCenterX, trueCenterY, 75, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Primary count - large and bold
    ctx.font = '700 36px Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText.count, trueCenterX, trueCenterY - 8);

    // Percentage text with accent color
    ctx.font = '600 18px Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.fillText(displayText.percentage, trueCenterX, trueCenterY + 16);

    // Label text
    ctx.font = '500 13px Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(displayText.label, trueCenterX, trueCenterY + 32);

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
    const widgetElement = document.querySelector('.premium-pie-chart-widget') as HTMLElement;
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
        if (this.chart) {
          this.chart.update('none');
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
        if (this.chart) {
          this.chart.chart?.resize();
          this.chart.update('none');
        }
      });
    });

    // Observe elements
    setTimeout(() => {
      const chartContainer = document.querySelector('.chart-container');
      const widget = document.querySelector('.premium-pie-widget');
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
    const widget = document.querySelector('.premium-pie-widget') as HTMLElement;
    const chartContainer = document.querySelector('.chart-container') as HTMLElement;
    const canvas = document.querySelector('.premium-pie-canvas') as HTMLElement;
    
    if (!widget || !chartContainer || !canvas) return;

    // Calculate zoom and available space
    const viewportHeight = window.innerHeight;
    const zoom = window.devicePixelRatio || 1;
    
    // Size reduction for zoom levels
    let sizeFactor = 1;
    if (zoom > 2) sizeFactor = 0.4;
    else if (zoom > 1.75) sizeFactor = 0.5;
    else if (zoom > 1.5) sizeFactor = 0.6;
    else if (zoom > 1.25) sizeFactor = 0.7;
    else if (zoom > 1.1) sizeFactor = 0.8;

    // Responsive sizing
    if (viewportHeight < 600) sizeFactor *= 0.7;

    const reservedHeight = 120;
    const maxChartHeight = Math.max(60, (viewportHeight * 0.6 - reservedHeight) * sizeFactor);
    
    // Apply sizing
    chartContainer.style.maxHeight = `${maxChartHeight}px`;
    chartContainer.style.height = `${maxChartHeight}px`;
    
    canvas.style.maxHeight = `${maxChartHeight - 10}px`;
    canvas.style.height = `${maxChartHeight - 10}px`;
  }
}