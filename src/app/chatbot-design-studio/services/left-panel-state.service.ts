import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

/** Le schede del pannello di sinistra, nell'ordine in cui stanno nella striscia. */
export type LeftPanelTab = 'chat' | 'blocks' | 'subagents' | 'actions';

export interface LeftPanelSnapshot {
  readonly isOpen: boolean;
  readonly activeTab: LeftPanelTab;
}

/**
 * Quale scheda è aperta a sinistra, in un posto solo.
 *
 * Prima questa risposta era scritta in tre punti che potevano contraddirsi -- la scheda nel
 * canvas, il pannello della chat nel dashboard, la tavolozza delle azioni agganciata al bordo --
 * e "una per volta" valeva solo finché ogni punto si ricordava degli altri. Qui è vero per
 * costruzione: c'è un solo valore, e chi aggiungerà una quinta scheda non potrà sbagliarlo.
 *
 * `isOpen` e `activeTab` restano **separati** di proposito: chiudendo il pannello la scheda non
 * si dimentica, così riaprendo si torna dov'eri invece di dover riscegliere.
 *
 * Lo stato vive qui solo finché la pagina è aperta. Dove va ricordato fra una sessione e
 * l'altra -- per agente, o per famiglia di agenti -- lo decide chi chiama, perché la chiave non
 * è la stessa per tutte le schede.
 */
@Injectable({ providedIn: 'root' })
export class LeftPanelStateService {

  private readonly _isOpen$ = new BehaviorSubject<boolean>(true);
  private readonly _activeTab$ = new BehaviorSubject<LeftPanelTab>('subagents');

  /** Vero finché il primo disegno non è finito.
   *
   *  Serve a tenere spente le transizioni CSS mentre si applica lo stato salvato: senza, a ogni
   *  caricamento di pagina il pannello si vede scorrere in posizione, come se qualcuno lo
   *  stesse aprendo in quel momento. */
  private readonly _isBooting$ = new BehaviorSubject<boolean>(true);

  readonly state$: Observable<LeftPanelSnapshot> = combineLatest([
    this._isOpen$,
    this._activeTab$
  ]).pipe(
    map(([isOpen, activeTab]) => ({ isOpen, activeTab })),
    distinctUntilChanged((a, b) => a.isOpen === b.isOpen && a.activeTab === b.activeTab)
  );

  readonly isOpen$: Observable<boolean> = this._isOpen$.asObservable();
  readonly activeTab$: Observable<LeftPanelTab> = this._activeTab$.asObservable();
  readonly isBooting$: Observable<boolean> = this._isBooting$.asObservable();

  get isOpen(): boolean { return this._isOpen$.value; }
  get activeTab(): LeftPanelTab { return this._activeTab$.value; }
  get isBooting(): boolean { return this._isBooting$.value; }

  /** Vero se quella scheda è quella visibile adesso: aperta E attiva. */
  public isTabVisible(tab: LeftPanelTab): boolean {
    return this._isOpen$.value && this._activeTab$.value === tab;
  }

  /** Sceglie una scheda e apre il pannello se era chiuso. */
  public selectTab(tab: LeftPanelTab): void {
    this._activeTab$.next(tab);
    this._isOpen$.next(true);
  }

  /** Cliccando la scheda attiva si chiude tutto; cliccandone un'altra ci si sposta. */
  public toggleTab(tab: LeftPanelTab): void {
    if (this.isTabVisible(tab)) { this.close(); return; }
    this.selectTab(tab);
  }

  public open(): void { this._isOpen$.next(true); }
  public close(): void { this._isOpen$.next(false); }
  public toggle(): void { this._isOpen$.next(!this._isOpen$.value); }

  /** Applica lo stato letto dalla memoria, una volta sola all'apertura dell'agente. */
  public hydrate(snapshot: Partial<LeftPanelSnapshot>): void {
    if (typeof snapshot.isOpen === 'boolean') { this._isOpen$.next(snapshot.isOpen); }
    if (snapshot.activeTab) { this._activeTab$.next(snapshot.activeTab); }
  }

  /** Riaccende le transizioni, dopo che il browser ha disegnato lo stato iniziale.
   *
   *  Due giri di `requestAnimationFrame` e non uno: il primo consegna il fotogramma in cui lo
   *  stato è già applicato, il secondo arriva quando quel fotogramma è stato disegnato. Con uno
   *  solo la transizione tornerebbe attiva in tempo per animare proprio il disegno iniziale. */
  /** Dichiara l'avvio concluso senza aspettare il disegno. Per i test, che non hanno un
   *  browser che disegni e resterebbero in avvio per sempre. */
  public finishBootNow(): void { this._isBooting$.next(false); }

  /** Rimette l'avvio, per il prossimo ingresso nello studio.
   *
   *  Questo servizio vive quanto l'applicazione, non quanto lo studio: uscendo verso l'elenco
   *  degli agenti e rientrando su un altro non c'e' nessun ricaricamento di pagina, e senza
   *  questo si riaprirebbe l'ultima scheda guardata sull'agente precedente. Aprire un agente e'
   *  un avvio, e riparte dalla sua scheda iniziale; restano fuori i cambi di flusso dentro lo
   *  studio, che non distruggono il dashboard e dove la scheda scelta deve restare. */
  public restartBoot(): void { this._isBooting$.next(true); }

  public finishBoot(): void {
    if (!this._isBooting$.value) { return; }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this._isBooting$.next(false));
    });
  }
}
