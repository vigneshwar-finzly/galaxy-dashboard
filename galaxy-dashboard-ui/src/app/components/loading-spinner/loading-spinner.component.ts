import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-loading-spinner',
  template: `
    <div class="loading-overlay" *ngIf="isLoading">
      <div class="loading-content">
        <div class="spinner"></div>
        <div class="loading-text">
          <ng-container *ngIf="currentOperation">
            {{ getOperationText(currentOperation) }}
          </ng-container>
          <ng-container *ngIf="!currentOperation">
            Loading...
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(2px);
    }

    .loading-content {
      background: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 300px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #40916c;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-text {
      font-weight: 500;
      color: #2c3e50;
      font-size: 16px;
    }

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
      .loading-content {
        background: #2c3e50;
        color: white;
      }

      .spinner {
        border: 4px solid #34495e;
        border-top: 4px solid #52b788;
      }

      .loading-text {
        color: white;
      }
    }
  `]
})
export class LoadingSpinnerComponent implements OnInit, OnDestroy {
  isLoading = false;
  currentOperation: string | null = null;
  private subscription = new Subscription();

  constructor(private loadingService: LoadingService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.loadingService.isLoading$.subscribe(
        loading => this.isLoading = loading
      )
    );

    this.subscription.add(
      this.loadingService.operations$.subscribe(
        operations => {
          const operationKeys = Object.keys(operations);
          this.currentOperation = operationKeys.length > 0 ? operationKeys[0] : null;
        }
      )
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getOperationText(operation: string): string {
    const operationTexts: { [key: string]: string } = {
      'dashboards': 'Loading dashboards...',
      'widgets': 'Loading widgets...',
      'creating-dashboard': 'Creating dashboard...',
      'creating-widget': 'Creating widget...',
      'deleting-dashboard': 'Deleting dashboard...',
      'deleting-widget': 'Deleting widget...'
    };

    return operationTexts[operation] || 'Processing...';
  }
}
