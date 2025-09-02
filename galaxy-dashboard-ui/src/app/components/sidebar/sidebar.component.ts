import { Component, OnInit, OnDestroy, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { SidebarService, SidebarState } from '../../services/sidebar.service';
import { ThemeService, ThemePalette } from '../../services/theme.service';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  active?: boolean;
  description?: string;
  isActionButton?: boolean;
}

interface ActionItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  iconClass: string;
}

@Component({
  standalone: false,
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() componentSelected = new EventEmitter<string>();
  
  sidebarState: SidebarState = {
    isCollapsed: false,
    isMobile: false,
    showMobileMenu: false
  };
  
  private subscription: Subscription = new Subscription();
  
  // Simplified navigation without categories
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
      id: 'create-widget',
      label: 'Create Widget', 
      icon: 'chart-bar', 
      route: 'create-widget',
      description: 'Build new data visualizations'
    },
    { 
      id: 'manage-dashboard',
      label: 'Manage Dashboard', 
      icon: 'edit', 
      route: 'manage-dashboard',
      description: 'Edit, remove, and organize widgets'
    },
    // { 
    //   id: 'create-widget',
    //   label: 'Create Widget', 
    //   icon: 'chart-bar', 
    //   route: 'create-widget',
    //   description: 'Build new data visualizations'
    // },
    { 
      id: 'manage-widget',
      label: 'Manage Widgets', 
      icon: 'chart-mixed', 
      route: 'manage-widget',
      description: 'Create, edit, and organize widgets'
    },
    // { 
    //   id: 'theme',
    //   label: 'Theme', 
    //   icon: 'palette', 
    //   route: 'theme',
    //   description: 'Color themes and appearance',
    //   isActionButton: true
    // }
  ];

  // Theme dropdown state
  actionDropdownOpen = false;
  actionDropdownPosition = { top: 0, left: 400 };
  private dropdownTimeout: any;

  // Enhanced Theme dropdown items with descriptions and icon classes
  actionDropdownItems: ActionItem[] = [
    { 
      id: 'azureSkies', 
      label: 'Azure Skies', 
      icon: 'circle',
      description: 'Soft blue with airy gradients',
      iconClass: 'icon-azure'
    },
    { 
      id: 'evergreenForest', 
      label: 'Evergreen Forest', 
      icon: 'circle',
      description: 'Calm greens with depth',
      iconClass: 'icon-forest'
    },
    { 
      id: 'coralSunset', 
      label: 'Coral Sunset', 
      icon: 'circle',
      description: 'Warm coral with modern edge',
      iconClass: 'icon-coral'
    },
    { 
      id: 'deepOcean', 
      label: 'Deep Ocean', 
      icon: 'circle',
      description: 'Indigo-blue with depth',
      iconClass: 'icon-ocean'
    },
    { 
      id: 'twilightPlum', 
      label: 'Twilight Plum', 
      icon: 'circle',
      description: 'Purple mystery with elegance',
      iconClass: 'icon-plum'
    }
  ];

  constructor(
    public sidebarService: SidebarService,
    private elementRef: ElementRef,
    public themeService: ThemeService
  ) { }

  ngOnInit(): void {
    // Initialize theme from storage
    this.themeService.initFromStorage();
    this.subscription.add(
      this.sidebarService.sidebarState$.subscribe(state => {
        console.log('Sidebar component received state:', state);
        this.sidebarState = state;
        console.log('Sidebar component state updated:', this.sidebarState);
        
        // Close dropdown when sidebar is collapsed/expanded
        if (this.actionDropdownOpen) {
          this.closeActionDropdown();
        }
        
        // Debug: Check if sidebar width is changing
        setTimeout(() => {
          const sidebar = document.querySelector('.floating-sidebar');
          if (sidebar) {
            console.log('Sidebar classes:', sidebar.className);
            console.log('Sidebar computed width:', window.getComputedStyle(sidebar).width);
          }
        }, 100);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
  }

  toggleSidebar(): void {
    console.log('Sidebar toggle clicked');
    console.log('Current state before toggle:', this.sidebarState);
    this.sidebarService.toggleSidebar();
    console.log('Toggle called');
  }

  setActiveItem(itemId: string): void {
    // Don't handle theme button click here
    if (itemId === 'theme') {
      return;
    }

    console.log("=== SIDEBAR NAVIGATION ===");
    console.log("Setting active item:", itemId);
    
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
    if (this.sidebarState.isMobile) {
      this.sidebarService.closeMobileMenu();
    }
  }

  // Hover-based dropdown methods
  showActionDropdown(event: MouseEvent): void {
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
    
    this.actionDropdownOpen = true;
    this.calculateDropdownPosition(event);
  }

  hideActionDropdown(): void {
    // Add a small delay to prevent flickering when moving between button and dropdown
    this.dropdownTimeout = setTimeout(() => {
      this.actionDropdownOpen = false;
    }, 150);
  }

  keepDropdownOpen(): void {
    // Clear the timeout to keep dropdown open
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
  }

  // Legacy click-based dropdown method (for collapsed state)
  toggleActionDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.actionDropdownOpen = !this.actionDropdownOpen;
    
    if (this.actionDropdownOpen) {
      this.calculateDropdownPosition(event);
    }
  }

  private calculateDropdownPosition(event: MouseEvent): void {
    const sidebar = this.elementRef.nativeElement.querySelector('.floating-sidebar');
    const sidebarRect = sidebar.getBoundingClientRect();
    const buttonRect = (event.target as HTMLElement).closest('.action-btn')?.getBoundingClientRect() || 
                      (event.target as HTMLElement).getBoundingClientRect();
    
    if (this.isCollapsed) {
      // For collapsed state, position dropdown to the right of sidebar
      this.actionDropdownPosition = {
        top: buttonRect.top + buttonRect.height / 2 - 20,
        left: sidebarRect.right + 15
      };
    } else {
      // For expanded state, position dropdown to the right of the Actions button
      this.actionDropdownPosition = {
        top: buttonRect.top,
        left: buttonRect.right + 15
      };
    }
    
    // Ensure dropdown doesn't go off-screen
    const dropdownWidth = 280; // Modern dropdown width
    const dropdownHeight = 400; // Approximate dropdown height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Check horizontal positioning - ensure it's always outside sidebar
    if (this.actionDropdownPosition.left + dropdownWidth > viewportWidth - 20) {
      // If dropdown would go off-screen, position it to the left of the sidebar
      this.actionDropdownPosition.left = Math.max(20, sidebarRect.left - dropdownWidth - 15);
    }
    
    // Check vertical positioning
    if (this.actionDropdownPosition.top + dropdownHeight > viewportHeight - 20) {
      // If dropdown would go below viewport, position it above the button
      this.actionDropdownPosition.top = buttonRect.top - dropdownHeight - 10;
    }
    
    // Ensure minimum top position
    this.actionDropdownPosition.top = Math.max(20, this.actionDropdownPosition.top);
    
    console.log('Dropdown positioned at:', this.actionDropdownPosition);
    console.log('Button rect:', buttonRect);
    console.log('Sidebar rect:', sidebarRect);
  }

  closeActionDropdown(): void {
    this.actionDropdownOpen = false;
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
  }

  onActionItemClick(actionId: string): void {
    console.log('Theme clicked:', actionId);
    this.closeActionDropdown();
    
    // Apply the selected theme
    this.themeService.applyTheme(actionId);
  }



  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close dropdown if clicking outside
    if (this.actionDropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeActionDropdown();
    }
  }

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

  getShortName(label: string): string {
    const shortNames: { [key: string]: string } = {
      'Dashboard': 'Dashboard',
      'Create Dashboard': 'Create Dashboard',
      'Create Widget': 'Create Widget',
      'Manage Widget': 'Manage Widget',
      'Theme': 'Theme'
    };
    
    return shortNames[label] || label;
  }

  logout(): void {
    // Implement logout logic here
    console.log('Logout clicked');
  }

  // Getters for template
  get isCollapsed(): boolean {
    return this.sidebarState.isCollapsed;
  }

  get isMobile(): boolean {
    return this.sidebarState.isMobile;
  }

  get showMobileMenu(): boolean {
    return this.sidebarState.showMobileMenu;
  }
} 