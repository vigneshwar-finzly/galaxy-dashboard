import { Component, OnInit, ElementRef, ViewChild, HostListener, OnDestroy, Input } from '@angular/core';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { DashboardService } from '../../services/dashboard.service';
import { NotificationService } from '../../services/notification.service';
import { Dashboard } from '../../models/dashboard.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard-selector',
  templateUrl: './dashboard-selector.component.html',
  styleUrls: ['./dashboard-selector.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('void', style({
        transform: 'translateY(-20px)',
        opacity: 0
      })),
      state('*', style({
        transform: 'translateY(0)',
        opacity: 1
      })),
      transition('void <=> *', animate('400ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),
    trigger('fadeInStagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('scaleIn', [
      state('void', style({
        transform: 'scale(0.8)',
        opacity: 0
      })),
      state('*', style({
        transform: 'scale(1)',
        opacity: 1
      })),
      transition('void <=> *', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ])
  ]
})
export class DashboardSelectorComponent implements OnInit, OnDestroy {
  @ViewChild('selectorContainer') selectorContainer!: ElementRef;
  @ViewChild('searchInput') searchInput!: ElementRef;
  @Input() showOptionsButton: boolean = true;

  isExpanded = false;
  searchQuery = '';
  selectedCategory: 'all' | 'favorites' | 'personal' | 'shared' | 'default' = 'all';

  dashboards: Dashboard[] = [];
  filteredDashboards: Dashboard[] = [];
  recentDashboards: Dashboard[] = [];
  favoriteDashboards: Dashboard[] = [];
  currentDashboard: Dashboard | null = null;
  isLoading = false;
  isActionMenuOpen = false;

  private subscription = new Subscription();
  personalDashboardsCount: any;
  sharedDashboardsCount: any;

  constructor(
    private dashboardService: DashboardService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.dashboardService.dashboards$.subscribe(dashboards => {
        this.dashboards = dashboards;
        this.filterDashboards();
        this.updateRecentAndFavorites();
        this.updateDashboardCounts();
      })
    );

    this.subscription.add(
      this.dashboardService.currentDashboard$.subscribe(dashboard => {
        this.currentDashboard = dashboard;
      })
    );
  }

  updateDashboardCounts(): void {
    this.personalDashboardsCount = this.dashboards.filter(d => d.category === 'personal').length;
    this.sharedDashboardsCount = this.dashboards.filter(d => d.category === 'shared').length;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.isActionMenuOpen = false;
    if (this.isExpanded) {
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

    if (this.selectedCategory !== 'all') {
      if (this.selectedCategory === 'favorites') {
        filtered = filtered.filter(d => d.isFavorite);
      } else {
        filtered = filtered.filter(dashboard => dashboard.category === this.selectedCategory);
      }
    }

    this.filteredDashboards = filtered;
  }

  applyCategory(category: 'all' | 'favorites' | 'personal' | 'shared' | 'default'): void {
    this.selectedCategory = category;
    this.filterDashboards();
  }

  updateRecentAndFavorites(): void {
    this.recentDashboards = this.dashboardService.getRecentDashboards(3);
    this.favoriteDashboards = this.dashboardService.getFavoriteDashboards();
  }

  selectDashboard(dashboard: Dashboard): void {
    this.dashboardService.switchDashboard(dashboard.id);
    this.isExpanded = false;
    this.isActionMenuOpen = false;
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

  toggleActionMenu(event: Event): void {
    console.log("toggled action menu");
    
    event.stopPropagation();
    this.isActionMenuOpen = !this.isActionMenuOpen;
    this.isExpanded = false;
  }

  openDashboardDetails(): void {
    this.isActionMenuOpen = false;
    this.notificationService.info('Dashboard Details', 'Opening dashboard details...');
  }

  editDashboard(): void {
    this.isActionMenuOpen = false;
    if (this.currentDashboard) {
      this.dashboardService.openEditDashboardDialog(this.currentDashboard);
    }
  }

  addWidget(): void {
    this.isActionMenuOpen = false;
    this.notificationService.info('Add Widget', 'Opening widget selection...');
  }

  setAsDefault(): void {
    this.isActionMenuOpen = false;
    const current = this.currentDashboard;
    if (current) {
      localStorage.setItem('ngfd_default_dashboard_id', current.id.toString());
      this.notificationService.success('Default Dashboard', `${current.name} set as default`);
    }
  }

  deleteDashboard(): void {
    const toDelete = this.currentDashboard;
    this.isActionMenuOpen = false;
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

  displayCategoryName(category: string): string {
    switch (category) {
      case 'personal': return 'Private';
      case 'shared': return 'Shared';
      case 'default': return 'Global';
      default: return 'All';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'personal': return '👤';
      case 'shared': return '🤝';
      case 'default': return '⭐';
      default: return '📁';
    }
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'personal': return '#10B981';
      case 'shared': return '#F59E0B';
      case 'default': return '#3B82F6';
      default: return '#6B7280';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.selectorContainer?.nativeElement?.contains(event.target)) {
      this.isExpanded = false;
      this.isActionMenuOpen = false;
    }
  }

  // Enhanced keyboard navigation
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isExpanded) return;

    switch (event.key) {
      case 'Escape':
        this.isExpanded = false;
        break;
      case 'Enter':
        if (this.filteredDashboards.length > 0) {
          this.selectDashboard(this.filteredDashboards[0]);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        // Navigate through dashboards
        break;
      case 'ArrowUp':
        event.preventDefault();
        // Navigate through dashboards
        break;
    }
  }
}