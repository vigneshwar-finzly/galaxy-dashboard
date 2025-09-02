import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';
import { ApiService } from './api.service';
import { LoadingService } from './loading.service';
import { NotificationService } from './notification.service';
import { 
  WidgetResponse, 
  CreateWidgetRequest, 
  UpdateWidgetRequest,
  ChartType
} from '../models/dashboard.models';

export interface Widget {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  // Add fields to support backend widget data
  chartType?: string;
  dataSource?: string;
  widgetData?: { [key: string]: any };
  dataLoadSuccess?: boolean;
  dataLoadError?: string;
  backendWidget?: WidgetResponse;
}

@Injectable({
  providedIn: 'root'
})
export class WidgetAccordionService {
  private isAccordionOpenSubject = new BehaviorSubject<boolean>(false);
  public isAccordionOpen$ = this.isAccordionOpenSubject.asObservable();

  private availableWidgets: Widget[] = [];
  private backendWidgets: WidgetResponse[] = [];
  
  // Fallback widgets for when backend is not available
  private fallbackWidgets: Widget[] = [
    // Payments Category
    {
      id: 'payments-fedwire',
      name: 'Process Fedwire Payments',
      description: 'Track and monitor Fedwire payment processing',
      icon: 'account_balance_wallet',
      category: 'Payments'
    },
    {
      id: 'payments-ach',
      name: 'ACH Payment Volume',
      description: 'Monitor ACH payment transaction volumes',
      icon: 'swap_horiz',
      category: 'Payments'
    },
    {
      id: 'payments-status',
      name: 'Payment Status Dashboard',
      description: 'Real-time payment status monitoring',
      icon: 'pending_actions',
      category: 'Payments'
    },
    {
      id: 'payments-fees',
      name: 'Payment Fee Analytics',
      description: 'Analyze payment processing fees and revenue',
      icon: 'attach_money',
      category: 'Payments'
    },
    {
      id: 'payments-trends',
      name: 'Payment Volume Trends',
      description: 'Track payment volume trends over time',
      icon: 'trending_up',
      category: 'Payments'
    },
    {
      id: 'payments-summary',
      name: 'Daily Payment Summary',
      description: 'Daily payment processing summary and metrics',
      icon: 'summarize',
      category: 'Payments'
    },
    
    // Payment Files Category
    {
      id: 'payment-files-processing',
      name: 'File Processing Status',
      description: 'Monitor payment file processing status',
      icon: 'file_copy',
      category: 'Payment Files'
    },
    {
      id: 'payment-files-errors',
      name: 'File Processing Errors',
      description: 'Track and analyze file processing errors',
      icon: 'error_outline',
      category: 'Payment Files'
    },
    {
      id: 'payment-files-volume',
      name: 'File Processing Volume',
      description: 'Monitor daily file processing volumes',
      icon: 'assessment',
      category: 'Payment Files'
    },
    {
      id: 'payment-files-success',
      name: 'File Success Rate',
      description: 'Track file processing success rates',
      icon: 'check_circle',
      category: 'Payment Files'
    },
    {
      id: 'payment-files-timeline',
      name: 'File Processing Timeline',
      description: 'File processing timeline and performance',
      icon: 'schedule',
      category: 'Payment Files'
    },
    {
      id: 'payment-files-summary',
      name: 'File Processing Summary',
      description: 'Daily file processing summary report',
      icon: 'description',
      category: 'Payment Files'
    },
    
    // Customers Category
    {
      id: 'customers-active',
      name: 'Active Customer Count',
      description: 'Track number of active customers',
      icon: 'people',
      category: 'Customers'
    },
    {
      id: 'customers-registration',
      name: 'Customer Registration Trends',
      description: 'Monitor new customer registration trends',
      icon: 'person_add',
      category: 'Customers'
    },
    {
      id: 'customers-segments',
      name: 'Customer Segmentation',
      description: 'Analyze customer segments and demographics',
      icon: 'group_work',
      category: 'Customers'
    },
    {
      id: 'customers-activity',
      name: 'Customer Activity Dashboard',
      description: 'Monitor customer activity and engagement',
      icon: 'analytics',
      category: 'Customers'
    },
    {
      id: 'customers-satisfaction',
      name: 'Customer Satisfaction Score',
      description: 'Track customer satisfaction metrics',
      icon: 'sentiment_satisfied',
      category: 'Customers'
    },
    {
      id: 'customers-growth',
      name: 'Customer Growth Rate',
      description: 'Monitor customer growth and retention',
      icon: 'trending_up',
      category: 'Customers'
    },
    
    // Accounts Category
    {
      id: 'accounts-coreposting',
      name: 'Core Posting Count',
      description: 'Track core posting transaction counts',
      icon: 'account_balance',
      category: 'Accounts'
    },
    {
      id: 'accounts-balance',
      name: 'Account Balance Summary',
      description: 'Monitor account balance distributions',
      icon: 'account_balance_wallet',
      category: 'Accounts'
    },
    {
      id: 'accounts-transactions',
      name: 'Account Transaction Volume',
      description: 'Track account transaction volumes',
      icon: 'swap_horiz',
      category: 'Accounts'
    },
    {
      id: 'accounts-types',
      name: 'Account Type Distribution',
      description: 'Analyze account type distributions',
      icon: 'pie_chart',
      category: 'Accounts'
    },
    {
      id: 'accounts-status',
      name: 'Account Status Dashboard',
      description: 'Monitor account status and health',
      icon: 'monitor_heart',
      category: 'Accounts'
    },
    {
      id: 'accounts-summary',
      name: 'Account Summary Report',
      description: 'Daily account summary and metrics',
      icon: 'summarize',
      category: 'Accounts'
    },
    
    // Documents Category
    {
      id: 'documents-uploaded',
      name: 'Documents Uploaded Today',
      description: 'Track daily document upload counts',
      icon: 'cloud_upload',
      category: 'Documents'
    },
    {
      id: 'documents-processed',
      name: 'Documents Processed',
      description: 'Monitor document processing status',
      icon: 'description',
      category: 'Documents'
    },
    {
      id: 'documents-types',
      name: 'Document Type Distribution',
      description: 'Analyze document type distributions',
      icon: 'folder',
      category: 'Documents'
    },
    {
      id: 'documents-storage',
      name: 'Document Storage Usage',
      description: 'Monitor document storage consumption',
      icon: 'storage',
      category: 'Documents'
    },
    {
      id: 'documents-access',
      name: 'Document Access Logs',
      description: 'Track document access and usage patterns',
      icon: 'visibility',
      category: 'Documents'
    },
    {
      id: 'documents-summary',
      name: 'Document Management Summary',
      description: 'Daily document management summary',
      icon: 'summarize',
      category: 'Documents'
    },
    
    // Notifications Category
    {
      id: 'notifications-sent',
      name: 'Notifications Sent Today',
      description: 'Track daily notification delivery counts',
      icon: 'notifications',
      category: 'Notifications'
    },
    {
      id: 'notifications-delivered',
      name: 'Notification Delivery Rate',
      description: 'Monitor notification delivery success rates',
      icon: 'mark_email_read',
      category: 'Notifications'
    },
    {
      id: 'notifications-types',
      name: 'Notification Type Distribution',
      description: 'Analyze notification type distributions',
      icon: 'category',
      category: 'Notifications'
    },
    {
      id: 'notifications-engagement',
      name: 'Notification Engagement',
      description: 'Track notification engagement metrics',
      icon: 'touch_app',
      category: 'Notifications'
    },
    {
      id: 'notifications-trends',
      name: 'Notification Trends',
      description: 'Monitor notification sending trends',
      icon: 'trending_up',
      category: 'Notifications'
    },
    {
      id: 'notifications-summary',
      name: 'Notification Summary',
      description: 'Daily notification summary report',
      icon: 'summarize',
      category: 'Notifications'
    }
  ];

  constructor(
    private apiService: ApiService,
    private loadingService: LoadingService,
    private notificationService: NotificationService
  ) { 
    this.loadWidgetsFromBackend();
  }

  private loadWidgetsFromBackend(): void {
    this.loadingService.setWidgetsLoading(true);
    
    this.apiService.getAllWidgets().subscribe({
      next: (response) => {
        this.backendWidgets = response.data;
        this.availableWidgets = this.mapBackendWidgetsToFrontend(response.data);
      },
      error: (error) => {
        console.warn('Failed to load widgets from backend, using fallback:', error);
        this.availableWidgets = [...this.fallbackWidgets];
        this.notificationService.warning('Widgets Load Warning', 'Using fallback widgets. Backend connection may be unavailable.');
      },
      complete: () => {
        this.loadingService.setWidgetsLoading(false);
      }
    });
  }

  private mapBackendWidgetsToFrontend(widgets: WidgetResponse[]): Widget[] {
    return widgets.map(widget => ({
      id: widget.id.toString(),
      name: widget.name,
      description: widget.description || 'No description available',
      icon: this.getIconForChartType(widget.chartType),
      category: this.getCategoryForDataSource(widget.dataSource),
      // Include backend widget data
      chartType: widget.chartType,
      dataSource: widget.dataSource,
      widgetData: widget.widgetData,
      dataLoadSuccess: widget.dataLoadSuccess,
      dataLoadError: widget.dataLoadError,
      backendWidget: widget
    }));
  }

  private getIconForChartType(chartType: ChartType): string {
    switch (chartType) {
      case ChartType.TABLE: return 'table_view';
      case ChartType.PIE: return 'pie_chart';
      case ChartType.DONUT: return 'donut_large';
      case ChartType.VERTICAL_BAR: return 'bar_chart';
      case ChartType.HORIZONTAL_BAR: return 'bar_chart';
      case ChartType.LINE_CHART: return 'show_chart';
      case ChartType.AREA_CHART: return 'area_chart';
      case ChartType.COUNT: return 'numbers';
      case ChartType.RADAR_CHART: return 'radar';
      default: return 'widgets';
    }
  }

  private getCategoryForDataSource(dataSource: string): string {
    const lowerDataSource = dataSource.toLowerCase();
    if (lowerDataSource.includes('payment')) return 'Payments';
    if (lowerDataSource.includes('bulkfile') || lowerDataSource.includes('file')) return 'Payment Files';
    if (lowerDataSource.includes('customer')) return 'Customers';
    if (lowerDataSource.includes('account')) return 'Accounts';
    if (lowerDataSource.includes('document')) return 'Documents';
    if (lowerDataSource.includes('notification')) return 'Notifications';
    return 'General';
  }

  toggleAccordion(): void {
    this.isAccordionOpenSubject.next(!this.isAccordionOpenSubject.value);
  }

  closeAccordion(): void {
    this.isAccordionOpenSubject.next(false);
  }

  getAvailableWidgets(): Widget[] {
    return this.availableWidgets;
  }

  getWidgetsByCategory(): { [key: string]: Widget[] } {
    return this.availableWidgets.reduce((acc, widget) => {
      if (!acc[widget.category]) {
        acc[widget.category] = [];
      }
      acc[widget.category].push(widget);
      return acc;
    }, {} as { [key: string]: Widget[] });
  }

  refreshWidgets(): Observable<Widget[]> {
    return this.apiService.getAllWidgets().pipe(
      map(response => {
        this.backendWidgets = response.data;
        this.availableWidgets = this.mapBackendWidgetsToFrontend(response.data);
        return this.availableWidgets;
      }),
      catchError(error => {
        console.error('Error refreshing widgets:', error);
        return of(this.fallbackWidgets);
      })
    );
  }

  createWidget(request: CreateWidgetRequest): Observable<WidgetResponse> {
    this.loadingService.setWidgetCreating(true);
    
    return this.apiService.createWidget(request).pipe(
      map(response => response.data),
      tap((widget) => {
        // Add the new widget to our local cache
        this.backendWidgets.push(widget);
        this.availableWidgets = this.mapBackendWidgetsToFrontend(this.backendWidgets);
        
        this.notificationService.widgetCreated(widget.name);
      }),
      catchError(error => {
        this.notificationService.error('Widget Creation Failed', 'Unable to create widget: ' + error.message);
        throw error;
      }),
      finalize(() => {
        this.loadingService.setWidgetCreating(false);
      })
    );
  }

  updateWidget(id: number, request: UpdateWidgetRequest): Observable<WidgetResponse> {
    return this.apiService.updateWidget(id, request).pipe(
      map(response => response.data),
      tap((widget) => {
        // Update the widget in our local cache
        const index = this.backendWidgets.findIndex(w => w.id === id);
        if (index !== -1) {
          this.backendWidgets[index] = widget;
          this.availableWidgets = this.mapBackendWidgetsToFrontend(this.backendWidgets);
        }
      })
    );
  }

  deleteWidget(id: number): Observable<void> {
    this.loadingService.setWidgetDeleting(true);
    
    const widget = this.backendWidgets.find(w => w.id === id);
    const widgetName = widget?.name || 'Widget';
    
    return this.apiService.deleteWidget(id).pipe(
      map(() => void 0), // Convert ApiResponse<void> to void
      tap(() => {
        // Remove the widget from our local cache
        this.backendWidgets = this.backendWidgets.filter(w => w.id !== id);
        this.availableWidgets = this.mapBackendWidgetsToFrontend(this.backendWidgets);
        
        this.notificationService.widgetDeleted(widgetName);
      }),
      catchError(error => {
        this.notificationService.error('Widget Deletion Failed', 'Unable to delete widget: ' + error.message);
        throw error;
      }),
      finalize(() => {
        this.loadingService.setWidgetDeleting(false);
      })
    );
  }

  getWidgetById(id: number): Observable<WidgetResponse> {
    return this.apiService.getWidgetById(id).pipe(
      map(response => response.data)
    );
  }

  searchWidgets(name: string): Observable<WidgetResponse[]> {
    return this.apiService.searchWidgets(name).pipe(
      map(response => response.data)
    );
  }

  getMyWidgets(): Observable<WidgetResponse[]> {
    return this.apiService.getMyWidgets().pipe(
      map(response => response.data)
    );
  }

  getWidgetsByDataSource(dataSource: string): Observable<WidgetResponse[]> {
    return this.apiService.getWidgetsByDataSource(dataSource).pipe(
      map(response => response.data)
    );
  }

  getWidgetsByChartType(chartType: ChartType): Observable<WidgetResponse[]> {
    return this.apiService.getWidgetsByChartType(chartType).pipe(
      map(response => response.data)
    );
  }
} 