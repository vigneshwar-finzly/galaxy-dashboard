import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SidebarState {
  isCollapsed: boolean;
  isMobile: boolean;
  showMobileMenu: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private sidebarStateSubject = new BehaviorSubject<SidebarState>({
    isCollapsed: false,
    isMobile: false,
    showMobileMenu: false
  });

  public sidebarState$: Observable<SidebarState> = this.sidebarStateSubject.asObservable();

  constructor() {
    console.log('Sidebar service initialized');
    this.checkScreenSize();
    this.setupResizeListener();
    console.log('Initial sidebar state:', this.sidebarStateSubject.value);
  }

  private checkScreenSize(): void {
    const isMobile = window.innerWidth < 1024;
    const currentState = this.sidebarStateSubject.value;
    
    if (currentState.isMobile !== isMobile) {
      this.updateState({
        ...currentState,
        isMobile,
        isCollapsed: isMobile ? false : currentState.isCollapsed,
        showMobileMenu: false
      });
    }
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  private updateState(newState: SidebarState): void {
    console.log('Updating sidebar state:', newState);
    this.sidebarStateSubject.next(newState);
  }

  toggleSidebar(): void {
    const currentState = this.sidebarStateSubject.value;
    console.log('Sidebar service toggle called');
    console.log('Current state:', currentState);
    
    if (currentState.isMobile) {
      console.log('Mobile mode - toggling mobile menu');
      this.updateState({
        ...currentState,
        showMobileMenu: !currentState.showMobileMenu
      });
    } else {
      console.log('Desktop mode - toggling collapse');
      const newCollapsedState = !currentState.isCollapsed;
      console.log('New collapsed state:', newCollapsedState);
      this.updateState({
        ...currentState,
        isCollapsed: newCollapsedState
      });
    }
  }

  collapseSidebar(): void {
    const currentState = this.sidebarStateSubject.value;
    if (!currentState.isMobile) {
      this.updateState({
        ...currentState,
        isCollapsed: true
      });
    }
  }

  expandSidebar(): void {
    const currentState = this.sidebarStateSubject.value;
    if (!currentState.isMobile) {
      this.updateState({
        ...currentState,
        isCollapsed: false
      });
    }
  }

  closeMobileMenu(): void {
    const currentState = this.sidebarStateSubject.value;
    this.updateState({
      ...currentState,
      showMobileMenu: false
    });
  }

  getCurrentState(): SidebarState {
    return this.sidebarStateSubject.value;
  }
} 