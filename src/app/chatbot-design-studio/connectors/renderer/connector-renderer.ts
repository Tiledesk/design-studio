import { Observable } from 'rxjs';

/**
 * Il contratto del disegno dei connettori.
 *
 * Chi disegna le linee (oggi la libreria `src/assets/js/tiledesk-connectors.js`, domani un
 * componente Angular con un SVG suo) sta dietro questa interfaccia: il resto del Design
 * Studio parla di record, elementi e punti, mai di `<path>` o di eventi sul `document`.
 * La fase 2 del lavoro sui connettori sostituisce l'implementazione senza toccare chi la usa.
 */

export interface Point { x: number; y: number; }

export interface EdgeStyle {
  label?: string;
  /** false: la linea non si disegna e al suo posto compare il riquadro col nome del blocco. */
  display?: boolean;
}

export type RendererEventType =
  | 'created' | 'deleted' | 'drawn'
  | 'selected' | 'deselected'
  | 'draft-released' | 'release-on-block' | 'over-block' | 'out-block';

export interface RendererEvent {
  type: RendererEventType;
  /** L'id del connettore, quando l'evento ne riguarda uno. */
  id?: string;
  /** Quello che la libreria allega all'evento, cosi' com'e'. */
  detail: any;
}

export interface ConnectorRenderer {
  /** La libreria di disegno e' pronta (il contenitore SVG esiste). */
  readonly ready: boolean;
  /** Il connettore e' disegnato. */
  has(id: string): boolean;
  /** Gli id di tutti i connettori disegnati. */
  drawnIds(): string[];
  /** Disegna o ridisegna un connettore tra due elementi del DOM. `notify` fa partire l'evento `created`. */
  draw(fromId: string, toId: string, fromEl: Element, toEl: Element, style: EdgeStyle | null, notify: boolean, save?: boolean): void;
  /** Rimuove un connettore con tutto cio' che gli appartiene (linea, hitbox, etichetta). */
  remove(id: string, save?: boolean, notify?: boolean): void;
  /** Rimuove i connettori che escono da un blocco. */
  removeOutOf(blockId: string, save?: boolean, notify?: boolean): void;
  /** Rimuove i connettori che escono da e arrivano a un blocco, e il blocco stesso dagli indici. */
  removeAllOf(blockId: string, save?: boolean, notify?: boolean): void;
  /** Ridisegna i connettori che escono da un blocco, dalla posizione attuale dei suoi elementi. */
  update(blockEl: Element): void;
  /** Il blocco si sta spostando: segue i connettori. */
  moved(blockEl: Element, x: number, y: number): void;
  setScale(scale: number): void;
  removeDraft(): void;
  /** Coordinate: dallo schermo al piano logico dello stage, e i punti di ancoraggio. */
  logicPoint(p: Point): Point;
  centerOf(el: Element): Point;
  topLeftOf(el: Element): Point | undefined;
  readonly events$: Observable<RendererEvent>;
}
