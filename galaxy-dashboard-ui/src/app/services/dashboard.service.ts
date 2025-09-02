import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { ApiService } from './api.service';
import { LoadingService } from './loading.service';
import { NotificationService } from './notification.service';
import { 
  Dashboard, 
  DashboardResponse, 
  DashboardSummaryResponse,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  mapDashboardResponseToDashboard,
  AddWidgetToDashboardRequest,
  DashboardWidgetResponse,
  UpdateDashboardWidgetLayoutRequest,
  ViewerType,
  EditorType,
  WidgetDataRequest,
  WidgetDataResponse
} from '../models/dashboard.models';
import { CreateDashboardDialogComponent } from '../components/create-dashboard-dialog/create-dashboard-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private currentDashboardSubject = new BehaviorSubject<Dashboard | null>(null);
  private dashboardsSubject = new BehaviorSubject<Dashboard[]>([]);
  
  public currentDashboard$ = this.currentDashboardSubject.asObservable();
  public dashboards$ = this.dashboardsSubject.asObservable();

  private dashboards: Dashboard[] = [];

  constructor(
    private apiService: ApiService,
    private loadingService: LoadingService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private overlay: Overlay
  ) {
    this.initializeDashboards();
  }

  private initializeDashboards(): void {
    // Load dashboards from backend
    this.loadingService.setDashboardsLoading(true);
    
    this.loadDashboards().subscribe({
      next: (dashboards) => {
        this.dashboards = dashboards;
        if (dashboards.length > 0) {
          // Set the first dashboard or default dashboard as current
          const defaultDashboard = dashboards.find(d => d.isFavorite) || dashboards[0];
          defaultDashboard.isSelected = true;
          this.currentDashboardSubject.next(defaultDashboard);
        }
        this.dashboardsSubject.next(this.dashboards);
      },
      error: (error) => {
        console.error('Failed to load dashboards:', error);
        this.notificationService.error('Load Failed', 'Unable to load dashboards from server');
        // Fallback to empty array
        this.dashboardsSubject.next([]);
      },
      complete: () => {
        this.loadingService.setDashboardsLoading(false);
      }
    });
  }

  private loadDashboards(): Observable<Dashboard[]> {
    return this.apiService.getAllDashboards().pipe(
      map(response => response.data.map(mapDashboardResponseToDashboard)),
      catchError(error => {
        console.error('Error loading dashboards:', error);
        return of([]);
      })
    );
  }

  getCurrentDashboard(): Dashboard | null {
    return this.currentDashboardSubject.value;
  }

  getAllDashboards(): Dashboard[] {
    return this.dashboards;
  }

  // Refresh dashboards from backend
  refreshDashboards(): Observable<Dashboard[]> {
    return this.loadDashboards().pipe(
      tap(dashboards => {
        this.dashboards = dashboards;
        this.dashboardsSubject.next(this.dashboards);
        
        // Update current dashboard if it exists in the new list
        const currentId = this.currentDashboardSubject.value?.id;
        if (currentId) {
          const updatedCurrent = dashboards.find(d => d.id === currentId);
          if (updatedCurrent) {
            updatedCurrent.isSelected = true;
            this.currentDashboardSubject.next(updatedCurrent);
          }
        }
      })
    );
  }

  switchDashboard(dashboardId: number): void {
    // Update selection state
    this.dashboards.forEach(dashboard => {
      dashboard.isSelected = dashboard.id === dashboardId;
      if (dashboard.isSelected) {
        dashboard.lastAccessed = new Date();
      }
    });

    // Find and set the new current dashboard
    const newDashboard = this.dashboards.find(d => d.id === dashboardId);
    if (newDashboard) {
      this.currentDashboardSubject.next(newDashboard);
      this.dashboardsSubject.next(this.dashboards);
    }
  }

  toggleFavorite(dashboardId: number): void {
    const dashboard = this.dashboards.find(d => d.id === dashboardId);
    if (dashboard) {
      // Call backend API to set as default (mapping favorite to default)
      this.apiService.setDefaultDashboard(dashboardId).subscribe({
        next: () => {
          dashboard.isFavorite = !dashboard.isFavorite;
          this.dashboardsSubject.next(this.dashboards);
        },
        error: (error) => {
          console.error('Failed to toggle favorite:', error);
        }
      });
    }
  }

  createDashboard(request: CreateDashboardRequest): Observable<Dashboard> {
    this.loadingService.setDashboardCreating(true);
    
    return this.apiService.createDashboard(request).pipe(
      map(response => {
        const newDashboard = mapDashboardResponseToDashboard({
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          viewerType: response.data.viewerType,
          status: response.data.status,
          createdBy: response.data.createdBy,
          createdDateTime: response.data.createdDateTime,
          updatedDateTime: response.data.updatedDateTime,
          isDefault: response.data.isDefault,
          totalWidgets: response.data.totalWidgets || 0
        });
        
        this.dashboards.push(newDashboard);
        this.dashboardsSubject.next(this.dashboards);
        
        this.notificationService.dashboardCreated(newDashboard.name);
        return newDashboard;
      }),
      catchError(error => {
        this.notificationService.error('Creation Failed', 'Unable to create dashboard: ' + error.message);
        throw error;
      }),
      finalize(() => {
        this.loadingService.setDashboardCreating(false);
      })
    );
  }

  updateDashboard(dashboardId: number, request: UpdateDashboardRequest): Observable<Dashboard> {
    return this.apiService.updateDashboard(dashboardId, request).pipe(
      map(response => {
        const updatedDashboard = mapDashboardResponseToDashboard({
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          viewerType: response.data.viewerType,
          status: response.data.status,
          createdBy: response.data.createdBy,
          createdDateTime: response.data.createdDateTime,
          updatedDateTime: response.data.updatedDateTime,
          isDefault: response.data.isDefault,
          totalWidgets: response.data.totalWidgets || 0
        });
        
        const index = this.dashboards.findIndex(d => d.id === dashboardId);
        if (index !== -1) {
          // Preserve selection state
          updatedDashboard.isSelected = this.dashboards[index].isSelected;
          this.dashboards[index] = updatedDashboard;
          this.dashboardsSubject.next(this.dashboards);
          
          if (updatedDashboard.isSelected) {
            this.currentDashboardSubject.next(updatedDashboard);
          }
        }
        return updatedDashboard;
      })
    );
  }

  deleteDashboard(dashboardId: number): Observable<void> {
    this.loadingService.setDashboardDeleting(true);
    
    const dashboard = this.dashboards.find(d => d.id === dashboardId);
    const dashboardName = dashboard?.name || 'Dashboard';
    
    return this.apiService.deleteDashboard(dashboardId).pipe(
      map(() => {
        const index = this.dashboards.findIndex(d => d.id === dashboardId);
        if (index !== -1) {
          this.dashboards.splice(index, 1);
          this.dashboardsSubject.next(this.dashboards);
          
          // If the removed dashboard was the current one, set the first available as current
          if (this.currentDashboardSubject.value?.id === dashboardId) {
            const newCurrent = this.dashboards[0] || null;
            if (newCurrent) {
              newCurrent.isSelected = true;
            }
            this.currentDashboardSubject.next(newCurrent);
          }
        }
        
        this.notificationService.dashboardDeleted(dashboardName);
        return;
      }),
      catchError(error => {
        this.notificationService.error('Deletion Failed', 'Unable to delete dashboard: ' + error.message);
        throw error;
      }),
      finalize(() => {
        this.loadingService.setDashboardDeleting(false);
      })
    );
  }

  publishDashboard(dashboardId: number): Observable<Dashboard> {
    return this.apiService.publishDashboard(dashboardId).pipe(
      map(response => {
        const publishedDashboard = mapDashboardResponseToDashboard({
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          viewerType: response.data.viewerType,
          status: response.data.status,
          createdBy: response.data.createdBy,
          createdDateTime: response.data.createdDateTime,
          updatedDateTime: response.data.updatedDateTime,
          isDefault: response.data.isDefault,
          totalWidgets: response.data.totalWidgets || 0
        });
        
        const index = this.dashboards.findIndex(d => d.id === dashboardId);
        if (index !== -1) {
          publishedDashboard.isSelected = this.dashboards[index].isSelected;
          this.dashboards[index] = publishedDashboard;
          this.dashboardsSubject.next(this.dashboards);
          
          if (publishedDashboard.isSelected) {
            this.currentDashboardSubject.next(publishedDashboard);
          }
        }
        return publishedDashboard;
      })
    );
  }

  addWidgetToDashboard(dashboardId: number, request: AddWidgetToDashboardRequest): Observable<DashboardWidgetResponse> {
    return this.apiService.addWidgetToDashboard(dashboardId, request).pipe(
      map(response => response.data),
      tap(() => {
        // Refresh the current dashboard to get updated widget count
        const dashboard = this.dashboards.find(d => d.id === dashboardId);
        if (dashboard) {
          dashboard.widgetCount++;
          this.dashboardsSubject.next(this.dashboards);
        }
      })
    );
  }

  getDashboardWidgets(dashboardId: number): Observable<DashboardWidgetResponse[]> {
    return this.apiService.getDashboardWidgets(dashboardId).pipe(
      map(response => response.data)
    );
  }

  removeWidgetFromDashboard(dashboardId: number, widgetId: number): Observable<void> {
    return this.apiService.removeWidgetFromDashboard(dashboardId, widgetId).pipe(
      map(response => response.data),
      tap(() => {
        // Refresh the current dashboard to get updated widget count
        const dashboard = this.dashboards.find(d => d.id === dashboardId);
        if (dashboard) {
          dashboard.widgetCount = Math.max(0, dashboard.widgetCount - 1);
          this.dashboardsSubject.next(this.dashboards);
        }
      })
    );
  }

  updateDashboardWidgetLayout(dashboardId: number, dashboardWidgetId: number, request: UpdateDashboardWidgetLayoutRequest): Observable<DashboardWidgetResponse> {
    return this.apiService.updateDashboardWidgetLayout(dashboardId, dashboardWidgetId, request).pipe(
      map(response => response.data)
    );
  }

  searchDashboards(query: string): Dashboard[] {
    if (!query.trim()) {
      return this.dashboards;
    }
    
    const searchTerm = query.toLowerCase();
    return this.dashboards.filter(dashboard =>
      dashboard.name.toLowerCase().includes(searchTerm) ||
      dashboard.description.toLowerCase().includes(searchTerm)
    );
  }

  getDashboardsByCategory(category: 'personal' | 'shared' | 'default' | 'all'): Dashboard[] {
    if (category === 'all') {
      return this.dashboards;
    }
    return this.dashboards.filter(dashboard => dashboard.category === category);
  }

  getFavoriteDashboards(): Dashboard[] {
    return this.dashboards.filter(dashboard => dashboard.isFavorite);
  }

  getRecentDashboards(limit: number = 3): Dashboard[] {
    return this.dashboards
      .filter(d => !d.isSelected)
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
      .slice(0, limit);
  }

  // Widget Data Methods
  getWidgetData(request: WidgetDataRequest): Observable<WidgetDataResponse> {
    return this.apiService.getWidgetData(request).pipe(
      catchError(error => {
        console.error('Error fetching widget data:', error);
        // Return an error response rather than throwing
        const errorResponse: WidgetDataResponse = {
          widgetId: request.widgetId,
          dataSource: request.dataSource || 'unknown',
          chartType: 'unknown',
          data: null,
          metadata: {
            totalRecords: 0,
            fieldNames: [],
            aggregationType: 'none',
            groupBy: [],
            measures: [],
            filters: {},
            executionTimeMs: 0
          },
          lastUpdated: new Date().toISOString(),
          success: false,
          errorMessage: error.message || 'Failed to fetch widget data'
        };
        return of(errorResponse);
      })
    );
  }

  // Convenience method to get widget data by widget ID only
  getWidgetDataById(widgetId: number): Observable<WidgetDataResponse> {
    const request: WidgetDataRequest = {
      widgetId: widgetId
      // Other parameters will be filled from widget configuration in the backend
    };
    return this.getWidgetData(request);
  }

  // Open edit dashboard dialog
  openEditDashboardDialog(dashboard: Dashboard): void {
    const dialogRef = this.dialog.open(CreateDashboardDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      height: 'auto',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: false,
      closeOnNavigation: true,
      hasBackdrop: true,
      panelClass: ['create-dashboard-dialog-container', 'centered-dialog-pane'],
      backdropClass: 'create-dashboard-backdrop',
      restoreFocus: true,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      position: {},
      data: {
        mode: 'edit',
        dashboard: dashboard
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        console.log('Dashboard updated:', result);
        // Refresh dashboards to get updated data
        this.refreshDashboards().subscribe();
      }
    });
  }
}
