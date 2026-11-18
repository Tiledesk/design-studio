import { Observable, Subject } from 'rxjs';
import { ConnectorRenderer, EdgeStyle, Point, RendererEvent, RendererEventType } from './connector-renderer';

/**
 * L'adattatore sulla libreria JavaScript di disegno (`src/assets/js/tiledesk-connectors.js`).
 *
 * La libreria tiene il suo stato, crea gli SVG a mano e comunica lanciando eventi sul
 * `document`. Qui quegli eventi diventano uno stream, e i suoi metodi prendono i nomi del
 * contratto `ConnectorRenderer`. Niente di nuovo viene disegnato qui: e' un passaggio, perche'
 * chi usa i connettori smetta di dipendere dalla forma della libreria e la fase 2 possa
 * sostituirla.
 */
export class TiledeskJsRenderer implements ConnectorRenderer {
  private readonly eventsSource = new Subject<RendererEvent>();
  readonly events$: Observable<RendererEvent> = this.eventsSource.asObservable();
  private listening = false;

  private static readonly DOCUMENT_EVENTS: Array<[string, RendererEventType]> = [
    ['connector-created', 'created'],
    ['connector-deleted', 'deleted'],
    ['connector-drawn', 'drawn'],
    ['connector-selected', 'selected'],
    ['connector-deselected', 'deselected'],
    ['connector-draft-released', 'draft-released'],
    ['connector-release-on-intent', 'release-on-block'],
    ['connector-moved-over-intent', 'over-block'],
    ['connector-moved-out-of-intent', 'out-block'],
  ];

  constructor(private readonly lib: any) {
    this.listen();
  }

  get ready(): boolean {
    return !!this.lib && !!document.getElementById(this.lib.svgConnectorsId || 'tds_svgConnectors');
  }

  /** La libreria sottostante, per chi deve ancora parlarle direttamente. Da non usare nel codice nuovo. */
  get library(): any {
    return this.lib;
  }

  has(id: string): boolean {
    return !!this.lib?.connectors?.[id] && !!document.getElementById(id);
  }

  drawnIds(): string[] {
    return Object.keys(this.lib?.connectors || {});
  }

  draw(fromId: string, toId: string, fromEl: Element, toEl: Element, style: EdgeStyle | null, notify: boolean, save = false): void {
    const from = this.centerOf(fromEl);
    const to = this.topLeftOf(toEl);
    if (!from || !to) { return; }
    this.lib.createConnector(fromId, toId, from, to, save, notify, style || null);
  }

  remove(id: string, save = false, notify = true): void {
    this.lib.deleteConnector(id, save, notify);
  }

  removeOutOf(blockId: string, save = false, notify = true): void {
    this.lib.deleteConnectorsOutOfBlock(blockId, save, notify);
  }

  removeAllOf(blockId: string, save = false, notify = false): void {
    this.lib.deleteConnectorsOfBlock(blockId, save, notify);
  }

  update(blockEl: Element): void {
    this.lib.updateConnectorsOutOfItent(blockEl);
  }

  moved(blockEl: Element, x: number, y: number): void {
    this.lib.moved(blockEl, x, y);
  }

  setScale(scale: number): void {
    this.lib.scale = scale;
  }

  removeDraft(): void {
    this.lib.removeConnectorDraft();
  }

  logicPoint(p: Point): Point {
    return this.lib.logicPoint(p);
  }

  centerOf(el: Element): Point {
    return this.lib.elementLogicCenter(el);
  }

  topLeftOf(el: Element): Point | undefined {
    return this.lib.elementLogicTopLeft(el);
  }

  private listen(): void {
    if (this.listening) { return; }
    this.listening = true;
    for (const [name, type] of TiledeskJsRenderer.DOCUMENT_EVENTS) {
      document.addEventListener(name, (e: Event) => {
        const detail = (e as CustomEvent).detail;
        const id = detail?.connector?.id ?? (detail?.connector instanceof Element ? detail.connector.id : undefined);
        this.eventsSource.next({ type, id, detail });
      }, true);
    }
  }
}
