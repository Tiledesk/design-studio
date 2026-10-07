import { Injectable } from '@angular/core';

/**
 * Dice se questa scheda del browser sta guardando un flusso in sola lettura.
 *
 * Si accende leggendo i dati della rotta di preview, nel guscio della pagina, prima che
 * il canvas carichi il flusso. Da quel momento ogni salvataggio viene fermato alla
 * radice: vedi i guard in `IntentService.opsUpdate` e in `FaqKbService`.
 *
 * **Si accende e basta: non esiste un modo per spegnerlo.** E' voluto. Il modo appartiene
 * alla scheda, non alla schermata: la preview si apre in una scheda nuova, che e'
 * un'istanza pulita dell'applicazione, e nessuna navigazione interna deve poter
 * riportare in modifica un flusso pubblicato. Per tornare a modificare si usa la scheda
 * dell'editor, che e' rimasta aperta.
 *
 * Il nome NON e' `previewMode`: quello e' gia' un `@Input()` su una cinquantina di
 * componenti di azione e significa un'altra cosa (disegnato in piccolo dentro il blocco
 * invece che nel pannello di dettaglio).
 */
/**
 * Dice se i dati di una rotta chiedono la sola lettura.
 *
 * La forma e' insolita e va spiegata: i dati delle rotte di questa applicazione sono un
 * **array di un oggetto** -- `[{ roles: [...] }]` -- perche' cosi' li legge RoleGuard.
 * L'ereditarieta' verso il figlio a percorso vuoto, dove vive il guscio della pagina,
 * puo' consegnarli come array oppure come oggetto con chiave `0`, a seconda di come
 * Angular li fonde. `data[0]` funziona in entrambi i casi, e il ripiego su `data` copre
 * anche un oggetto semplice, se un domani la forma venisse normalizzata.
 *
 * Pura ed esportata apposta: sbagliarla vuol dire aprire in modifica un flusso
 * pubblicato, ed e' l'errore che questa funzionalita' esiste per non fare.
 */
export function isReadOnlyRoute(data: any): boolean {
  const routeData = (data && data[0]) || data;
  return routeData?.readOnly === true;
}

@Injectable({
  providedIn: 'root'
})
export class ReadOnlyService {

  private _readOnly: boolean = false;

  /** Letto dai guard: deve essere sincrono, un salvataggio non puo' aspettare. */
  get readOnly(): boolean {
    return this._readOnly;
  }

  enable(): void {
    this._readOnly = true;
  }
}
