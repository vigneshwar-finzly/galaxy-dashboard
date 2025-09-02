import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { 
  DashboardDatasourceConfigResponse, 
  ChartConfigResponse,
  WidgetCreationConfigResponse 
} from '../models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {

  constructor(private apiService: ApiService) {}

  // Get combined widget creation configuration
  getWidgetCreationConfig(): Observable<WidgetCreationConfigResponse> {
    return this.apiService.getWidgetCreationConfig().pipe(
      map(response => response.data)
    );
  }

  // Get all datasource configurations
  getAllDatasourceConfigs(): Observable<DashboardDatasourceConfigResponse[]> {
    return this.apiService.getAllDatasourceConfigs().pipe(
      map(response => response.data)
    );
  }

  // Get datasource configurations by app code
  getDatasourceConfigsByAppCode(appCode: string): Observable<DashboardDatasourceConfigResponse[]> {
    return this.apiService.getDatasourceConfigsByAppCode(appCode).pipe(
      map(response => response.data)
    );
  }

  // Get datasource configuration by app code and name
  getDatasourceConfig(appCode: string, dataSourceName: string): Observable<DashboardDatasourceConfigResponse> {
    return this.apiService.getDatasourceConfig(appCode, dataSourceName).pipe(
      map(response => response.data)
    );
  }

  // Get all chart configurations
  getAllChartConfigs(): Observable<ChartConfigResponse[]> {
    return this.apiService.getAllChartConfigs().pipe(
      map(response => response.data)
    );
  }

  // Get available data sources
  getAvailableDataSources(): Observable<string[]> {
    return this.getAllDatasourceConfigs().pipe(
      map(configs => [...new Set(configs.map(config => config.name))])
    );
  }

  // Get datasource fields
  getDataSourceFields(dataSource: string): Observable<any> {
    return this.getAllDatasourceConfigs().pipe(
      map(configs => {
        const config = configs.find(c => c.name === dataSource);
        if (config) {
          return {
            searchFields: config.searchFields ? JSON.parse(config.searchFields) : [],
            groupFields: config.groupFields ? JSON.parse(config.groupFields) : [],
            measureFields: config.measureFields ? JSON.parse(config.measureFields) : [],
            tableName: config.tableName,
            description: config.description
          };
        }
        return null;
      })
    );
  }
}
