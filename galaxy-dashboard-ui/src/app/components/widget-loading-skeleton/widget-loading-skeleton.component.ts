import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-widget-loading-skeleton',
  templateUrl: './widget-loading-skeleton.component.html',
  styleUrls: ['./widget-loading-skeleton.component.scss']
})
export class WidgetLoadingSkeletonComponent {
  @Input() skeletonType: 'chart' | 'kpi' | 'table' = 'chart';
  @Input() title: string = 'Loading...';
}

