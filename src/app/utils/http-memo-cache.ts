import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

interface HttpMemoCacheEntry {
  /** Observable condiviso: deduplica le richieste in volo e riemette il risultato ai subscriber successivi. */
  stream$: Observable<any>;
  /** Timestamp (ms) di creazione della entry, per il TTL. */
  createdAt: number;
}

/**
 * Cache in memoria per GET HTTP. Risolve DUE problemi distinti:
 *  1) DEDUP IN VOLO: N componenti che partono nello stesso tick condividono UNA sola
 *     richiesta di rete (shareReplay con refCount:false).
 *  2) CACHE DEL RISULTATO: chi arriva dopo la risposta, entro il TTL, riceve il valore
 *     bufferizzato senza toccare la rete.
 * Gli ERRORI non vengono mai memorizzati: shareReplay li riemetterebbe per sempre.
 */
export class HttpMemoCache {

  private readonly entries = new Map<string, HttpMemoCacheEntry>();

  constructor(private readonly ttlMs: number) {}

  /**
   * @param key     deve includere il project_id e ogni altro parametro della GET
   * @param factory crea l'Observable HTTP "cold"; invocata SOLO in caso di miss
   */
  get<T>(key: string, factory: () => Observable<T>): Observable<T> {
    const now = Date.now();
    const cached = this.entries.get(key);

    if (cached && (now - cached.createdAt) < this.ttlMs) {
      return (cached.stream$ as Observable<T>).pipe(map(value => this.clone(value)));
    }

    // Riferimento catturato nella closure: in catchError rimuoviamo SOLO questa entry,
    // mai una piu' recente che nel frattempo l'avesse sostituita.
    const entry: HttpMemoCacheEntry = { stream$: null, createdAt: now };

    entry.stream$ = factory().pipe(
      // catchError PRIMA di shareReplay: c'e' una sola subscription alla sorgente,
      // quindi il delete gira una volta sola e non una per subscriber.
      catchError((err) => {
        if (this.entries.get(key) === entry) {
          this.entries.delete(key);
        }
        return throwError(() => err);
      }),
      // refCount:false -> il buffer sopravvive anche a zero subscriber (chiudi/riapri pannello).
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.entries.set(key, entry);
    return (entry.stream$ as Observable<T>).pipe(map(value => this.clone(value)));
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }

  /** Rimuove tutte le entry la cui chiave inizia con il prefisso indicato. */
  invalidateByPrefix(prefix: string): void {
    for (const key of Array.from(this.entries.keys())) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }

  /** Svuota tutto (cambio progetto, cambio token, logout). */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Ogni subscriber riceve una copia propria: la response e' condivisa e alcuni chiamanti
   * la mutano in-place (lista server MCP). Payload piccoli e puro JSON -> JSON clone basta.
   */
  private clone<T>(value: T): T {
    return (value === null || value === undefined) ? value : JSON.parse(JSON.stringify(value));
  }
}
