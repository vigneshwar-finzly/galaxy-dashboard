import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../services/notification.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule],
  selector: 'app-notification-toast',
  template: `
    <div class="notification-container">
      <div
        *ngFor="let notification of notifications; trackBy: trackByFn"
        class="notification-toast"
        [ngClass]="'notification-' + notification.type"
        [@slideIn]
      >
        <div
          class="notification-progress"
          [ngStyle]="{
            'animation-duration': notification.duration + 'ms',
            'background-color': getProgressColor(notification.type)
          }"
          *ngIf="notification.duration && notification.duration > 0"
        ></div>

        <div class="notification-content">
          <div class="notification-icon-container">
            <i
              class="material-icons"
              [ngSwitch]="notification.type"
            >
              <span *ngSwitchCase="'success'">check_circle</span>
              <span *ngSwitchCase="'error'">error</span>
              <span *ngSwitchCase="'warning'">warning</span>
              <span *ngSwitchDefault>info</span>
            </i>
          </div>
          <div class="notification-message">
            {{ notification.message }}
          </div>
          <button
            class="notification-close"
            (click)="removeNotification(notification.id)"
          >
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
          /* Modern Container */
      .notification-container {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 10000;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      /* Modern Toast Card */
      .notification-toast {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1),
          0 4px 12px rgba(0, 0, 0, 0.05);
        margin-bottom: 16px;
        max-width: 400px;
        min-width: 320px;
        overflow: hidden;
        pointer-events: all;
        position: relative;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .notification-toast:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15),
          0 6px 18px rgba(0, 0, 0, 0.08);
      }

      /* Progress Bar at the top of the toast */
      .notification-progress {
        height: 4px;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        background-color: #007bff; /* Default color */
        animation: progress 0s linear forwards;
        transform-origin: left;
      }

      /* Progress bar animation */
      @keyframes progress {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }

      /* Inner Content Layout */
      .notification-content {
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .notification-icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        font-size: 20px;
        flex-shrink: 0;
      }

      .notification-icon-container i {
        color: #fff;
      }

      .notification-message {
        color: #1e293b;
        font-size: 14px;
        line-height: 1.4;
        flex: 1;
        font-weight: 500;
      }

      .notification-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #94a3b8;
        transition: color 0.2s ease;
      }

      .notification-close:hover {
        color: #1e293b;
      }

      /* Thematic Colors & Icons */
      .notification-success .notification-icon-container {
        background-color: #22c55e;
      }
      .notification-error .notification-icon-container {
        background-color: #ef4444;
      }
      .notification-warning .notification-icon-container {
        background-color: #f97316;
      }
      .notification-info .notification-icon-container {
        background-color: #3b82f6;
      }
    `,
  ],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ transform: 'translateX(0)', opacity: 1, height: '*' }),
        animate(
          '200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          style({ transform: 'translateX(100%)', opacity: 0, height: 0 })
        ),
      ]),
    ]),
  ],
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.notificationService.notifications$.subscribe(
        (notifications) => (this.notifications = notifications)
      )
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  trackByFn(index: number, notification: Notification): string {
    return notification.id;
  }

  /**
   * Returns the color for the progress bar based on the notification type.
   */
  getProgressColor(type: string): string {
    switch (type) {
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f97316';
      case 'info':
        return '#3b82f6';
      default:
        return '#94a3b8';
    }
  }
}
