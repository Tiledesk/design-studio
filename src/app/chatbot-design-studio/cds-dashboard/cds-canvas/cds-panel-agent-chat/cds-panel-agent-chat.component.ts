import {
  Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { AgentChatHostService } from 'src/app/chatbot-design-studio/agent-chat/agent-chat-host.service';
import { FlowOpsService } from 'src/app/chatbot-design-studio/agent-chat/flow-ops.service';
import { FlowOpsReport } from 'src/app/chatbot-design-studio/agent-chat/flow-ops.model';

@Component({
  selector: 'cds-panel-agent-chat',
  templateUrl: './cds-panel-agent-chat.component.html',
  styleUrls: ['./cds-panel-agent-chat.component.scss']
})
export class CdsPanelAgentChatComponent implements OnInit, OnChanges, OnDestroy {

  @ViewChild('agentChatIframe') agentChatIframe: ElementRef<HTMLIFrameElement>;
  @Input() isPanelVisible: boolean = false;

  /** localStorage key the resized width is persisted under, so it survives a
   *  reload. Scoped to this panel specifically (not reused by any other
   *  resizable surface). */
  private static readonly WIDTH_STORAGE_KEY = 'cds.agentChatPanel.width';
  private static readonly MIN_WIDTH = 320;

  /** Drives the drag mask in the template: true only for the duration of an
   *  active resize gesture. */
  resizing = false;

  private dragStartX = 0;
  private dragStartWidth = 0;
  private currentWidth = 0;
  /** The width the user actually asked for -- restored from storage or set at
   *  the end of a drag -- kept separate from whatever is currently applied so
   *  a window resize can re-derive a clamped display width from it without
   *  ever touching storage: shrinking the window clamps the display live,
   *  growing it back restores the full preferred value, and the user's
   *  stored choice is never silently downgraded by a transient narrow
   *  window. null means "no override, use the stylesheet default". */
  private preferredWidth: number | null = null;
  private readonly onDragMove = (event: MouseEvent): void => this.handleDragMove(event);
  private readonly onDragEnd = (): void => this.handleDragEnd();
  // A drag that ends anywhere other than a `mouseup` inside this document --
  // released over another application, or the window losing focus mid-drag
  // -- must still tear the mask down; both route to the same handleDragEnd
  // as a normal mouseup.
  private readonly onWindowBlur = (): void => this.handleDragEnd();
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.handleDragEnd();
    }
  };
  private readonly onWindowResize = (): void => this.reclampToWindow();

  /** Null until the host is wired. Setting it is what loads the chat.
   *  Kept as a plain string beside the sanitised one so tests can assert the
   *  address without unwrapping Angular's SafeResourceUrl. */
  public iframeSrc: string | null = null;
  /** Starts at 'about:blank' rather than null: Angular's compiled resource-url
   *  sanitizer throws NG0904 on a literal null/undefined binding (it has no
   *  concept of "no value yet", unlike DomSanitizer.sanitize()), so the iframe
   *  needs a safe, real value from its very first render. */
  public safeIframeSrc: SafeResourceUrl;
  public error: string | null = null;
  public lastReport: FlowOpsReport | null = null;
  public appliedCount = 0;
  /** How many operations in the last report did not apply, and what the first
   *  of them said. Silence here is the one failure mode this whole feature is
   *  written against: a refused batch used to render no row at all, and a
   *  batch that applied 1 of 3 said only "Applied 1 change(s)". */
  public failedCount = 0;
  public firstError: string | null = null;
  public canUndo = false;

  private attached = false;
  private appliedSub: Subscription;

  constructor(
    public hostService: AgentChatHostService,
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef<HTMLElement>,
    private flowOps: FlowOpsService
  ) {
    this.safeIframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
  }

  ngOnInit(): void {
    this.restorePersistedWidth();
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isPanelVisible']?.currentValue && !this.attached) {
      this.attached = true;
      this.wire();
    }
  }

  private async wire(): Promise<void> {
    try {
      // The order is the whole point: the chat posts `ready` as soon as the
      // frame loads, so the listener must exist before the src does.
      await this.hostService.attach(this.agentChatIframe?.nativeElement
        ?? document.createElement('iframe'));
      // Clear a previous failure: without this, a successful retry after an
      // earlier attach() error would still render the error block forever,
      // since *ngIf="error" in the template never gets a chance to flip back.
      this.error = null;
      this.iframeSrc = this.hostService.iframeSrc();
      this.safeIframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.iframeSrc);
      this.appliedSub = this.hostService.applied$
        .subscribe((report: FlowOpsReport) => {
          this.lastReport = report;
          this.appliedCount = report.results.filter(r => r.ok).length;
          const failures = report.results.filter(r => !r.ok);
          this.failedCount = failures.length;
          this.firstError = failures.length ? (failures[0].error ?? null) : null;
          // A batch refused during validation changed nothing, so there is
          // nothing to undo and offering it would be a lie.
          this.canUndo = !report.rejected_before_applying && this.appliedCount > 0;
        });
    } catch {
      this.attached = false;
      this.error = this.hostService.lastError;
    }
  }

  onUndo(): void {
    this.flowOps.undoLast();
    this.canUndo = false;
    // The whole batch has been taken back, so "Applied 3 changes" is now
    // simply wrong about the flow. Any failures the report also carried are
    // left standing: undo did not make those operations happen.
    this.appliedCount = 0;
  }

  ngOnDestroy(): void {
    this.appliedSub?.unsubscribe();
    this.hostService.detach();
    this.stopDragListeners();
    window.removeEventListener('resize', this.onWindowResize);
  }

  // --- Resize -------------------------------------------------------------
  //
  // The width lives on the CSS custom property the stylesheet already reads
  // (--agent-chat-width, declared globally in _variables.scss at 420px):
  // dragging overrides it as an inline style on this element only, so every
  // rule that already keys off the variable (the open/closed width, the
  // sanity of any other consumer of the same var) keeps working unchanged,
  // and a reset is just removing the override to fall back to the global
  // default -- no separate "current width" style path to keep in sync.

  onResizeStart(event: MouseEvent): void {
    event.preventDefault();
    this.resizing = true;
    // The host's own width transition is for open/close; live-dragging with
    // it still active makes the edge chase the cursor on a 0.2s ease curve
    // instead of tracking it 1:1, so it is suspended for the gesture.
    this.elementRef.nativeElement.classList.add('is-resizing');
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.elementRef.nativeElement.getBoundingClientRect().width;
    this.currentWidth = this.dragStartWidth;
    document.addEventListener('mousemove', this.onDragMove);
    document.addEventListener('mouseup', this.onDragEnd);
    // Belt-and-braces exits for a drag that never gets a `mouseup` delivered
    // to this document at all: the window loses focus (alt-tab, click into
    // another app while the button happens to still be down at the OS
    // level), or the user bails out with Escape. handleDragMove's own
    // event.buttons === 0 check covers the remaining case -- the pointer
    // re-entering the window after the button was already released outside
    // it, which arrives as a plain mousemove with no mouseup ever firing.
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('keydown', this.onKeyDown);
  }

  private handleDragMove(event: MouseEvent): void {
    if (!this.resizing) {
      return;
    }
    if (event.buttons === 0) {
      // The button was released somewhere this document never saw a mouseup
      // for (typically outside the browser window), and the pointer has now
      // moved back over us with nothing held. Treat it exactly as an end of
      // drag rather than continuing to resize with no button down.
      this.handleDragEnd();
      return;
    }
    const delta = event.clientX - this.dragStartX;
    this.currentWidth = this.clampWidth(this.dragStartWidth + delta);
    this.applyWidth(this.currentWidth);
  }

  private handleDragEnd(): void {
    if (!this.resizing) {
      return;
    }
    this.resizing = false;
    this.elementRef.nativeElement.classList.remove('is-resizing');
    this.stopDragListeners();
    const rounded = Math.round(this.currentWidth);
    // A plain click on the handle -- mousedown immediately followed by
    // mouseup, no movement in between -- must not pin whatever width was
    // already in effect (often just the untouched stylesheet default) into
    // storage as an explicit override.
    if (rounded !== Math.round(this.dragStartWidth)) {
      this.preferredWidth = rounded;
      this.persistWidth(rounded);
    }
  }

  private stopDragListeners(): void {
    document.removeEventListener('mousemove', this.onDragMove);
    document.removeEventListener('mouseup', this.onDragEnd);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  /** Double-click on the handle: back to the stylesheet default. */
  onResizeReset(): void {
    this.preferredWidth = null;
    this.elementRef.nativeElement.style.removeProperty('--agent-chat-width');
    this.removePersistedWidth();
  }

  /** Re-clamps the last width the user actually chose against the current
   *  window size, without ever writing to storage: shrinking the window
   *  clamps what's on screen; growing it back restores the full preferred
   *  value from the same unmodified number, rather than from whatever a
   *  temporary clamp had reduced it to. A no-op when the panel has never
   *  been given an explicit width (still on the stylesheet default). */
  private reclampToWindow(): void {
    if (this.preferredWidth === null) {
      return;
    }
    this.applyWidth(this.clampWidth(this.preferredWidth));
  }

  private clampWidth(px: number): number {
    return Math.min(Math.max(px, CdsPanelAgentChatComponent.MIN_WIDTH), this.maxWidth());
  }

  /** 50% of the canvas host's width -- this component is now mounted as the
   *  first child of that flex row, so its own parentElement *is* the canvas
   *  host, with no extra lookup needed. */
  private maxWidth(): number {
    const parentWidth = this.elementRef.nativeElement.parentElement?.clientWidth ?? 0;
    const base = parentWidth > 0 ? parentWidth : window.innerWidth;
    return Math.max(CdsPanelAgentChatComponent.MIN_WIDTH, Math.floor(base / 2));
  }

  private applyWidth(px: number): void {
    this.elementRef.nativeElement.style.setProperty('--agent-chat-width', `${px}px`);
  }

  private restorePersistedWidth(): void {
    const stored = this.readStorage(CdsPanelAgentChatComponent.WIDTH_STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = parseInt(stored, 10);
    // A corrupt value (NaN from a non-numeric string, or anything from a
    // future/foreign format written under the same key) must not break the
    // layout -- fall back to the stylesheet default exactly as if nothing
    // were stored, rather than applying an unusable width. Negative or huge
    // numbers are legitimately clamped, not rejected: clampWidth already
    // pulls them back into [MIN_WIDTH, maxWidth()].
    if (!Number.isFinite(parsed)) {
      return;
    }
    this.preferredWidth = parsed;
    this.applyWidth(this.clampWidth(parsed));
  }

  private persistWidth(px: number): void {
    this.writeStorage(CdsPanelAgentChatComponent.WIDTH_STORAGE_KEY, String(px));
  }

  private removePersistedWidth(): void {
    try {
      localStorage.removeItem(CdsPanelAgentChatComponent.WIDTH_STORAGE_KEY);
    } catch {
      // Storage unavailable (privacy mode, disabled cookies/storage): the
      // width simply won't survive a reload, which is not worth surfacing.
    }
  }

  private readStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Same as above: best-effort persistence only.
    }
  }
}
