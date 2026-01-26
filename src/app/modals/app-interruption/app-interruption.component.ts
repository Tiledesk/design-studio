import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface AppInterruptionDialogData {
  resumedAt: number; // epoch ms
  hiddenDurationMs: number | null;
  visibilityState: DocumentVisibilityState;
  navigatorOnLine: boolean | null;
}

@Component({
  selector: 'cds-app-interruption',
  templateUrl: './app-interruption.component.html',
  styleUrls: ['./app-interruption.component.scss']
})
export class AppInterruptionComponent {
  constructor(
    public dialogRef: MatDialogRef<AppInterruptionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AppInterruptionDialogData,
  ) {}

  refresh(): void {
    try {
      window.location.reload();
    } catch {
      // fallback
      window.location.href = window.location.href;
    }
  }
}

