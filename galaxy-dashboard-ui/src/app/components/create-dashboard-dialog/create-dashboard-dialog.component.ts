import { Component, HostListener, OnInit, AfterViewInit, OnDestroy, Inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ThemeService } from '../../services/theme.service';
import { DashboardService } from '../../services/dashboard.service';
import { LoadingService } from '../../services/loading.service';
import { ApiService } from '../../services/api.service';
import { CreateDashboardRequest, ViewerType, EditorType } from '../../models/dashboard.models';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule],
  selector: 'app-create-dashboard-dialog',
  templateUrl: './create-dashboard-dialog.component.html',
  styleUrls: ['./create-dashboard-dialog.component.scss']
})
export class CreateDashboardDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() dashboardCreated = new EventEmitter<any>();
  
  dashboardName: string = '';
  dashboardDescription: string = '';

  // Mode and dashboard data
  mode: 'create' | 'edit' = 'create';
  dashboardId?: number;
  originalDashboard?: any;

  // Sharing state
  viewer: string = 'Private';
  editor: string = 'Private';
  sharingType: 'users' | 'departments' | 'both' = 'users';

  // Computed property to check if any dropdown is open
  get isAnyDropdownOpen(): boolean {
    return this.isUsersDropdownOpen || this.isDepartmentsDropdownOpen || 
           this.isEditorsUsersDropdownOpen || this.isEditorsDepartmentsDropdownOpen;
  }

  // Theme subscription
  private themeSubscription: Subscription = new Subscription();

  // User selection state
  selectedUsers: any[] = [];
  selectedDepartments: any[] = [];
  selectedEditorUsers: any[] = [];
  selectedEditorDepartments: any[] = [];

  // Dropdown state
  isUsersDropdownOpen = false;
  isDepartmentsDropdownOpen = false;
  isEditorsUsersDropdownOpen = false;
  isEditorsDepartmentsDropdownOpen = false;

  // Search terms
  usersSearchTerm = '';
  departmentsSearchTerm = '';
  editorsUsersSearchTerm = '';
  editorsDepartmentsSearchTerm = '';

  // Filtered data
  filteredUsers: any[] = [];
  filteredDepartments: any[] = [];
  filteredEditorUsers: any[] = [];
  filteredEditorDepartments: any[] = [];

  // API data
  allUsers: any[] = [];
  allDepartments: any[] = [];

  // Type-ahead search
  private userSearchSubject = new Subject<string>();
  private editorUserSearchSubject = new Subject<string>();
  isSearchingUsers = false;
  isSearchingEditorUsers = false;

  // Computed property for editors disabled state
  get isEditorsDisabled(): boolean {
    return this.viewer === 'Private';
  }

  constructor(
    public dialogRef: MatDialogRef<CreateDashboardDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    @Inject(DOCUMENT) private document: Document,
    private themeService: ThemeService,
    private dashboardService: DashboardService,
    private loadingService: LoadingService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Check if we're in edit mode
    if (this.data?.mode === 'edit' && this.data?.dashboard) {
      this.mode = 'edit';
      this.originalDashboard = this.data.dashboard;
      this.initializeEditMode();
    }

    // Load initial data from API
    this.loadUsersAndDepartments();

    // Set up type-ahead search for users
    this.setupTypeAheadSearch();

    // Add class to body to trigger z-index overrides - use setTimeout to avoid layout thrashing
    setTimeout(() => {
      this.document.body.classList.add('dialog-open');
    }, 0);

    // Subscribe to theme changes
    this.themeSubscription.add(
      this.themeService.themeChanges$.subscribe((theme: any) => {
        if (theme) {
          this.document.body.className = this.document.body.className.replace(/theme-\w+/g, '');
          this.document.body.classList.add(`theme-${theme.id}`);
        }
      })
    );
  }

  private setupTypeAheadSearch(): void {
    // Set up type-ahead search for viewer users
    this.themeSubscription.add(
      this.userSearchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(searchTerm => {
          if (searchTerm.length >= 3) {
            this.isSearchingUsers = true;
            return this.apiService.searchUsersByName(searchTerm);
          } else {
            this.isSearchingUsers = false;
            return [];
          }
        })
      ).subscribe({
        next: (users) => {
          this.isSearchingUsers = false;
          this.allUsers = users || [];
          this.filterUsers();
        },
        error: (error) => {
          this.isSearchingUsers = false;
          console.error('Failed to search users:', error);
        }
      })
    );

    // Set up type-ahead search for editor users
    this.themeSubscription.add(
      this.editorUserSearchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(searchTerm => {
          if (searchTerm.length >= 3) {
            this.isSearchingEditorUsers = true;
            return this.apiService.searchUsersByName(searchTerm);
          } else {
            this.isSearchingEditorUsers = false;
            return [];
          }
        })
      ).subscribe({
        next: (users) => {
          this.isSearchingEditorUsers = false;
          this.allUsers = users || [];
          this.filterEditors();
        },
        error: (error) => {
          this.isSearchingEditorUsers = false;
          console.error('Failed to search editor users:', error);
        }
      })
    );
  }

  private loadUsersAndDepartments(): void {
    // Only load departments initially - users will be loaded via type-ahead search
    this.apiService.getAllDepartmentsForAdmin().subscribe({
      next: (departments) => {
        this.allDepartments = departments || [];
        this.filterDepartments();
        this.filterEditors();
      },
      error: (error) => {
        console.error('Failed to load departments:', error);
        this.allDepartments = [];
      }
    });

    // Initialize empty user arrays - they'll be populated via type-ahead search
    this.allUsers = [];
    this.filteredUsers = [];
    this.filteredEditorUsers = [];
  }

  ngAfterViewInit(): void {
    // Any post-view initialization if needed
  }

  ngOnDestroy(): void {
    // Remove class from body when dialog is destroyed
    this.document.body.classList.remove('dialog-open');
    this.themeSubscription.unsubscribe();
    
    // Clean up type-ahead search subjects
    this.userSearchSubject.complete();
    this.editorUserSearchSubject.complete();
  }

  // Host listener for ESC key to close dropdowns
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isAnyDropdownOpen) {
      this.closeAllDropdowns();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // Host listener for clicks outside dropdowns
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Check if click is on dropdown backdrop (the ::before pseudo-element doesn't trigger events, 
    // so we check if click is outside dropdown panel content)
    const dropdownPanel = target.closest('.dropdown-panel');
    const dropdownInput = target.closest('.selection-input-container');
    
    // If click is not on a dropdown panel and not on a dropdown input, close all dropdowns
    if (!dropdownPanel && !dropdownInput) {
      this.closeAllDropdowns();
    }
    
    // Also check specific dropdown containers for traditional dropdown behavior
    const dropdownIds = ['usersDropdown', 'departmentsDropdown', 'editorsUsersDropdown', 'editorsDepartmentsDropdown'];
    let isClickInsideAnyDropdown = false;

    for (const id of dropdownIds) {
      const dropdown = this.document.getElementById(id);
      if (dropdown && dropdown.contains(target)) {
        isClickInsideAnyDropdown = true;
        break;
      }
    }

    if (!isClickInsideAnyDropdown && !dropdownPanel && !dropdownInput) {
      this.closeAllDropdowns();
    }
  }

  // Method to close all dropdowns
  closeAllDropdowns(): void {
    this.isUsersDropdownOpen = false;
    this.isDepartmentsDropdownOpen = false;
    this.isEditorsUsersDropdownOpen = false;
    this.isEditorsDepartmentsDropdownOpen = false;
  }

  // Toggle dropdown methods
  toggleDropdown(type: 'users' | 'departments' | 'editorsUsers' | 'editorsDepartments'): void {
    // Close all other dropdowns first
    this.closeAllDropdowns();
    
    // Open the requested dropdown
    switch (type) {
      case 'users':
        this.isUsersDropdownOpen = !this.isUsersDropdownOpen;
        break;
      case 'departments':
        this.isDepartmentsDropdownOpen = !this.isDepartmentsDropdownOpen;
        break;
      case 'editorsUsers':
        this.isEditorsUsersDropdownOpen = !this.isEditorsUsersDropdownOpen;
        break;
      case 'editorsDepartments':
        this.isEditorsDepartmentsDropdownOpen = !this.isEditorsDepartmentsDropdownOpen;
        break;
    }
  }

  // Filter methods
  filterUsers(): void {
    const term = this.usersSearchTerm.toLowerCase();
    
    // Trigger type-ahead search if term is 3+ characters
    if (this.usersSearchTerm.length >= 3) {
      this.userSearchSubject.next(this.usersSearchTerm);
    } else if (this.usersSearchTerm.length === 0) {
      // Clear users when search is cleared
      this.allUsers = [];
      this.filteredUsers = [];
      return;
    }
    
    // Filter current users list
    this.filteredUsers = this.allUsers.filter(user => {
      const fullName = (user.fullName || '').toLowerCase();
      const firstName = (user.firstName || '').toLowerCase();
      const lastName = (user.lastName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const loginId = (user.loginId || '').toLowerCase();
      return fullName.includes(term) || firstName.includes(term) || 
             lastName.includes(term) || email.includes(term) || loginId.includes(term);
    });
  }

  filterDepartments(): void {
    const term = this.departmentsSearchTerm.toLowerCase();
    this.filteredDepartments = this.allDepartments.filter(dept =>
      (dept.name || '').toLowerCase().includes(term) ||
      (dept.code || '').toLowerCase().includes(term)
    );
  }

  filterEditors(): void {
    // Filter editor users
    const userTerm = this.editorsUsersSearchTerm.toLowerCase();
    
    // Trigger type-ahead search for editor users if term is 3+ characters
    if (this.editorsUsersSearchTerm.length >= 3) {
      this.editorUserSearchSubject.next(this.editorsUsersSearchTerm);
    } else if (this.editorsUsersSearchTerm.length === 0) {
      // Clear editor users when search is cleared
      this.filteredEditorUsers = [];
      return;
    }
    
    this.filteredEditorUsers = this.allUsers.filter(user => {
      const fullName = (user.fullName || '').toLowerCase();
      const firstName = (user.firstName || '').toLowerCase();
      const lastName = (user.lastName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const loginId = (user.loginId || '').toLowerCase();
      return fullName.includes(userTerm) || firstName.includes(userTerm) || 
             lastName.includes(userTerm) || email.includes(userTerm) || loginId.includes(userTerm);
    });

    // Filter editor departments
    const deptTerm = this.editorsDepartmentsSearchTerm.toLowerCase();
    this.filteredEditorDepartments = this.allDepartments.filter(dept =>
      (dept.name || '').toLowerCase().includes(deptTerm) ||
      (dept.code || '').toLowerCase().includes(deptTerm)
    );
  }



  // Selection methods
  toggleSelection(item: any, type: 'user' | 'department' | 'editorUser' | 'editorDepartment', event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    switch (type) {
      case 'user':
        const userIndex = this.selectedUsers.findIndex(u => u.userId === item.userId);
        if (userIndex > -1) {
          this.selectedUsers.splice(userIndex, 1);
        } else {
          this.selectedUsers.push(item);
        }
        break;
      case 'department':
        const deptIndex = this.selectedDepartments.findIndex(d => d.code === item.code);
        if (deptIndex > -1) {
          this.selectedDepartments.splice(deptIndex, 1);
        } else {
          this.selectedDepartments.push(item);
        }
        break;
      case 'editorUser':
        const editorUserIndex = this.selectedEditorUsers.findIndex(u => u.userId === item.userId);
        if (editorUserIndex > -1) {
          this.selectedEditorUsers.splice(editorUserIndex, 1);
        } else {
          this.selectedEditorUsers.push(item);
        }
        break;
      case 'editorDepartment':
        const editorDeptIndex = this.selectedEditorDepartments.findIndex(d => d.code === item.code);
        if (editorDeptIndex > -1) {
          this.selectedEditorDepartments.splice(editorDeptIndex, 1);
        } else {
          this.selectedEditorDepartments.push(item);
        }
        break;
    }
  }

  isSelected(type: 'user' | 'department' | 'editorUser' | 'editorDepartment', item: any): boolean {
    switch (type) {
      case 'user':
        return this.selectedUsers.some(u => u.userId === item.userId);
      case 'department':
        return this.selectedDepartments.some(d => d.code === item.code);
      case 'editorUser':
        return this.selectedEditorUsers.some(u => u.userId === item.userId);
      case 'editorDepartment':
        return this.selectedEditorDepartments.some(d => d.code === item.code);
      default:
        return false;
    }
  }

  // Helper methods
  trackById(index: number, item: any): any {
    return item.userId || item.code || item.id || index;
  }

  getUserInitials(userId: string): string {
    const user = this.allUsers.find(u => u.userId === userId);
    if (!user) return '';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  getUserAvatarColor(userId: string): string {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
      '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6'
    ];
    // Use a simple hash of the userId string to get consistent colors
    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  getUserAvatarTextColor(userId: string): string {
    return '#ffffff';
  }

  getUserDisplayName(user: any): string {
    // Use fullName from API response, fallback to constructed name or loginId
    return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.loginId || 'Unknown User';
  }

  getUserSubtitle(user: any): string {
    return user.email || user.loginId || '';
  }

  // Viewer/Editor change handlers
  onViewerChange(): void {
    // Clear editor selections if viewer becomes Private
    if (this.viewer === 'Private') {
      this.editor = 'Private';
      this.selectedEditorUsers = [];
      this.selectedEditorDepartments = [];
    }
    
    // Close dropdowns
    this.isUsersDropdownOpen = false;
    this.isDepartmentsDropdownOpen = false;
  }

  onEditorChange(): void {
    // Close dropdowns
    this.isEditorsUsersDropdownOpen = false;
    this.isEditorsDepartmentsDropdownOpen = false;
  }

  // Mapping methods
  private mapViewerType(viewer: string): ViewerType {
    switch (viewer) {
      case 'Private': return ViewerType.PRIVATE;
      case 'Global': return ViewerType.GLOBAL;
      case 'Shared': 
        // When shared is selected, we determine the type based on what's selected
        if (this.selectedUsers.length > 0 && this.selectedDepartments.length > 0) {
          return ViewerType.USERS; // Default to USERS when both are selected
        } else if (this.selectedDepartments.length > 0) {
          return ViewerType.DEPARTMENT;
        } else {
          return ViewerType.USERS;
        }
      default: return ViewerType.PRIVATE;
    }
  }

  private mapEditorType(editor: string): EditorType {
    switch (editor) {
      case 'Private': return EditorType.PRIVATE;
      case 'Global': return EditorType.GLOBAL;
      case 'Shared': 
        // When shared is selected, we determine the type based on what's selected
        if (this.selectedEditorUsers.length > 0 && this.selectedEditorDepartments.length > 0) {
          return EditorType.USERS; // Default to USERS when both are selected
        } else if (this.selectedEditorDepartments.length > 0) {
          return EditorType.DEPARTMENT;
        } else {
          return EditorType.USERS;
        }
      default: return EditorType.PRIVATE;
    }
  }

  createDashboard(): void {
    if (!this.canCreateDashboard()) {
      return;
    }

    if (this.mode === 'edit') {
      this.updateDashboard();
    } else {
      this.createNewDashboard();
    }
  }

  private createNewDashboard(): void {
    const request: CreateDashboardRequest = {
      name: this.dashboardName,
      description: this.dashboardDescription,
      viewerType: this.mapViewerType(this.viewer),
      editorType: this.mapEditorType(this.editor),
      viewerUserIds: this.selectedUsers.map(u => u.userId),
      viewerDepartmentIds: this.selectedDepartments.map(d => d.code),
      editorUserIds: this.selectedEditorUsers.map(u => u.userId),
      editorDepartmentIds: this.selectedEditorDepartments.map(d => d.code)
    };

    this.dashboardService.createDashboard(request).subscribe({
      next: (dashboard) => {
        console.log('Dashboard created successfully:', dashboard);
        this.dialogRef.close(dashboard);
        this.resetForm();
      },
      error: (error) => {
        console.error('Failed to create dashboard:', error);
      }
    });
  }

  private updateDashboard(): void {
    if (!this.dashboardId) {
      console.error('Dashboard ID is missing for update');
      return;
    }

    const request: any = {
      name: this.dashboardName,
      description: this.dashboardDescription,
      viewerType: this.mapViewerType(this.viewer),
      editorType: this.mapEditorType(this.editor),
      viewerUserIds: this.selectedUsers.map(u => u.userId),
      viewerDepartmentIds: this.selectedDepartments.map(d => d.code),
      editorUserIds: this.selectedEditorUsers.map(u => u.userId),
      editorDepartmentIds: this.selectedEditorDepartments.map(d => d.code)
    };

    this.dashboardService.updateDashboard(this.dashboardId, request).subscribe({
      next: (dashboard) => {
        console.log('Dashboard updated successfully:', dashboard);
        this.dialogRef.close(dashboard);
      },
      error: (error) => {
        console.error('Failed to update dashboard:', error);
      }
    });
  }

  private initializeEditMode(): void {
    if (!this.originalDashboard) return;

    // Set basic properties
    this.dashboardId = this.originalDashboard.id;
    this.dashboardName = this.originalDashboard.name || '';
    this.dashboardDescription = this.originalDashboard.description || '';
    
    // Map viewer type
    this.viewer = this.mapViewerTypeToString(this.originalDashboard.viewerType);
    this.editor = this.mapEditorTypeToString(this.originalDashboard.editorType);

    // TODO: Load existing permissions and populate selected users/departments
    // This would require additional API calls to get the current permissions
  }

  private mapViewerTypeToString(viewerType: any): string {
    switch (viewerType) {
      case 'USERS': return 'Shared';
      case 'DEPARTMENT': return 'Shared';
      case 'GLOBAL': return 'Global';
      case 'PRIVATE': 
      default: return 'Private';
    }
  }

  private mapEditorTypeToString(editorType: any): string {
    switch (editorType) {
      case 'USERS': return 'Shared';
      case 'DEPARTMENT': return 'Shared';
      case 'GLOBAL': return 'Global';
      case 'PRIVATE': 
      default: return 'Private';
    }
  }

  private canCreateDashboard(): boolean {
    return !!(this.dashboardName?.trim());
  }

  private resetForm(): void {
    this.dashboardName = '';
    this.dashboardDescription = '';
    this.viewer = 'Private';
    this.editor = 'Private';
    this.selectedUsers = [];
    this.selectedDepartments = [];
    this.selectedEditorUsers = [];
    this.selectedEditorDepartments = [];
    this.closeAllDropdowns();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Handle backdrop click to close dialog
  onBackdropClick(event: Event): void {
    this.dialogRef.close();
  }
}
