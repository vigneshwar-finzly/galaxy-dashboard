import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ExpandedWidgetDialogComponent } from '../expanded-widget-dialog/expanded-widget-dialog.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WidgetHeaderComponent } from '../widget-header/widget-header.component';

interface KpiData {
  title: string;
  value: string;
  subtitle?: string;
  icon: string; // Used to determine the pattern
}

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule,WidgetHeaderComponent],
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss']
})
export class KpiCardComponent implements OnChanges {
  @Input() data!: any;
  @Output() widgetRemoved = new EventEmitter<{dashboardWidgetId?: number}>();
  
  public animatedValue: number = 0;
  isRefreshing = false;

  colorMap :any = {
    'dollar': ['#ff9a9e', '#fad0c4'],
    'users': ['#a18cd1', '#fbc2eb'],
    'chart': ['#f6d365', '#fda085'],
    'clock': ['#84fab0', '#8fd3f4'],
    'trending-up': ['#fccb90', '#d57eeb'],
    'default': ['#ffecd2', '#fcb69f']
  };

  constructor(private dialog: MatDialog) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.animateValue();
    }
  }

  animateValue() {
    const targetValue = parseFloat(this.data.value.replace(/[^0-9.-]+/g, ""));
    const duration = 1500; // Slightly longer for better effect
    const startTimestamp = performance.now();
    const step = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTimestamp) / duration);
      // Use easing function for smoother animation
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      this.animatedValue = Math.floor(easeOutExpo * targetValue);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        this.animatedValue = targetValue;
      }
    };
    window.requestAnimationFrame(step);
  }



  getColors(): string[] {
    return this.colorMap[this.data.icon] || this.colorMap['default'];
  }

  // Widget action handlers
  handleRefresh(): void {
    this.isRefreshing = true;
    
    // Simulate data refresh - replace with actual API call
    setTimeout(() => {
      // In real implementation, fetch fresh data here
      // Simulate slightly changed data for demo
      const currentValue = parseFloat(this.data.value.replace(/[^0-9.-]+/g, ""));
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const newValue = Math.round(currentValue * (1 + variation));
      
      this.data.value = newValue.toString();
      
      this.animateValue();
      this.isRefreshing = false;
    }, 2000);
  }

  handleExpand(event: {widgetId?: number, data?: any}): void {
    const dialogRef = this.dialog.open(ExpandedWidgetDialogComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      maxHeight: '800px',
      data: {
        widgetId: event.widgetId,
        data: this.getExpandedData(),
        title: this.data.title,
        chartType: 'kpi-card',
        description: this.data?.subtitle || 'Key Performance Indicator showing current metrics'
      },
      panelClass: ['expanded-widget-dialog-container']
    });
  }

  handleClose(event: {dashboardWidgetId?: number}): void {
    if (confirm('Are you sure you want to remove this KPI widget from the dashboard?')) {
      this.widgetRemoved.emit(event);
    }
  }

  getExpandedData(): any {
    return {
      component: 'kpi-card',
      title: this.data.title,
      dashboardWidgetId: this.data?.dashboardWidgetId,
      value: this.data.value,
      subtitle: this.data.subtitle,
      icon: this.data.icon,
      animatedValue: this.animatedValue,
      description: this.data?.subtitle || 'Key Performance Indicator showing real-time metrics',
      ...this.data
    };
  }

}