import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  DashboardSummaryResponse,
  DashboardResponse,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  AddWidgetToDashboardRequest,
  DashboardWidgetResponse,
  WidgetResponse,
  WidgetLibraryResponse,
  CreateWidgetRequest,
  UpdateWidgetRequest,
  UpdateDashboardWidgetLayoutRequest,
  ChartConfigResponse,
  DashboardDatasourceConfigResponse,
  Queue,
  ChartType,
  QueueType,
  WidgetDataRequest,
  WidgetDataResponse,
  WidgetCreationConfigResponse
} from '../models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  private currentUser: { userId: string; departmentId: string; } | undefined;
  
  constructor(private http: HttpClient) {
    this.loadUserFromSession();
  }


 /**
   * Reads user from sessionStorage synchronously.
   * If not present, tries API and saves it.
   */
 private loadUserFromSession(): void {
  const sessionUserInfo = JSON.parse(sessionStorage.getItem('userInfo') || 'null');
  if (sessionUserInfo && sessionUserInfo.id) {
    // Set userId from session storage loginId
    const userId = sessionUserInfo.loginId || 'anonymous';
    
    // Fetch user's departments from API
    this.getUserDepartments(sessionUserInfo.id).subscribe({
      next: (departments) => {
        const departmentId = departments.length > 0 ? departments[0].id : 'default';
        this.currentUser = { userId, departmentId };
      },
      error: (err) => {
        console.warn('Failed to fetch user departments, using default', err);
        this.currentUser = { userId, departmentId: 'default' };
      }
    });
  } else {
    // fallback: request from API and save
    this.getUserInfo().pipe(
      tap((userInfo: { id?: string; loginId?: string; username?: string; }) => {
        if (userInfo) {
          const userId = userInfo.loginId || userInfo.username || 'anonymous';
          if (userInfo.id) {
            // Fetch departments for this user
            this.getUserDepartments(userInfo.id).subscribe({
              next: (departments) => {
                const departmentId = departments.length > 0 ? departments[0].id : 'default';
                this.currentUser = { userId, departmentId };
              },
              error: () => {
                this.currentUser = { userId, departmentId: 'default' };
              }
            });
          } else {
            this.currentUser = { userId, departmentId: 'default' };
          }
          sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
        }
      })
    ).subscribe({
      error: err => {
        console.warn('Failed to fetch user info, using defaults', err);
        this.currentUser = { userId: 'anonymous', departmentId: 'default' };
      }
    });
  }
}

private getUserInfo(): Observable<any> {
  return this.http.get(`/portal/user-info`)
    .pipe(catchError(this.handleError));
}

private getAllDepartments(): Observable<any[]> {
  return this.http.get<any[]>(`/admin/departments`)
    .pipe(catchError(this.handleError));
}

private getUserDepartments(userId: string): Observable<any[]> {
  return this.http.get<any[]>(`/admin/users/${userId}/departments`)
    .pipe(catchError(this.handleError));
}

// Public methods for components to use
public getAllUsersForAdmin(payload: any): Observable<any> {
  const params = new HttpParams()
    .set('page', '0')
    .set('size', '10')
    .set('orderByColumn', '')
    .set('orderDir', '')
    .set('includeAll', 'true');
  
  return this.http.post<any>(`/admin/users/search`, payload, { params })
    .pipe(catchError(this.handleError));
}

public getAllDepartmentsForAdmin(): Observable<any[]> {
  return this.http.get<any[]>(`/admin/departments`)
    .pipe(catchError(this.handleError));
}

public searchUsersByName(username: string): Observable<any[]> {
  const params = new HttpParams().set('type', 'BANK');
  return this.http.get<any[]>(`/admin/v1/user/search/userName:${username}`, { params })
    .pipe(catchError(this.handleError));
}

private getCurrentUser(): { userId: string; departmentId: string } {
  return this.currentUser || { userId: 'anonymous', departmentId: 'default' };
}


  // Widget Creation Configuration API
  getWidgetCreationConfig(): Observable<ApiResponse<WidgetCreationConfigResponse>> {
    return this.http.get<ApiResponse<WidgetCreationConfigResponse>>(`${this.apiUrl}/portal/config/widget-creation-config`)
      .pipe(catchError(this.handleError));
  }

  // Dashboard APIs
  getAllDashboards(): Observable<ApiResponse<DashboardSummaryResponse[]>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.get<ApiResponse<DashboardSummaryResponse[]>>(`${this.apiUrl}/portal/dashboards`, { params })
      .pipe(catchError(this.handleError));
  }

  getDashboardById(id: number): Observable<ApiResponse<DashboardResponse>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.get<ApiResponse<DashboardResponse>>(`${this.apiUrl}/portal/dashboards/${id}`, { params })
      .pipe(catchError(this.handleError));
  }

  createDashboard(request: CreateDashboardRequest): Observable<ApiResponse<DashboardResponse>> {
    const user = this.getCurrentUser();
    const params = new HttpParams().set('userId', user.userId);
    
    return this.http.post<ApiResponse<DashboardResponse>>(`${this.apiUrl}/portal/dashboards`, request, { params })
      .pipe(catchError(this.handleError));
  }

  updateDashboard(id: number, request: UpdateDashboardRequest): Observable<ApiResponse<DashboardResponse>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.put<ApiResponse<DashboardResponse>>(`${this.apiUrl}/portal/dashboards/${id}`, request, { params })
      .pipe(catchError(this.handleError));
  }

  publishDashboard(id: number): Observable<ApiResponse<DashboardResponse>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.post<ApiResponse<DashboardResponse>>(`${this.apiUrl}/portal/dashboards/${id}/publish`, null, { params })
      .pipe(catchError(this.handleError));
  }

  setDefaultDashboard(id: number): Observable<ApiResponse<void>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/portal/dashboards/${id}/default`, null, { params })
      .pipe(catchError(this.handleError));
  }

  deleteDashboard(id: number): Observable<ApiResponse<void>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/portal/dashboards/${id}`, { params })
      .pipe(catchError(this.handleError));
  }

  getDashboardWidgets(dashboardId: number): Observable<ApiResponse<DashboardWidgetResponse[]>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.get<ApiResponse<DashboardWidgetResponse[]>>(`${this.apiUrl}/portal/dashboards/${dashboardId}/widgets`, { params })
      .pipe(catchError(this.handleError));
  }

  addWidgetToDashboard(dashboardId: number, request: AddWidgetToDashboardRequest): Observable<ApiResponse<DashboardWidgetResponse>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.post<ApiResponse<DashboardWidgetResponse>>(`${this.apiUrl}/portal/dashboards/${dashboardId}/widgets`, request, { params })
      .pipe(catchError(this.handleError));
  }

  removeWidgetFromDashboard(dashboardId: number, dashboardWidgetId: number): Observable<ApiResponse<void>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/portal/dashboards/${dashboardId}/widgets/${dashboardWidgetId}`, { params })
      .pipe(catchError(this.handleError));
  }

  updateDashboardWidgetLayout(dashboardId: number, dashboardWidgetId: number, request: UpdateDashboardWidgetLayoutRequest): Observable<ApiResponse<DashboardWidgetResponse>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);

    return this.http.put<ApiResponse<DashboardWidgetResponse>>(`${this.apiUrl}/portal/dashboards/${dashboardId}/widgets/${dashboardWidgetId}/layout`, request, { params })
      .pipe(catchError(this.handleError));
  }

  // Widget APIs
  getAllWidgets(): Observable<ApiResponse<WidgetResponse[]>> {
    const user = this.getCurrentUser();
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    return this.http.get<ApiResponse<WidgetResponse[]>>(`${this.apiUrl}/portal/widgets`, { params })
      .pipe(catchError(this.handleError));
  }

  // Widget Library with usage information
  getWidgetLibrary(dashboardId?: number): Observable<ApiResponse<WidgetLibraryResponse[]>> {
    const user = this.getCurrentUser();
    let params = new HttpParams()
      .set('userId', user.userId)
      .set('departmentId', user.departmentId);
    
    if (dashboardId) {
      params = params.set('dashboardId', dashboardId.toString());
    }
    
    return this.http.get<ApiResponse<WidgetLibraryResponse[]>>(`${this.apiUrl}/portal/widgets/library`, { params })
      .pipe(catchError(this.handleError));
  }

  getWidgetById(id: number): Observable<ApiResponse<WidgetResponse>> {
    return this.http.get<ApiResponse<WidgetResponse>>(`${this.apiUrl}/portal/widgets/${id}`)
      .pipe(catchError(this.handleError));
  }

  createWidget(request: CreateWidgetRequest): Observable<ApiResponse<WidgetResponse>> {
    const user = this.getCurrentUser();
    const params = new HttpParams().set('userId', user.userId);
    
    return this.http.post<ApiResponse<WidgetResponse>>(`${this.apiUrl}/portal/widgets`, request, { params })
      .pipe(catchError(this.handleError));
  }

  updateWidget(id: number, request: UpdateWidgetRequest): Observable<ApiResponse<WidgetResponse>> {
    const user = this.getCurrentUser();
    const params = new HttpParams().set('userId', user.userId);
    
    return this.http.put<ApiResponse<WidgetResponse>>(`${this.apiUrl}/portal/widgets/${id}`, request, { params })
      .pipe(catchError(this.handleError));
  }

  deleteWidget(id: number): Observable<ApiResponse<void>> {
    const user = this.getCurrentUser();
    const params = new HttpParams().set('userId', user.userId);
    
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/portal/widgets/${id}`, { params })
      .pipe(catchError(this.handleError));
  }

  getWidgetsByChartType(chartType: ChartType): Observable<ApiResponse<WidgetResponse[]>> {
    const params = new HttpParams().set('chartType', chartType);
    
    return this.http.get<ApiResponse<WidgetResponse[]>>(`${this.apiUrl}/portal/widgets/by-chart-type`, { params })
      .pipe(catchError(this.handleError));
  }

  getWidgetsByDataSource(dataSource: string): Observable<ApiResponse<WidgetResponse[]>> {
    const params = new HttpParams().set('dataSource', dataSource);
    
    return this.http.get<ApiResponse<WidgetResponse[]>>(`${this.apiUrl}/portal/widgets/by-data-source`, { params })
      .pipe(catchError(this.handleError));
  }

  searchWidgets(name: string): Observable<ApiResponse<WidgetResponse[]>> {
    const params = new HttpParams().set('name', name);
    
    return this.http.get<ApiResponse<WidgetResponse[]>>(`${this.apiUrl}/portal/widgets/search`, { params })
      .pipe(catchError(this.handleError));
  }

  getMyWidgets(): Observable<ApiResponse<WidgetResponse[]>> {
    const user = this.getCurrentUser();
    const params = new HttpParams().set('userId', user.userId);
    
    return this.http.get<ApiResponse<WidgetResponse[]>>(`${this.apiUrl}/portal/widgets/my-widgets`, { params })
      .pipe(catchError(this.handleError));
  }

  getWidgetData(request: WidgetDataRequest): Observable<WidgetDataResponse> {
    return this.http.post<WidgetDataResponse>(`${this.apiUrl}/portal/widgets/data`, request)
      .pipe(catchError(this.handleError));
  }

  // Configuration APIs
  getAllChartConfigs(): Observable<ApiResponse<ChartConfigResponse[]>> {
    return this.http.get<ApiResponse<ChartConfigResponse[]>>(`${this.apiUrl}/portal/config/chart-configs`)
      .pipe(catchError(this.handleError));
  }

  getChartConfigByType(chartType: ChartType): Observable<ApiResponse<ChartConfigResponse>> {
    return this.http.get<ApiResponse<ChartConfigResponse>>(`${this.apiUrl}/portal/config/chart-configs/${chartType}`)
      .pipe(catchError(this.handleError));
  }

  getAllDatasourceConfigs(): Observable<ApiResponse<DashboardDatasourceConfigResponse[]>> {
    return this.http.get<ApiResponse<DashboardDatasourceConfigResponse[]>>(`${this.apiUrl}/portal/config/datasource-configs`)
      .pipe(catchError(this.handleError));
  }

  getDatasourceConfigsByAppCode(appCode: string): Observable<ApiResponse<DashboardDatasourceConfigResponse[]>> {
    return this.http.get<ApiResponse<DashboardDatasourceConfigResponse[]>>(`${this.apiUrl}/portal/config/datasource-configs/app/${appCode}`)
      .pipe(catchError(this.handleError));
  }

  getDatasourceConfig(appCode: string, dataSourceName: string): Observable<ApiResponse<DashboardDatasourceConfigResponse>> {
    return this.http.get<ApiResponse<DashboardDatasourceConfigResponse>>(`${this.apiUrl}/portal/config/datasource-configs/${appCode}/${dataSourceName}`)
      .pipe(catchError(this.handleError));
  }

  getAllQueues(): Observable<ApiResponse<Queue[]>> {
    return this.http.get<ApiResponse<Queue[]>>(`${this.apiUrl}/portal/config/queues`)
      .pipe(catchError(this.handleError));
  }

  getQueuesByAppCode(appCode: string): Observable<ApiResponse<Queue[]>> {
    return this.http.get<ApiResponse<Queue[]>>(`${this.apiUrl}/portal/config/queues/app/${appCode}`)
      .pipe(catchError(this.handleError));
  }

  getQueuesByType(queueType: QueueType): Observable<ApiResponse<Queue[]>> {
    return this.http.get<ApiResponse<Queue[]>>(`${this.apiUrl}/portal/config/queues/type/${queueType}`)
      .pipe(catchError(this.handleError));
  }

  getQueueByCode(queueCode: string): Observable<ApiResponse<Queue>> {
    return this.http.get<ApiResponse<Queue>>(`${this.apiUrl}/portal/config/queues/${queueCode}`)
      .pipe(catchError(this.handleError));
  }

  // Error handling
  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
