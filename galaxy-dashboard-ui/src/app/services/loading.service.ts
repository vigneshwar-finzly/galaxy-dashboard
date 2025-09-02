import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.loadingSubject.asObservable();

  private operationsSubject = new BehaviorSubject<{ [key: string]: boolean }>({});
  public operations$ = this.operationsSubject.asObservable();

  constructor() { }

  // General loading state
  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  // Operation-specific loading states
  setOperationLoading(operation: string, loading: boolean): void {
    const currentOps = this.operationsSubject.value;
    const updatedOps = { ...currentOps, [operation]: loading };
    
    if (!loading) {
      delete updatedOps[operation];
    }
    
    this.operationsSubject.next(updatedOps);
    
    // Update general loading state
    const hasAnyLoading = Object.values(updatedOps).some(isLoading => isLoading);
    this.loadingSubject.next(hasAnyLoading);
  }

  isOperationLoading(operation: string): boolean {
    return this.operationsSubject.value[operation] || false;
  }

  // Predefined operations
  setDashboardsLoading(loading: boolean): void {
    this.setOperationLoading('dashboards', loading);
  }

  setWidgetsLoading(loading: boolean): void {
    this.setOperationLoading('widgets', loading);
  }

  setDashboardCreating(loading: boolean): void {
    this.setOperationLoading('creating-dashboard', loading);
  }

  setWidgetCreating(loading: boolean): void {
    this.setOperationLoading('creating-widget', loading);
  }

  setDashboardDeleting(loading: boolean): void {
    this.setOperationLoading('deleting-dashboard', loading);
  }

  setWidgetDeleting(loading: boolean): void {
    this.setOperationLoading('deleting-widget', loading);
  }

  isDashboardsLoading(): boolean {
    return this.isOperationLoading('dashboards');
  }

  isWidgetsLoading(): boolean {
    return this.isOperationLoading('widgets');
  }

  isDashboardCreating(): boolean {
    return this.isOperationLoading('creating-dashboard');
  }

  isWidgetCreating(): boolean {
    return this.isOperationLoading('creating-widget');
  }

  isDashboardDeleting(): boolean {
    return this.isOperationLoading('deleting-dashboard');
  }

  isWidgetDeleting(): boolean {
    return this.isOperationLoading('deleting-widget');
  }
}
