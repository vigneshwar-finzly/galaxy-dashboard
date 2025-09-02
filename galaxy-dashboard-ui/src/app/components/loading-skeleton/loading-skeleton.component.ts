import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-loading-skeleton',
  templateUrl: './loading-skeleton.component.html',
})
export class LoadingSkeletonComponent {
  @Input() type: 'card' | 'table' | 'chart' = 'card';
  @Input() rows: number = 3;
} 