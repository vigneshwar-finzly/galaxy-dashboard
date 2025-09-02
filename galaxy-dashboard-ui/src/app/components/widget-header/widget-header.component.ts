import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-widget-header',
  templateUrl: './widget-header.component.html',
  styleUrls: ['./widget-header.component.scss']
})
export class WidgetHeaderComponent {
  @Input() title: string = '';
  @Input() showControls: boolean = true;
  @Input() isLoading: boolean = false;
  @Input() dashboardWidgetId?: number;
  @Input() widgetData?: any;
  
  @Output() onRefresh = new EventEmitter<void>();
  @Output() onExpand = new EventEmitter<{widgetId?: number, data?: any}>();
  @Output() onClose = new EventEmitter<{dashboardWidgetId?: number}>();

  handleRefresh(): void {
    if (!this.isLoading) {
      this.onRefresh.emit();
    }
  }

  handleExpand(): void {
    this.onExpand.emit({
      widgetId: this.dashboardWidgetId,
      data: this.widgetData
    });
  }

  handleClose(): void {
    this.onClose.emit({
      dashboardWidgetId: this.dashboardWidgetId
    });
  }
}

