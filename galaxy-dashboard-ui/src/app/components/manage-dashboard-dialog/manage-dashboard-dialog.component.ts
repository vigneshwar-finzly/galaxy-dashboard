import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ManageDashboardComponent } from '../manage-dashboard/manage-dashboard.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [ManageDashboardComponent,CommonModule,FormsModule],
  selector: 'app-manage-dashboard-dialog',
  templateUrl: './manage-dashboard-dialog.component.html',
  styleUrls: ['./manage-dashboard-dialog.component.scss']
})
export class ManageDashboardDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ManageDashboardDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onClose() {
    this.dialogRef.close();
  }
}


