import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, defer, of, timer } from 'rxjs';
import { distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';

/**
 * Traccia globalmente quanti salvataggi del chatbot sono in corso.
 *
 * Perche' un CONTATORE e non un boolean: i salvataggi non sono serializzati.
 * opsUpdate() e' chiamato senza await da updateIntent/saveNewIntent/deleteIntentNew/
 * restoreLastUNDO/restoreLastREDO, e le note salvano in parallelo: piu' richieste
 * possono essere in volo insieme. Con un boolean la PRIMA che termina sbloccherebbe
 * la UI mentre le altre sono ancora pendenti.
 */
@Injectable({ providedIn: 'root' })
export class SavingStateService {

  /** Ritardo prima di mostrare lo spinner, per evitare flicker sui salvataggi rapidi. */
  static readonly INDICATOR_DELAY_MS = 300;

  private readonly pendingCount = new BehaviorSubject<number>(0);

  /** Numero di salvataggi in volo. Esposto per debug. */
  readonly pendingCount$: Observable<number> = this.pendingCount.asObservable();

  /** True finche' c'e' almeno un salvataggio in volo. Per DISABILITARE: reagisce subito. */
  readonly isSaving$: Observable<boolean> = this.pendingCount.pipe(
    map(count => count > 0),
    distinctUntilChanged()
  );

  /**
   * Come isSaving$, ma true solo se il salvataggio supera INDICATOR_DELAY_MS;
   * torna false subito appena finisce. Per MOSTRARE spinner + "Saving...".
   * La logica anti-flicker sta qui una volta sola, non duplicata nei componenti.
   * switchMap cancella il timer se il salvataggio finisce prima della soglia.
   */
  readonly isSavingVisible$: Observable<boolean> = this.isSaving$.pipe(
    switchMap(saving => saving
      ? timer(SavingStateService.INDICATOR_DELAY_MS).pipe(map(() => true))
      : of(false)
    ),
    distinctUntilChanged()
  );

  /** Snapshot sincrono per le guardie nei click handler. */
  get isSaving(): boolean {
    return this.pendingCount.value > 0;
  }

  begin(): void {
    this.pendingCount.next(this.pendingCount.value + 1);
  }

  /** Non scende mai sotto zero. */
  end(): void {
    const next = this.pendingCount.value - 1;
    this.pendingCount.next(next > 0 ? next : 0);
  }

  /**
   * Avvolge un Observable di salvataggio.
   * - `defer` incrementa alla SUBSCRIBE, non alla creazione: NoteService restituisce
   *   l'Observable al chiamante senza sottoscriverlo (e alcuni usano firstValueFrom).
   * - `finalize` decrementa UNA volta sola su complete, error o unsubscribe.
   *   NON usare i callback next/error/complete di subscribe: con HttpClient arrivano
   *   sia next sia complete -> doppio decremento.
   */
  track<T>(source$: Observable<T>): Observable<T> {
    return defer(() => {
      this.begin();
      return source$.pipe(finalize(() => this.end()));
    });
  }

  /** Valvola di sicurezza (recovery manuale / cambio chatbot). */
  reset(): void {
    if (this.pendingCount.value !== 0) {
      this.pendingCount.next(0);
    }
  }
}
