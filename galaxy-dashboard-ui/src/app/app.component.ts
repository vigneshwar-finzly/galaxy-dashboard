import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ThemeService } from './services/theme.service';
import { MatDialog } from '@angular/material/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { CreateDashboardDialogComponent } from './components/create-dashboard-dialog/create-dashboard-dialog.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { CreateDashboardComponent } from './components/create-dashboard/create-dashboard.component';
import { CreateWidgetComponent } from './components/create-widget/create-widget.component';
import { ManageDashboardComponent } from './components/manage-dashboard/manage-dashboard.component';
import { ManageWidgetComponent } from './components/manage-widget/manage-widget.component';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule,FormsModule,DashboardComponent,NavbarComponent,CreateDashboardComponent,
    CreateWidgetComponent,ManageDashboardComponent,ManageWidgetComponent, NotificationToastComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  currentComponent: string = 'dashboard';
  
  private subscription: Subscription = new Subscription();

  constructor(
    private themeService: ThemeService,
    private dialog: MatDialog,
    private overlay: Overlay
  ) {}

  ngOnInit(): void {
    // Initialize theme service from localStorage
    this.themeService.initFromStorage();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  showComponent(componentName: string): void {
    // Handle create-dashboard specially by opening a dialog
    if (componentName === 'create-dashboard') {
      this.openCreateDashboardDialog();
      return;
    }
    
    this.currentComponent = componentName;
  }

  private openCreateDashboardDialog(): void {
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
      position: {}
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        console.log('Dashboard created:', result);
        // Optionally reload dashboards or update the current view
      }
    });
  }
}
