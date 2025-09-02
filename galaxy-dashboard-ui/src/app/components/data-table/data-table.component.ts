import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ExpandedWidgetDialogComponent } from '../expanded-widget-dialog/expanded-widget-dialog.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WidgetHeaderComponent } from '../widget-header/widget-header.component';
import { WidgetLoadingSkeletonComponent } from '../widget-loading-skeleton/widget-loading-skeleton.component';

interface PaymentTransaction {
  paymentId: string;
  amount: string;
  status: 'Success' | 'Failed' | 'Pending';
  paymentRail: 'ACH' | 'FEDNOW' | 'FEDWIRE' | 'RTP' | 'SWIFT';
  date: Date;
}

interface TableData {
  title: string;
  tableType?: string;
  dashboardWidgetId?: number;
}

@Component({
  standalone: true,
  imports: [CommonModule,FormsModule,WidgetHeaderComponent,WidgetLoadingSkeletonComponent],
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
})
export class DataTableComponent implements OnInit {
  @Input() data!: TableData;
  @Output() widgetRemoved = new EventEmitter<{dashboardWidgetId?: number}>();

  Math = Math;
  isRefreshing = false;

  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn = 'date';
  sortDirection = 'desc';

  transactions: PaymentTransaction[] = [
    { paymentId: 'PAY-2024-001', amount: '$125,000.00', status: 'Success', paymentRail: 'ACH', date: new Date('2024-01-15T10:30:00') },
    { paymentId: 'PAY-2024-002', amount: '$89,500.00', status: 'Success', paymentRail: 'FEDNOW', date: new Date('2024-01-15T09:15:00') },
    { paymentId: 'PAY-2024-003', amount: '$250,000.00', status: 'Failed', paymentRail: 'FEDWIRE', date: new Date('2024-01-15T08:45:00') },
    { paymentId: 'PAY-2024-004', amount: '$67,800.00', status: 'Success', paymentRail: 'RTP', date: new Date('2024-01-15T08:20:00') },
    { paymentId: 'PAY-2024-005', amount: '$180,000.00', status: 'Pending', paymentRail: 'SWIFT', date: new Date('2024-01-15T07:55:00') },
    { paymentId: 'PAY-2024-006', amount: '$95,200.00', status: 'Success', paymentRail: 'ACH', date: new Date('2024-01-15T07:30:00') },
    { paymentId: 'PAY-2024-007', amount: '$320,000.00', status: 'Success', paymentRail: 'FEDWIRE', date: new Date('2024-01-15T07:05:00') },
    { paymentId: 'PAY-2024-008', amount: '$45,600.00', status: 'Failed', paymentRail: 'FEDNOW', date: new Date('2024-01-15T06:40:00') },
    { paymentId: 'PAY-2024-009', amount: '$156,700.00', status: 'Success', paymentRail: 'RTP', date: new Date('2024-01-15T06:15:00') },
    { paymentId: 'PAY-2024-010', amount: '$78,900.00', status: 'Pending', paymentRail: 'ACH', date: new Date('2024-01-15T05:50:00') },
    { paymentId: 'PAY-2024-011', amount: '$210,000.00', status: 'Success', paymentRail: 'SWIFT', date: new Date('2024-01-15T05:25:00') },
    { paymentId: 'PAY-2024-012', amount: '$134,500.00', status: 'Success', paymentRail: 'FEDNOW', date: new Date('2024-01-15T05:00:00') },
    { paymentId: 'PAY-2024-013', amount: '$89,300.00', status: 'Failed', paymentRail: 'ACH', date: new Date('2024-01-15T04:35:00') },
    { paymentId: 'PAY-2024-014', amount: '$267,800.00', status: 'Success', paymentRail: 'FEDWIRE', date: new Date('2024-01-15T04:10:00') },
    { paymentId: 'PAY-2024-015', amount: '$56,400.00', status: 'Success', paymentRail: 'RTP', date: new Date('2024-01-15T03:45:00') },
    { paymentId: 'PAY-2024-016', amount: '$189,200.00', status: 'Pending', paymentRail: 'SWIFT', date: new Date('2024-01-15T03:20:00') },
    { paymentId: 'PAY-2024-017', amount: '$112,600.00', status: 'Success', paymentRail: 'ACH', date: new Date('2024-01-15T02:55:00') },
    { paymentId: 'PAY-2024-018', amount: '$345,000.00', status: 'Success', paymentRail: 'FEDNOW', date: new Date('2024-01-15T02:30:00') },
    { paymentId: 'PAY-2024-019', amount: '$78,900.00', status: 'Failed', paymentRail: 'FEDWIRE', date: new Date('2024-01-15T02:05:00') },
    { paymentId: 'PAY-2024-020', amount: '$156,300.00', status: 'Success', paymentRail: 'RTP', date: new Date('2024-01-15T01:40:00') }
  ];

  filteredTransactions: PaymentTransaction[] = [];
  totalPages = 1;

  constructor(private dialog: MatDialog) { }

  ngOnInit(): void {
    console.log('Data Table received data:', this.data);
    this.filterTransactions();
  }

  filterTransactions(): void {
    this.filteredTransactions = this.transactions.filter(transaction =>
      transaction.paymentId.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      transaction.amount.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      transaction.paymentRail.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      transaction.status.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  get paginatedTransactions(): PaymentTransaction[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredTransactions.slice(startIndex, endIndex);
  }

  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredTransactions.sort((a, b) => {
      let aValue: any = a[column as keyof PaymentTransaction];
      let bValue: any = b[column as keyof PaymentTransaction];

      if (column === 'date') {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      } else if (column === 'amount') {
        aValue = parseFloat(aValue.replace('$', '').replace(',', ''));
        bValue = parseFloat(bValue.replace('$', '').replace(',', ''));
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getStatusColor(status: string): string {
    const colors = {
      'Success': 'bg-[#82C91E]/10 text-[#82C91E] border border-[#82C91E]/20',
      'Pending': 'bg-amber-100 text-amber-800 border border-amber-200',
      'Failed': 'bg-red-100 text-red-800 border border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-200';
  }

  getStatusIcon(status: string): string {
    const icons = {
      'Success': 'fas fa-check-circle',
      'Pending': 'fas fa-clock',
      'Failed': 'fas fa-times-circle'
    };
    return icons[status as keyof typeof icons] || 'fas fa-question-circle';
  }

  getRailColor(rail: string): string {
    const colors = {
      'ACH': 'bg-[#3498db]/10 text-[#3498db] border border-[#3498db]/20',
      'FEDNOW': 'bg-[#82C91E]/10 text-[#82C91E] border border-[#82C91E]/20',
      'FEDWIRE': 'bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20',
      'RTP': 'bg-[#4ECDC4]/10 text-[#4ECDC4] border border-[#4ECDC4]/20',
      'SWIFT': 'bg-[#45B7D1]/10 text-[#45B7D1] border border-[#45B7D1]/20'
    };
    return colors[rail as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-200';
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  changeItemsPerPage(items: number): void {
    this.itemsPerPage = items;
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'fas fa-sort';
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // Widget action handlers
  handleRefresh(): void {
    this.isRefreshing = true;
    
    // Simulate data refresh - replace with actual API call
    setTimeout(() => {
      // In real implementation, fetch fresh data here
      this.filterTransactions();
      this.isRefreshing = false;
    }, 2000);
  }

  handleExpand(event: {widgetId?: number, data?: any}): void {
    const dialogRef = this.dialog.open(ExpandedWidgetDialogComponent, {
      width: 'auto',
      height: 'auto',
      maxWidth: '98vw',
      maxHeight: '95vh',
      hasBackdrop: true,
      closeOnNavigation: true,
      panelClass: ['expanded-widget-dialog-container'],
      backdropClass: 'create-dashboard-backdrop',
      restoreFocus: true,
      position: {},
      data: {
        widgetId: event.widgetId,
        data: this.getExpandedData(),
        title: this.data.title,
        chartType: 'data-table',
        description: 'Comprehensive data table with advanced filtering and sorting capabilities'
      }
    });
  }

  handleClose(event: {dashboardWidgetId?: number}): void {
    if (confirm('Are you sure you want to remove this table from the dashboard?')) {
      this.widgetRemoved.emit(event);
    }
  }

  getExpandedData(): any {
    return {
      component: 'data-table',
      dashboardWidgetId: this.data.dashboardWidgetId,
      transactions: this.transactions,
      filteredTransactions: this.filteredTransactions,
      description: 'Interactive data table with real-time filtering and sorting',
      ...this.data
    };
  }
} 