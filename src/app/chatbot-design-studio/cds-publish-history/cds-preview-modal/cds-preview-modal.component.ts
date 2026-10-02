import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface PreviewModalData {
  /** L'indirizzo della rotta di preview, gia' composto da chi apre la modale. */
  url: string;
  /** La data della release, mostrata nella barra della modale. */
  title?: string;
}

/**
 * Mostra una release pubblicata a schermo intero, dentro il Design Studio.
 *
 * **Perche' un iframe e non il canvas montato qui dentro.** I servizi del Design Studio
 * sono singleton e tengono lo stato del flusso aperto: l'elenco dei blocchi, le pile di
 * annulla e ripeti, i connettori, il chatbot selezionato. Montare il canvas della
 * preview nella stessa applicazione gli farebbe condividere quegli oggetti con l'editor
 * che sta dietro: aprire una release sovrascriverebbe il flusso in lavorazione, e
 * chiudendo la modale l'editor resterebbe con i blocchi della release.
 *
 * L'iframe carica la rotta `.../preview/...` come applicazione a se': ha i suoi
 * singleton, quindi la sola lettura vale li' dentro e l'editor dietro non viene
 * toccato. E' lo stesso motivo per cui prima si apriva una scheda nuova, ottenuto
 * senza uscire dal Design Studio.
 */
@Component({
  selector: 'cds-preview-modal',
  templateUrl: './cds-preview-modal.component.html',
  styleUrls: ['./cds-preview-modal.component.scss']
})
export class CdsPreviewModalComponent implements OnInit {

  safeUrl: SafeResourceUrl;

  constructor(
    public dialogRef: MatDialogRef<CdsPreviewModalComponent>,
    private readonly sanitizer: DomSanitizer,
    @Inject(MAT_DIALOG_DATA) public data: PreviewModalData
  ) { }

  ngOnInit(): void {
    // L'indirizzo lo costruisce il Design Studio a partire dalle proprie rotte, non
    // arriva da fuori: e' nostro, e l'iframe ha bisogno che sia dichiarato affidabile.
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.url);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
