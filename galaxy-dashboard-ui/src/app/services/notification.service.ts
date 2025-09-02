import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() { }

  private addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      duration: 3000
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([newNotification, ...currentNotifications]);

    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  }

  success(title: string, message: string, duration?: number): void {
    this.addNotification({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration?: number): void {
    this.addNotification({ type: 'error', title, message, duration: duration || 8000 });
  }

  warning(title: string, message: string, duration?: number): void {
    this.addNotification({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration?: number): void {
    this.addNotification({ type: 'info', title, message, duration });
  }

  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(filteredNotifications);
  }

  clearAll(): void {
    this.notificationsSubject.next([]);
  }

  // Predefined notifications for common actions
  dashboardCreated(name: string): void {
    this.success('Dashboard Created', `"${name}" has been created successfully`);
  }

  dashboardUpdated(name: string): void {
    this.success('Dashboard Updated', `"${name}" has been updated successfully`);
  }

  dashboardDeleted(name: string): void {
    this.warning('Dashboard Deleted', `"${name}" has been deleted`);
  }

  dashboardPublished(name: string): void {
    this.success('Dashboard Published', `"${name}" is now published and available to users`);
  }

  widgetCreated(name: string): void {
    this.success('Widget Created', `"${name}" widget has been created successfully`);
  }

  widgetUpdated(name: string): void {
    this.success('Widget Updated', `"${name}" widget has been updated successfully`);
  }

  widgetDeleted(name: string): void {
    this.warning('Widget Deleted', `"${name}" widget has been deleted`);
  }

  widgetAddedToDashboard(widgetName: string, dashboardName: string): void {
    this.success('Widget Added', `"${widgetName}" has been added to "${dashboardName}"`);
  }

  apiError(error: string): void {
    this.error('API Error', error);
  }

  connectionError(): void {
    this.error('Connection Error', 'Unable to connect to server. Please check if the backend is running.');
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}
