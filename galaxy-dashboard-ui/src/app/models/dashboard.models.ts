// Dashboard Models matching backend DTOs

export interface DashboardSummaryResponse {
  id: number;
  name: string;
  description: string;
  viewerType: ViewerType;
  status: DashboardStatus;
  isSystemDashboard: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdDateTime: string;
  updatedDateTime?: string;
  totalWidgets: number;
}

export interface DashboardResponse {
  totalWidgets: number;
  id: number;
  name: string;
  description: string;
  viewerType: ViewerType;
  editorType: EditorType;
  status: DashboardStatus;
  isSystemDashboard: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  updatedBy?: string;
  createdDateTime: string;
  updatedDateTime?: string;
  userPermissions?: DashboardUserPermissionResponse[];
  widgets?: DashboardWidgetResponse[];
}

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  viewerType: ViewerType;
  editorType: EditorType;
  viewerUserIds?: string[];
  viewerDepartmentIds?: string[];
  editorUserIds?: string[];
  editorDepartmentIds?: string[];
}

export interface UpdateDashboardRequest {
  name: string;
  description?: string;
  viewerType: ViewerType;
  editorType: EditorType;
  viewerUserIds?: string[];
  viewerDepartmentIds?: string[];
  editorUserIds?: string[];
  editorDepartmentIds?: string[];
}

export interface DashboardUserPermissionResponse {
  id: number;
  userId?: string;
  departmentId?: string;
  permissionType: PermissionType;
  createdDateTime: string;
  createdBy: string;
}

export interface DashboardWidgetResponse {
  id: number;
  dashboardId: number;
  widgetId: number;
  widget: WidgetResponse;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  widgetOrder: number;
  layoutConfig?: string;
  createdDateTime: string;
  createdBy: string;
}

export interface AddWidgetToDashboardRequest {
  widgetId: number;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  layoutConfig?: string;
}

export interface UpdateDashboardWidgetLayoutRequest {
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  widgetOrder?: number;
  layoutConfig?: string;
}

// Enums
export enum ViewerType {
  PRIVATE = 'PRIVATE',
  USERS = 'USERS',
  DEPARTMENT = 'DEPARTMENT',
  GLOBAL = 'GLOBAL'
}

export enum EditorType {
  PRIVATE = 'PRIVATE',
  USERS = 'USERS',
  DEPARTMENT = 'DEPARTMENT',
  GLOBAL = 'GLOBAL'
}

export enum DashboardStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED'
}

export enum PermissionType {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR'
}

// Widget Models
export interface WidgetResponse {
  id: number;
  name: string;
  description?: string;
  chartType: ChartType;
  dataSource: string;
  refreshInterval: number;
  groupFields?: string;
  measureFields?: string;
  filterCriteria?: string;
  searchFields?: string;
  widgetConfig?: string;
  createdBy: string;
  updatedBy?: string;
  createdDateTime: string;
  updatedDateTime?: string;
  // New fields for widget data
  widgetData?: { [key: string]: any };
  dataLoadSuccess?: boolean;
  dataLoadError?: string;
}

export interface WidgetLibraryResponse {
  id: number;
  name: string;
  description?: string;
  chartType: ChartType;
  dataSource: string;
  refreshInterval: number;
  createdBy: string;
  createdDateTime: string;
  updatedDateTime?: string;
  // Usage information
  usageCount: number;
  isInUse: boolean;
  isInCurrentDashboard: boolean;
  usedInDashboards: DashboardUsageInfo[];
}

export interface DashboardUsageInfo {
  dashboardId: number;
  dashboardName: string;
  dashboardDescription?: string;
  isCurrentDashboard: boolean;
}

export interface CreateWidgetRequest {
  name: string;
  description?: string;
  chartType: ChartType;
  dataSource: string;
  refreshInterval?: number;
  groupFields?: string;
  measureFields?: string;
  filterCriteria?: string;
  widgetConfig?: string;
  searchFields?: string;
}

export interface UpdateWidgetRequest {
  name: string;
  description?: string;
  chartType: ChartType;
  dataSource: string;
  refreshInterval?: number;
  groupFields?: string;
  measureFields?: string;
  filterCriteria?: string;
  widgetConfig?: string;
  searchFields?: string;
}

export enum ChartType {
  TABLE = 'TABLE',
  PIE = 'PIE',
  DONUT = 'DONUT',
  VERTICAL_BAR = 'VERTICAL_BAR',
  HORIZONTAL_BAR = 'HORIZONTAL_BAR',
  COUNT = 'COUNT',
  LINE_CHART = 'LINE_CHART',
  AREA_CHART = 'AREA_CHART',
  RADAR_CHART = 'RADAR_CHART'
}

// Configuration Models
export interface ChartConfigResponse {
  id: number;
  chartType: ChartType;
  fieldRules: string;
  uiConstraints?: string;
  displayConfig?: string;
  createdDateTime: string;
  createdBy: string;
}

export interface DashboardDatasourceConfigResponse {
  id: string;
  name: string;
  appCode: string;
  displayName: string;
  description: string;
  tableName: string;
  searchFields?: string;
  groupFields?: string;
  measureFields?: string;
  createdDateTime: string;
  updatedDateTime?: string;
  createdBy: string;
  updatedBy?: string;
}

// Widget Creation Configuration
export interface WidgetCreationConfigResponse {
  dataSources: DataSourceWithCharts[];
}

export interface DataSourceWithCharts {
  appCode: string;
  configs: DataSourceConfig[];
  availableCharts: ChartConfigResponse[];
}

export interface DataSourceConfig {
  name: string;
  description: string;
  searchFields: SearchField[];
  groupFields: GroupField[];
  measureFields: MeasureField[];
}

export interface SearchField {
  name: string;
  type: 'Text' | 'List' | 'DateRange';
  column: string;
  valueType: 'Rest' | '';
  value: string;
}

export interface GroupField {
  name: string;
  column: string;
}

export interface MeasureField {
  name: string;
  column: string;
  measure: string[];
}

export interface Queue {
  id: number;
  queueName: string;
  queueCode: string;
  description?: string;
  queueType: QueueType;
  appCode: string;
  priority: number;
  queueConfig?: string;
  createdDateTime: string;
  createdBy: string;
  isActive: boolean;
}

export enum QueueType {
  PAYMENT = 'PAYMENT',
  VALIDATION = 'VALIDATION',
  CALLBACK = 'CALLBACK',
  REPAIR = 'REPAIR',
  EXCEPTION = 'EXCEPTION',
  APPROVAL = 'APPROVAL',
  GENERAL = 'GENERAL'
}

// API Response wrapper
export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

// Widget Data Models
export interface WidgetDataRequest {
  widgetId: number;
  searchFields?: string;
  groupFields?: string;
  measureFields?: string;
  measures?: string;
  dataSource?: string;
  appCode?: string;
}

export interface WidgetDataResponse {
  widgetId: number;
  dataSource: string;
  chartType: string;
  data: any;
  metadata: WidgetMetadata;
  lastUpdated: string;
  success: boolean;
  errorMessage?: string;
}

export interface WidgetMetadata {
  totalRecords: number;
  fieldNames: string[];
  aggregationType: string;
  groupBy: string[];
  measures: string[];
  filters: { [key: string]: any };
  executionTimeMs: number;
}

// Frontend-specific models (for compatibility with existing components)
export interface Dashboard {
  id: number;
  name: string;
  description: string;
  category: 'personal' | 'shared' | 'default';
  isFavorite: boolean;
  isSelected: boolean;
  lastAccessed: Date;
  widgetCount: number;
  color: string;
  icon: string;
  widgets: any[];
  layout: any[];
}

// Conversion utilities
export function mapDashboardResponseToDashboard(response: any): Dashboard {
  return {
    id: typeof response.id === 'string' ? parseInt(response.id, 10) : response.id,
    name: response.name,
    description: response.description,
    category: response.viewerType === ViewerType.GLOBAL ? 'default' :
              response.viewerType === ViewerType.PRIVATE ? 'personal' : 'shared',
    isFavorite: response.isDefault, // Map default to favorite for now
    isSelected: false,
    lastAccessed: new Date(response.updatedDateTime || response.createdDateTime),
    widgetCount: response.totalWidgets,
    color: getColorForCategory(response.viewerType),
    icon: getIconForDashboard(response.name),
    widgets: [],
    layout: []
  };
}

function getColorForCategory(viewerType: ViewerType): string {
  switch (viewerType) {
    case ViewerType.GLOBAL: return '#40916c';
    case ViewerType.PRIVATE: return '#52b788';
    case ViewerType.DEPARTMENT: return '#74c69d';
    default: return '#95d5b2';
  }
}

function getIconForDashboard(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('bank') || lowerName.includes('finance')) return '🏦';
  if (lowerName.includes('sales')) return '📊';
  if (lowerName.includes('operation')) return '⚙️';
  if (lowerName.includes('customer')) return '👥';
  if (lowerName.includes('marketing')) return '📈';
  return '📋';
}
