import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/**
 * Modale di creazione di un subagent. Durante la creazione la modale è in loading e non
 * chiudibile (disableClose): il backdrop blocca l'interfaccia finché l'operazione non termina.
 * A creazione avvenuta ritorna l'agent creato al pannello (che lo aggiunge in lista).
 */
@Component({
  selector: 'cds-new-subagent-dialog',
  templateUrl: './cds-new-subagent-dialog.component.html',
  styleUrls: ['./cds-new-subagent-dialog.component.scss']
})
export class CdsNewSubagentDialogComponent implements OnInit {

  name: string = '';
  isCreating: boolean = false;
  showError: boolean = false;
  errorMessage: string = '';

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public dialogRef: MatDialogRef<CdsNewSubagentDialogComponent>,
    private faqKbService: FaqKbService,
    private dashboardService: DashboardService,
    @Inject(MAT_DIALOG_DATA) public data: { parentId?: string }
  ) { }

  ngOnInit(): void { }

  onNameChange(value: string): void {
    this.name = value ?? '';
  }

  get canCreate(): boolean {
    return !this.isCreating && !!this.name && this.name.trim().length > 0;
  }

  onClose(): void {
    if (this.isCreating) return; // non chiudere mentre crea
    this.dialogRef.close(false);
  }

  async onCreate(): Promise<void> {
    if (!this.canCreate) return;
    this.isCreating = true;
    this.showError = false;
    this.errorMessage = '';

    const payload = {
      id_project: this.dashboardService.projectID,
      language: 'en',
      name: this.name.trim(),
      subtype: 'subagent',
      template: 'blank',
      type: 'tilebot',
      // Il parent arriva dal pannello: e' il parent della FAMIGLIA, non il chatbot
      // aperto. Aprendo la modale da dentro un subagent, senza questo il nuovo
      // agent verrebbe agganciato al subagent stesso (annidamento non previsto).
      // Fallback al chatbot corrente per sicurezza se il dato non arriva.
      parent_id: this.data?.parentId || this.dashboardService.id_faq_kb
    };

    try {
      const created = await firstValueFrom(this.faqKbService.createFaqKb(payload));
      this.logger.log('[NEW-SUBAGENT] created', created);
      this.dialogRef.close(created);
    } catch (error) {
      this.logger.error('[NEW-SUBAGENT] create error', error);
      this.isCreating = false;
      this.showError = true;
      this.errorMessage = error?.error?.msg || error?.error?.message || error?.message || 'Error while creating the subagent. Please try again.';
    }
  }
}
