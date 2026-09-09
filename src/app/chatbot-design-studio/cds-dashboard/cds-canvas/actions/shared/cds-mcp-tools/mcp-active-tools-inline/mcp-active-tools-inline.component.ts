import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter,
  Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild
} from '@angular/core';

/**
 * Renders a comma-joined list of tool names on a single clipped line and shows a "more.." link
 * ONLY when the names actually overflow the line (measured with ResizeObserver). Clicking "more.."
 * emits `more` so the host can open a popup with the full list. Read-only, action-agnostic.
 */
@Component({
  selector: 'mcp-active-tools-inline',
  templateUrl: './mcp-active-tools-inline.component.html',
  styleUrls: ['./mcp-active-tools-inline.component.scss']
})
export class McpActiveToolsInlineComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() names: string[] = [];
  @Output() more = new EventEmitter<MouseEvent>();

  @ViewChild('namesEl') namesEl: ElementRef<HTMLElement>;

  /** Text shown inline; empty → the template renders an em-dash. */
  displayText = '';
  /** True when the joined names don't fit the line (drives the "more.." link). */
  isOverflowing = false;

  private resizeObserver: ResizeObserver;
  private destroyed = false;

  constructor(private readonly cdr: ChangeDetectorRef) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['names']) {
      const next = this.names?.length ? this.names.join(', ') : '';
      if (next !== this.displayText) {
        this.displayText = next;
        // Measure after the new content has been rendered to the DOM.
        Promise.resolve().then(() => this.measure());
      }
    }
  }

  ngAfterViewInit(): void {
    const el = this.namesEl?.nativeElement;
    if (el && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.measure());
      this.resizeObserver.observe(el);
    }
    // Fallback initial measure (also covers environments without ResizeObserver).
    Promise.resolve().then(() => this.measure());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
  }

  onMoreClick(event: MouseEvent): void {
    // The parent card is a <button> that toggles selection — stop it here.
    event.stopPropagation();
    this.more.emit(event);
  }

  private measure(): void {
    if (this.destroyed) {
      return;
    }
    const el = this.namesEl?.nativeElement;
    if (!el) {
      return;
    }
    // +1px tolerance to avoid sub-pixel false positives.
    const overflow = el.scrollWidth > el.clientWidth + 1;
    if (overflow !== this.isOverflowing) {
      this.isOverflowing = overflow;
      this.cdr.detectChanges();
    }
  }
}
