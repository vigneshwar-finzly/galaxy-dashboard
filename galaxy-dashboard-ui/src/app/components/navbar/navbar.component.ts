import { Component, ElementRef, HostListener, OnInit, ViewChild, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { Subscription } from 'rxjs';
import { WidgetAccordionService } from '../../services/widget-accordion.service';
import { DashboardService } from '../../services/dashboard.service';
import { ThemeService, ThemePalette } from '../../services/theme.service';
import { NotificationService } from '../../services/notification.service';
import { CreateDashboardDialogComponent } from '../create-dashboard-dialog/create-dashboard-dialog.component';
import { CreateWidgetComponent } from '../create-widget/create-widget.component';
import { CreateWidgetDialogComponent } from '../create-widget-dialog/create-widget-dialog.component';
import { ManageDashboardDialogComponent } from '../manage-dashboard-dialog/manage-dashboard-dialog.component';
import { WidgetLibraryDialogComponent } from '../widget-library-dialog/widget-library-dialog.component';
// import { DashboardService } from '../../services/dashboard.service';
import { Dashboard } from '../../models/dashboard.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  active?: boolean;
  description?: string;
}

interface ThemeOption {
  id: string;
  label: string;
  description: string;
  colorClass: string;
}

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule],
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() componentSelected = new EventEmitter<string>();
  dropdownOpen = false;
  dashboardListOpen = false;
  selectedDashboard: number = 0; // Default selected dashboard
  searchQuery: string = '';
  notificationsCount: number = 3; // Example notification count
  actionDropdownOpen = false;
  
  // Scroll detection
  isScrolled = false;
  
  // Fullscreen detection
  isFullscreen = false;
  
  // Navigation items from sidebar
  navItems: NavItem[] = [
    { 
      id: 'dashboard',
      label: 'Dashboard', 
      icon: 'chart-line', 
      route: 'dashboard', 
      active: true,
      description: 'Overview and analytics'
    },
    { 
      id: 'create-dashboard',
      label: 'Create Dashboard', 
      icon: 'plus-square', 
      route: 'create-dashboard',
      description: 'Start a new dashboard'
    },
    { 
      id: 'manage-dashboard',
      label: 'Manage Dashboard', 
      icon: 'edit', 
      route: 'manage-dashboard',
      description: 'Edit, remove, and organize widgets'
    },
    { 
      id: 'manage-widget',
      label: 'Manage Widgets', 
      icon: 'chart-mixed', 
      route: 'manage-widget',
      description: 'Create, edit, and organize widgets'
    }
  ];

  // Theme functionality
  themeDropdownOpen = false;
  themeOptions: ThemeOption[] = [
    { 
      id: 'azureSkies', 
      label: 'Azure Skies',
      description: 'Soft blue with airy gradients',
      colorClass: 'bg-gradient-to-br from-blue-400 to-blue-600'
    },
    { 
      id: 'evergreenForest', 
      label: 'Evergreen Forest',
      description: 'Calm greens with depth',
      colorClass: 'bg-gradient-to-br from-green-400 to-green-600'
    },
    { 
      id: 'coralSunset', 
      label: 'Coral Sunset',
      description: 'Warm coral with modern edge',
      colorClass: 'bg-gradient-to-br from-red-400 to-red-600'
    },
    { 
      id: 'deepOcean', 
      label: 'Deep Ocean',
      description: 'Indigo-blue with depth',
      colorClass: 'bg-gradient-to-br from-indigo-400 to-indigo-600'
    },
    { 
      id: 'twilightPlum', 
      label: 'Twilight Plum',
      description: 'Purple mystery with elegance',
      colorClass: 'bg-gradient-to-br from-purple-400 to-purple-600'
    }
  ];

  // Mobile menu
  mobileMenuOpen = false;
  
  // Dashboard selector functionality
  isDashboardSelectorExpanded = false;
  selectedDashboardCategory: 'all' | 'favorites' | 'personal' | 'shared' | 'default' = 'all';
  dashboards: Dashboard[] = [];
  filteredDashboards: Dashboard[] = [];
  recentDashboards: Dashboard[] = [];
  favoriteDashboards: Dashboard[] = [];
  currentDashboard: Dashboard | null = null;
  isLoadingDashboards = false;
  personalDashboardsCount = 0;
  sharedDashboardsCount = 0;
  
  // Subscriptions
  private subscription: Subscription = new Subscription();

  @ViewChild('dropdownWrapper') dropdownWrapper!: ElementRef;
  @ViewChild('hubspotDropdownWrapper') hubspotDropdownWrapper!: ElementRef;
  @ViewChild('selectorContainer') selectorContainer!: ElementRef;
  @ViewChild('searchInput') searchInput!: ElementRef;

  // Data for dashboards - you'd likely fetch this from a service
  recentlyViewedDashboards: string[] = [
    'Test Dashboard',
    'BankOS Performance Overview'
  ];

   allDashboards: string[] = [
    'Test Dashboard',
    'BankOS Performance Overview',
    'Sales Dashboard',
    'Operations Dashboard',
    'Finance Dashboard',
    'Customer Support Metrics',
    'Product Analytics',
    'Website Traffic',
    'Social Media Insights',
    'HR Dashboard'
  ];

  myDashboards: string[] = [
    'Marketing Performance Overview',
    'Test Dashboard',
    'Sales Dashboard',
    'Operations Dashboard'
  ];

  favoritedDashboards: Set<string> = new Set<string>(); // To store favorited dashboards

  hoveredDashboard: string | null = null;
  defaultDashboards: string[] = [];
  privateDashboards: string[] = [];
  sharedDashboards: string[] = [];
  singleFavoriteDashboard: string | null = null;

  isFavorited: boolean = false; // For the star icon next to the selected dashboard name

  constructor(
    private dialog: MatDialog,
    private overlay: Overlay,
    private widgetAccordionService: WidgetAccordionService,
    private dashboardService: DashboardService,
    private themeService: ThemeService,
    private notificationService: NotificationService,
    private elementRef: ElementRef
  ) { }

  ngOnInit(): void {
    // Initialize theme from storage
    this.themeService.initFromStorage();
    
    // Subscribe to dashboard changes from the service
    this.subscription.add(
      this.dashboardService.dashboards$.subscribe(dashboards => {
        this.dashboards = dashboards;
        this.allDashboards = dashboards.map(d => d.name);
        this.myDashboards = dashboards.filter(d => d.category === 'personal').map(d => d.name);
        this.recentlyViewedDashboards = dashboards
          .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
          .slice(0, 3)
          .map(d => d.name);
        
        this.filterDashboards();
        this.updateRecentAndFavorites();
        this.updateDashboardCounts();
        
        // Update categorized dashboards
        this.defaultDashboards = dashboards.filter(d => d.category === 'default').map(d => d.name);
        this.privateDashboards = dashboards.filter(d => d.category === 'personal').map(d => d.name);
        this.sharedDashboards = dashboards.filter(d => d.category === 'shared').map(d => d.name);
      })
    );

    // Subscribe to current dashboard changes
    this.subscription.add(
      this.dashboardService.currentDashboard$.subscribe(dashboard => {
        this.currentDashboard = dashboard;
        if (dashboard) {
          this.selectedDashboard = dashboard.id;
          this.isFavorited = dashboard.isFavorite;
        }
      })
    );

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
    });

    this.filterDashboards();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Scroll detection
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 10;
  }

  // Navigation methods from sidebar
  setActiveItem(itemId: string): void {
    console.log("=== NAVBAR NAVIGATION ===");
    console.log("Setting active item:", itemId);
    
    // Handle special cases that open dialogs instead of navigation
    if (itemId === 'manage-widget') {
      this.openWidgetLibraryDialog();
      // Close mobile menu if open
      if (this.mobileMenuOpen) {
        this.toggleMobileMenu();
      }
      return;
    }
    
    // Remove active from all items
    this.navItems.forEach(item => item.active = false);

    // Set active for selected item
    const item = this.navItems.find(i => i.id === itemId);
    if (item) {
      item.active = true;
      console.log("Found item:", item);
      console.log("Emitting route:", item.route);
      // Emit the component selection event
      this.componentSelected.emit(item.route);
    }

    // Close mobile menu after navigation
    if (this.mobileMenuOpen) {
      this.toggleMobileMenu();
    }
  }

  // Check if navigation item is active
  isActiveItem(itemId: string): boolean {
    const item = this.navItems.find(i => i.id === itemId);
    return item ? (item.active || false) : false;
  }

  // Theme methods
  toggleThemeDropdown(): void {
    this.themeDropdownOpen = !this.themeDropdownOpen;
  }

  onThemeSelect(themeId: string): void {
    console.log('Theme clicked:', themeId);
    this.themeDropdownOpen = false;
    
    // Apply the selected theme
    this.themeService.applyTheme(themeId);
  }

  // Mobile menu methods
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  // Dashboard selector methods
  toggleDashboardSelector(): void {
    this.isDashboardSelectorExpanded = !this.isDashboardSelectorExpanded;
    if (this.isDashboardSelectorExpanded) {
      setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      }, 100);
    }
  }

  filterDashboards(): void {
    let filtered = this.dashboards;

    if (this.searchQuery.trim()) {
      filtered = this.dashboardService.searchDashboards(this.searchQuery);
    }

    if (this.selectedDashboardCategory !== 'all') {
      if (this.selectedDashboardCategory === 'favorites') {
        filtered = filtered.filter(d => d.isFavorite);
      } else {
        filtered = filtered.filter(dashboard => dashboard.category === this.selectedDashboardCategory);
      }
    }

    this.filteredDashboards = filtered;
  }

  applyDashboardCategory(category: 'all' | 'favorites' | 'personal' | 'shared' | 'default'): void {
    this.selectedDashboardCategory = category;
    this.filterDashboards();
  }

  updateRecentAndFavorites(): void {
    this.recentDashboards = this.dashboardService.getRecentDashboards(3);
    this.favoriteDashboards = this.dashboardService.getFavoriteDashboards();
  }

  updateDashboardCounts(): void {
    this.personalDashboardsCount = this.dashboards.filter(d => d.category === 'personal').length;
    this.sharedDashboardsCount = this.dashboards.filter(d => d.category === 'shared').length;
  }

  selectDashboard(dashboard: Dashboard): void {
    this.dashboardService.switchDashboard(dashboard.id);
    this.isDashboardSelectorExpanded = false;
    this.notificationService.success('Dashboard Switched', `Switched to ${dashboard.name}`);
  }

  toggleFavorite(dashboard: Dashboard, event: Event): void {
    event.stopPropagation();
    this.dashboardService.toggleFavorite(dashboard.id);
    
    // Show feedback
    const isNowFavorite = !dashboard.isFavorite;
    const message = isNowFavorite ? `Added ${dashboard.name} to favorites` : `Removed ${dashboard.name} from favorites`;
    this.notificationService.success('Favorites Updated', message);
  }

  toggleCurrentDashboardFavorite(event: Event): void {
    event.stopPropagation();
    if (this.currentDashboard) {
      this.dashboardService.toggleFavorite(this.currentDashboard.id);
      
      // Show feedback
      const isNowFavorite = !this.currentDashboard.isFavorite;
      const message = isNowFavorite ? `Added ${this.currentDashboard.name} to favorites` : `Removed ${this.currentDashboard.name} from favorites`;
      this.notificationService.success('Favorites Updated', message);
    }
  }

  displayCategoryName(category: string): string {
    switch (category) {
      case 'personal': return 'Private';
      case 'shared': return 'Shared';
      case 'default': return 'Global';
      default: return 'All';
    }
  }

  // Actions methods (moved from dashboard selector)
  editCurrentDashboard(): void {
    this.actionDropdownOpen = false;
    if (this.currentDashboard) {
      this.dashboardService.openEditDashboardDialog(this.currentDashboard);
    }
  }

  setAsDefaultDashboard(): void {
    this.actionDropdownOpen = false;
    const current = this.currentDashboard;
    if (current) {
      localStorage.setItem('ngfd_default_dashboard_id', current.id.toString());
      this.notificationService.success('Default Dashboard', `${current.name} set as default`);
    }
  }

  // New action methods for simplified dropdown
  duplicateDashboard(): void {
    this.actionDropdownOpen = false;
    const current = this.currentDashboard;
    if (current) {
      console.log('Duplicating dashboard:', current.name);
      // Create a copy of the current dashboard
      const duplicateName = `${current.name} (Copy)`;
      const duplicateData = {
        name: duplicateName,
        description: current.description || '',
        widgets: current.widgets || [],
        layout: current.layout || {},
        category: 'personal'
      };
      
      // Use existing create dashboard method
      this.dashboardService.createDashboard(duplicateData as any).subscribe({
        next: (newDashboard: any) => {
          this.notificationService.success('Dashboard Duplicated', `${current.name} has been duplicated as ${duplicateName}`);
        },
        error: (error: any) => {
          console.error('Error duplicating dashboard:', error);
          this.notificationService.error('Duplicate Failed', 'Failed to duplicate dashboard');
        }
      });
    }
  }

  exportDashboard(): void {
    this.actionDropdownOpen = false;
    const current = this.currentDashboard;
    if (current) {
      console.log('Exporting dashboard:', current.name);
      // Create a downloadable JSON file
      const dashboardData = {
        name: current.name,
        widgets: current.widgets || [],
        layout: current.layout || {},
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(dashboardData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${current.name.replace(/\s+/g, '_')}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      this.notificationService.success('Dashboard Exported', `${current.name} has been exported successfully`);
    }
  }

  shareDashboard(): void {
    this.actionDropdownOpen = false;
    const current = this.currentDashboard;
    if (current) {
      console.log('Sharing dashboard:', current.name);
      // Generate shareable link
      const shareLink = `${window.location.origin}/dashboard/${current.id}`;
      
      // Copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareLink).then(() => {
          this.notificationService.success('Dashboard Shared', `${current.name} sharing link copied to clipboard`);
        }).catch(() => {
          this.notificationService.error('Share Failed', 'Failed to copy link to clipboard');
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          this.notificationService.success('Dashboard Shared', `${current.name} sharing link copied to clipboard`);
        } catch (err) {
          this.notificationService.error('Share Failed', 'Failed to copy link to clipboard');
        }
        document.body.removeChild(textArea);
      }
    }
  }

  // Icon mapping method from sidebar
  getIconClass(icon: string): string {
    const iconMap: { [key: string]: string } = {
      // Main
      'chart-line': 'chart-line',
      'plus-square': 'plus-square',
      'chart-bar': 'chart-bar',
      'edit': 'edit',
      'ellipsis-h': 'ellipsis-h',
      'bolt': 'bolt',
      'palette': 'palette',
      'chart-mixed': 'th',

      // Theme icons
      'info-circle': 'info-circle',
      'history': 'history',
      'expand': 'expand',
      'sync': 'sync',
      'thumbtack': 'thumbtack',
      'trash-alt': 'trash-alt',

      // UI
      'chevron-down': 'chevron-down',
      'chevron-right': 'chevron-right',
      'bars': 'bars',
      'x': 'times',
      'user-circle': 'user-circle',
      'sign-out': 'sign-out-alt',

      // Default
      'circle': 'circle'
    };
    const mappedIcon = iconMap[icon] || 'circle';
    return `fas fa-${mappedIcon}`;
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  setOnlyFavorite(dashboard: string): void {
    if (this.defaultDashboards.includes(dashboard)) {
      this.singleFavoriteDashboard = dashboard;
    }
  }

  isDashboardFavorited(dashboard: string): boolean {
    return this.singleFavoriteDashboard === dashboard;
  }

  closeDashboardList(): void {
    this.dashboardListOpen = false;
  }

  openAddDashboardDialog(): void {
    this.dialog.open(CreateDashboardDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      height: 'auto',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: false, // Allow closing with ESC and backdrop click
      closeOnNavigation: true, // Close when navigating
      hasBackdrop: true, // Show backdrop
      panelClass: ['create-dashboard-dialog-container', 'centered-dialog-pane'],
      backdropClass: 'create-dashboard-backdrop', // Custom backdrop class
      restoreFocus: true, // Restore focus when closed
      position: {
        // Remove specific positioning to let flexbox centering work
      }
    }).afterClosed().subscribe((result: any) => {
      if (result) {
        console.log('Dashboard created:', result);
        // Optionally reload dashboards or update the current view
      }
    });
  }

  openAddWidgetDialog(): void {
    const dialogRef = this.dialog.open(CreateWidgetDialogComponent, {
      width: '1200px',
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
      data: {}
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        console.log('Widget created:', result);
      }
    });
  }

  openWidgetLibraryDialog(): void {
    this.dialog.open(WidgetLibraryDialogComponent, {
      width: '90vw',
      maxWidth: '1400px',
      height: 'auto',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: false, // Allow closing with ESC and backdrop click
      closeOnNavigation: true, // Close when navigating
      hasBackdrop: true, // Show backdrop
      panelClass: ['create-dashboard-dialog-container', 'centered-dialog-pane'],
      backdropClass: 'create-dashboard-backdrop', // Use same backdrop class as other dialogs
      restoreFocus: true, // Restore focus when closed
      position: {
        // Remove specific positioning to let flexbox centering work
      },
      data: {
        currentDashboard: this.currentDashboard
      }
    }).afterClosed().subscribe((result: any) => {
      if (result) {
        console.log('Widget library dialog closed with result:', result);
      }
    });
  }

  openManageDashboardDialog(): void {
    const current = this.dashboardService.getCurrentDashboard();
    this.dialog.open(ManageDashboardDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      height: '85vh',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: false,
      panelClass: 'create-dashboard-dialog-container',
      backdropClass: 'create-dashboard-backdrop',
      data: { currentDashboard: current }
    });
  }

  openManageWidgetDialog(): void {
    this.componentSelected.emit('manage-widget');
    this.actionDropdownOpen = false;
  }

  toggleActionDropdown(event?: Event): void {
    console.log('Action dropdown toggled:', !this.actionDropdownOpen, event);
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.actionDropdownOpen = !this.actionDropdownOpen;
  }

  openDashboardDetails(): void {
    console.log('Dashboard Details clicked');
    this.actionDropdownOpen = false;
  }

  openActivityLog(): void {
    console.log('Activity Log clicked');
    this.actionDropdownOpen = false;
  }

  toggleFullScreen(): void {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => {
        this.isFullscreen = true;
      }).catch(err => {
        console.log('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen = false;
      }).catch(err => {
        console.log('Error attempting to exit fullscreen:', err);
      });
    }
  }

  refreshData(): void {
    console.log('Refresh Data');
    this.actionDropdownOpen = false;
  }

  setAsDefault(): void {
    console.log('Set as Default');
    this.actionDropdownOpen = false;
  }

  deleteDashboard(): void {
    const toDelete = this.currentDashboard;
    this.actionDropdownOpen = false;
    if (!toDelete) return;
    
    this.dashboardService.deleteDashboard(toDelete.id).subscribe({
      next: () => {
        console.log('Dashboard deleted successfully');
        this.notificationService.dashboardDeleted(toDelete.name);
      },
      error: (error) => {
        console.error('Error deleting dashboard:', error);
        this.notificationService.error('Delete Failed', 'Failed to delete dashboard');
      }
    });
  }

  manageWidget(): void {
    console.log('Manage Widget clicked');
    this.actionDropdownOpen = false;
    
    this.dialog.open(CreateWidgetComponent, {
      width: '1200px',
      maxWidth: '95vw',
      height: '85vh',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: false,
      panelClass: 'modern-dialog'
    }).afterClosed().subscribe((result: any) => {
      if (result) {
        console.log('Manage widget dialog closed:', result);
      }
    });
  }

  openWidgetAccordion(): void {
    this.widgetAccordionService.toggleAccordion();
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(target: HTMLElement) {
    const clickedInsideHubspot = this.hubspotDropdownWrapper?.nativeElement.contains(target);
    const clickedInsideAction = this.dropdownWrapper?.nativeElement.contains(target);
    const clickedInsideNavbar = this.elementRef.nativeElement.contains(target);
    const clickedInsideSelector = this.selectorContainer?.nativeElement?.contains(target);

    if (!clickedInsideHubspot) {
      this.dropdownOpen = false;
    }

    if (!clickedInsideAction) {
      this.actionDropdownOpen = false;
    }

    // Close theme dropdown if clicking outside
    if (!clickedInsideNavbar) {
      this.themeDropdownOpen = false;
    }

    // Close mobile menu if clicking outside
    if (!clickedInsideNavbar && this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
    }

    // Close dashboard selector if clicking outside
    if (!clickedInsideSelector) {
      this.isDashboardSelectorExpanded = false;
    }
  }
} 