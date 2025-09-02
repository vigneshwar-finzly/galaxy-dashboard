import { Component, HostListener, OnInit, AfterViewInit, OnDestroy, Inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../services/theme.service';
import { DashboardService } from '../../services/dashboard.service';
import { LoadingService } from '../../services/loading.service';
import { CreateDashboardRequest, ViewerType, EditorType } from '../../models/dashboard.models';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule],
  selector: 'app-create-dashboard',
  templateUrl: './create-dashboard.component.html',
  styleUrls: ['./create-dashboard.component.scss']
})
export class CreateDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() dashboardCreated = new EventEmitter<any>();
  
  dashboardName: string = '';
  dashboardDescription: string = '';

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

  // Avatar color cache to ensure consistent colors for each user
  private avatarColorCache: Map<string, { background: string; textColor: string }> = new Map();

  // Mock data
  mockUsers = [
    { id: 'u1', name: 'Vinay Suryawanshi', department: 'Payment' },
    { id: 'u2', name: 'Vigneshwar Rajendran', department: 'Admin' },
    { id: 'u3', name: 'Vijayaragavan', department: 'BankOS' },
    { id: 'u4', name: 'Nagul V', department: 'Cashos' },
    { id: 'u5', name: 'Booshan Rengachari', department: 'FX' },
    { id: 'u6', name: 'Guman pratap singh', department: 'FW' },
    { id: 'u7', name: 'Dhanush Kumar', department: 'ACHOperations' },
    { id: 'u8', name: 'Dhayananth', department: 'InstantPayments' },
    { id: 'u9', name: 'Santhosh', department: 'NOSTRO' },
    { id: 'u10', name: 'Vijayashankar', department: 'Platform' },
    { id: 'u11', name: 'Nandhakumar', department: 'QADepartment' },
    { id: 'u12', name: 'Gokul', department: 'WireOperations' }
  ];

  mockDepartments = [
    { id: 'd1', name: 'ACHOperations', description: 'ACH Operations' },
    { id: 'd2', name: 'Admin', description: 'Admin1' },
    { id: 'd3', name: 'BankOS', description: 'Chetan4535' },
    { id: 'd4', name: 'Cashos', description: 'Cashos' },
    { id: 'd5', name: 'CorpSec', description: 'Corporate Security' },
    { id: 'd6', name: 'ForeignExchange', description: 'Foreign Exchange' },
    { id: 'd7', name: 'FW', description: 'Wires' },
    { id: 'd8', name: 'FX', description: 'FX' },
    { id: 'd9', name: 'InstantPayments', description: 'FedNow and RTP Payments' },
    { id: 'd10', name: 'NOSTRO', description: 'Nostro Settlements' },
    { id: 'd11', name: 'Payment', description: 'Payment' },
    { id: 'd12', name: 'Platform', description: 'Platform Apps' },
    { id: 'd13', name: 'QADepartment', description: 'QA' },
    { id: 'd14', name: 'R01', description: 'R01' },
    { id: 'd15', name: 'R02', description: 'R02' },
    { id: 'd16', name: 'R03', description: 'R03' },
    { id: 'd17', name: 'SuperUser', description: 'SuperUser' },
    { id: 'd18', name: 'test123456', description: 'test123456' },
    { id: 'd19', name: 'TestDepartment', description: 'for testing purpose' },
    { id: 'd20', name: 'TestHeimDall', description: 'testheimdall' },
    { id: 'd21', name: 'WireOperations', description: 'Wire Room' }
  ];

  // Selected items
  selectedUsers: { id: string; name: string }[] = [];
  selectedDepartments: { id: string; name: string }[] = [];
  selectedEditorUsers: { id: string; name: string }[] = [];
  selectedEditorDepartments: { id: string; name: string }[] = [];

  // Search terms
  usersSearchTerm: string = '';
  departmentsSearchTerm: string = '';
  editorsUsersSearchTerm: string = '';
  editorsDepartmentsSearchTerm: string = '';

  // Dropdown states
  isUsersDropdownOpen: boolean = false;
  isDepartmentsDropdownOpen: boolean = false;
  isEditorsUsersDropdownOpen: boolean = false;
  isEditorsDepartmentsDropdownOpen: boolean = false;

  constructor(
    private themeService: ThemeService,
    @Inject(DOCUMENT) private document: Document,
    private dashboardService: DashboardService,
    public loadingService: LoadingService
  ) {}

  ngOnInit() {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.themeChanges$.subscribe(palette => {
      if (palette) {
        // Theme changed - component will automatically adapt via CSS variables
        console.log('Theme changed to:', palette.name);
      }
    });
    console.log('CreateDashboardComponent initialized');
    
    // Debug: Check if form inputs are properly bound
    setTimeout(() => {
      console.log('Dashboard name input:', this.dashboardName);
      console.log('Dashboard description input:', this.dashboardDescription);
      
      // Check if the component properties are properly initialized
      console.log('Component properties:', {
        dashboardName: this.dashboardName,
        dashboardDescription: this.dashboardDescription,
        viewer: this.viewer
      });
    }, 100);
  }

  ngAfterViewInit() {
    // Component initialization logic
    
    // Debug: Add event listeners to input fields
    setTimeout(() => {
      const nameInput = document.getElementById('dashboardName');
      const descInput = document.getElementById('dashboardDescription');
      
      console.log('Found name input:', nameInput);
      console.log('Found description input:', descInput);
      
      if (nameInput) {
        nameInput.addEventListener('click', (e) => {
          console.log('Name input clicked:', e);
          e.stopPropagation();
        });
        nameInput.addEventListener('focus', (e) => {
          console.log('Name input focused:', e);
        });
        nameInput.addEventListener('input', (e) => {
          console.log('Name input changed:', (e.target as HTMLInputElement).value);
        });
      }
      
      if (descInput) {
        descInput.addEventListener('click', (e) => {
          console.log('Description input clicked:', e);
          e.stopPropagation();
        });
        descInput.addEventListener('focus', (e) => {
          console.log('Description input focused:', e);
        });
        descInput.addEventListener('input', (e) => {
          console.log('Description input changed:', (e.target as HTMLTextAreaElement).value);
        });
      }
    }, 200);
  }

  // Filtered lists
  get filteredMockUsers() {
    return this.mockUsers.filter(user =>
      user.name.toLowerCase().includes(this.usersSearchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(this.usersSearchTerm.toLowerCase())
    );
  }

  get filteredMockDepartments() {
    return this.mockDepartments.filter(dept =>
      dept.name.toLowerCase().includes(this.departmentsSearchTerm.toLowerCase()) ||
      dept.description.toLowerCase().includes(this.departmentsSearchTerm.toLowerCase())
    );
  }

  get filteredEditorUsers() {
    return this.mockUsers.filter(user =>
      user.name.toLowerCase().includes(this.editorsUsersSearchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(this.editorsUsersSearchTerm.toLowerCase())
    );
  }

  get filteredEditorDepartments() {
    return this.mockDepartments.filter(dept =>
      dept.name.toLowerCase().includes(this.editorsDepartmentsSearchTerm.toLowerCase()) ||
      dept.description.toLowerCase().includes(this.editorsDepartmentsSearchTerm.toLowerCase())
    );
  }

  // Helper methods
  getUserName(userId: string): string {
    const user = this.mockUsers.find(u => u.id === userId);
    return user ? user.name : '';
  }

  getUserInitials(userId: string): string {
    const user = this.mockUsers.find(u => u.id === userId);
    if (!user) return '';
    
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.name[0].toUpperCase();
  }

  getDepartmentName(deptId: string): string {
    const dept = this.mockDepartments.find(d => d.id === deptId);
    return dept ? dept.name : '';
  }

  // Avatar color generation methods
  getUserAvatarColor(userId: string): string {
    if (!this.avatarColorCache.has(userId)) {
      const colors = [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
        '#14B8A6', '#F43F5E', '#A855F7', '#EAB308', '#22C55E',
        '#F97316', '#06B6D4', '#8B5CF6', '#EF4444', '#10B981',
        '#3B82F6', '#F59E0B', '#EC4899', '#84CC16', '#6366F1'
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const textColor = this.getContrastColor(randomColor);
      
      this.avatarColorCache.set(userId, {
        background: randomColor,
        textColor: textColor
      });
    }
    
    return this.avatarColorCache.get(userId)!.background;
  }

  getUserAvatarTextColor(userId: string): string {
    if (!this.avatarColorCache.has(userId)) {
      // Generate color if not cached
      this.getUserAvatarColor(userId);
    }
    
    return this.avatarColorCache.get(userId)!.textColor;
  }

  private getContrastColor(hexColor: string): string {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance using the sRGB formula
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    
    // Return black for light colors, white for dark colors
    // Using a threshold of 0.5 for better contrast
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  // Check if editors section should be disabled
  get isEditorsDisabled(): boolean {
    return this.viewer === 'Private';
  }

  // Filter methods
  filterUsers() {
    // This method is called when searching users
    // The filtering is handled by the getter filteredMockUsers
  }

  filterDepartments() {
    // This method is called when searching departments
    // The filtering is handled by the getter filteredMockDepartments
  }

  filterEditors() {
    // This method is called when searching editor users and departments
    // The filtering is handled by the getters filteredEditorUsers and filteredEditorDepartments
  }

  toggleDropdown(type: 'users' | 'departments' | 'editorsUsers' | 'editorsDepartments') {
    // Close all other dropdowns
    this.isUsersDropdownOpen = false;
    this.isDepartmentsDropdownOpen = false;
    this.isEditorsUsersDropdownOpen = false;
    this.isEditorsDepartmentsDropdownOpen = false;

    // Open the selected dropdown
    switch (type) {
      case 'users':
        this.isUsersDropdownOpen = true;
        break;
      case 'departments':
        this.isDepartmentsDropdownOpen = true;
        break;
      case 'editorsUsers':
        this.isEditorsUsersDropdownOpen = true;
        break;
      case 'editorsDepartments':
        this.isEditorsDepartmentsDropdownOpen = true;
        break;
    }
  }

  toggleSelection(item: any, type: 'user' | 'department' | 'editorUser' | 'editorDepartment', event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }

    switch (type) {
      case 'user':
        const userIndex = this.selectedUsers.findIndex(u => u.id === item.id);
        if (userIndex > -1) {
          this.selectedUsers.splice(userIndex, 1);
        } else {
          this.selectedUsers.push({ id: item.id, name: item.name });
        }
        break;
      case 'department':
        const deptIndex = this.selectedDepartments.findIndex(d => d.id === item.id);
        if (deptIndex > -1) {
          this.selectedDepartments.splice(deptIndex, 1);
        } else {
          this.selectedDepartments.push({ id: item.id, name: item.name });
        }
        break;
      case 'editorUser':
        const editorUserIndex = this.selectedEditorUsers.findIndex(u => u.id === item.id);
        if (editorUserIndex > -1) {
          this.selectedEditorUsers.splice(editorUserIndex, 1);
        } else {
          this.selectedEditorUsers.push({ id: item.id, name: item.name });
        }
        break;
      case 'editorDepartment':
        const editorDeptIndex = this.selectedEditorDepartments.findIndex(d => d.id === item.id);
        if (editorDeptIndex > -1) {
          this.selectedEditorDepartments.splice(editorDeptIndex, 1);
        } else {
          this.selectedEditorDepartments.push({ id: item.id, name: item.name });
        }
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Don't close dropdowns if clicking on form inputs
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    if (!target.closest('#usersDropdown')) this.isUsersDropdownOpen = false;
    if (!target.closest('#departmentsDropdown')) this.isDepartmentsDropdownOpen = false;
    if (!target.closest('#editorsUsersDropdown')) this.isEditorsUsersDropdownOpen = false;
    if (!target.closest('#editorsDepartmentsDropdown')) this.isEditorsDepartmentsDropdownOpen = false;
  }

  onViewerChange() {
    this.selectedUsers = [];
    this.selectedDepartments = [];
    this.usersSearchTerm = '';
    this.departmentsSearchTerm = '';
    this.isUsersDropdownOpen = false;
    this.isDepartmentsDropdownOpen = false;
    
    // If viewer is set to Private, reset editor to Private and clear selections
    if (this.viewer === 'Private') {
      this.editor = 'Private';
      this.selectedEditorUsers = [];
      this.selectedEditorDepartments = [];
      this.editorsUsersSearchTerm = '';
      this.editorsDepartmentsSearchTerm = '';
      this.isEditorsUsersDropdownOpen = false;
      this.isEditorsDepartmentsDropdownOpen = false;
    }
  }

  onEditorChange() {
    this.selectedEditorUsers = [];
    this.selectedEditorDepartments = [];
    this.editorsUsersSearchTerm = '';
    this.editorsDepartmentsSearchTerm = '';
    this.isEditorsUsersDropdownOpen = false;
    this.isEditorsDepartmentsDropdownOpen = false;
  }

  createDashboard() {
    if (!this.canCreateDashboard()) {
      return;
    }

    const request: CreateDashboardRequest = {
      name: this.dashboardName,
      description: this.dashboardDescription,
      viewerType: this.mapViewerType(this.viewer),
      editorType: this.mapEditorType(this.editor),
      viewerUserIds: this.selectedUsers.map(u => u.id),
      viewerDepartmentIds: this.selectedDepartments.map(d => d.id),
      editorUserIds: this.selectedEditorUsers.map(u => u.id),
      editorDepartmentIds: this.selectedEditorDepartments.map(d => d.id)
    };

    this.dashboardService.createDashboard(request).subscribe({
      next: (dashboard) => {
        console.log('Dashboard created successfully:', dashboard);
        this.dashboardCreated.emit(dashboard);
        this.resetForm();
      },
      error: (error) => {
        console.error('Failed to create dashboard:', error);
      }
    });
  }

  private canCreateDashboard(): boolean {
    return !!(this.dashboardName?.trim());
  }

  private mapViewerType(viewer: string): ViewerType {
    switch (viewer.toLowerCase()) {
      case 'private': return ViewerType.PRIVATE;
      case 'users': return ViewerType.USERS;
      case 'department': return ViewerType.DEPARTMENT;
      case 'global': return ViewerType.GLOBAL;
      default: return ViewerType.PRIVATE;
    }
  }

  private mapEditorType(editor: string): EditorType {
    switch (editor.toLowerCase()) {
      case 'private': return EditorType.PRIVATE;
      case 'users': return EditorType.USERS;
      case 'department': return EditorType.DEPARTMENT;
      case 'global': return EditorType.GLOBAL;
      default: return EditorType.PRIVATE;
    }
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
  }

  trackById(index: number, item: any): string {
    return typeof item === 'object' ? item.id : item;
  }

  isSelected(type: 'user' | 'department' | 'editorUser' | 'editorDepartment', item: any): boolean {
    switch (type) {
      case 'user':
        return this.selectedUsers.some(u => u.id === item.id);
      case 'department':
        return this.selectedDepartments.some(d => d.id === item.id);
      case 'editorUser':
        return this.selectedEditorUsers.some(u => u.id === item.id);
      case 'editorDepartment':
        return this.selectedEditorDepartments.some(d => d.id === item.id);
      default:
        return false;
    }
  }

  ngOnDestroy(): void {
    // Clean up theme subscription
    this.themeSubscription.unsubscribe();
  }
}