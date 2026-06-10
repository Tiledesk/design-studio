import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy, NgZone } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Note } from 'src/app/models/note-model';
import { StageService } from '../../../services/stage.service';
import { NoteService } from 'src/app/services/note.service';
import { NoteResizeStateService } from '../note-resize-state.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { firstValueFrom, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'cds-notes',
  templateUrl: './cds-notes.component.html',
  styleUrls: ['./cds-notes.component.scss']
})
export class CdsNotesComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  // ============================================================================
  // PROPRIETÀ PUBBLICHE - Decoratori e Input/Output
  // ============================================================================
  @Input() note: Note;
  @Input() IS_OPEN_PANEL_NOTE_DETAIL: boolean = false;
  @Input() autoFocus: boolean = false;
  @Output() noteSelected = new EventEmitter<Note>();
  @Output() autoFocused = new EventEmitter<string>();
  @Output() deleteNote = new EventEmitter<Note>();
  @Output() duplicateNote = new EventEmitter<Note>();
  @ViewChild('noteInput', { static: false }) noteInput: ElementRef<HTMLDivElement>;
  @ViewChild('noteContentElement', { static: false }) contentElement: ElementRef<HTMLDivElement>;

  // ============================================================================
  // PROPRIETÀ PUBBLICHE - Stato del componente
  // ============================================================================
  textareaHasFocus = false;
  dragged = false;  
  stateNote: 0|1|2|3 = 0; // 0: normal, 1: text focus, 2: selected, 3: dropping
  noteText: string;
  sanitizedNoteHtml: SafeHtml;
  private embedUrlCache: string = '';
  private safeEmbedUrlCache: SafeResourceUrl | null = null;

  // ============================================================================
  // PROPRIETÀ PRIVATE - Timer e sottoscrizioni
  // ============================================================================
  // private openPanelTimer: any = null;
  private singleClickTimer: any = null;
  private noteUpdatedSubscription: Subscription;
  private mutationObserver: MutationObserver | null = null;
  private hasAutoFocusedOnce = false;

  // ============================================================================
  // PROPRIETÀ PRIVATE - Resize
  // ============================================================================
  private isResizing = false;
  private isHorizontalResizing = false; // Flag per resize orizzontale simmetrico
  private isVerticalResizing = false; // Flag per resize verticale simmetrico
  private resizeHandle: string = '';
  private startX = 0;
  private startY = 0;
  private startWidth = 0; // Dimensioni base (rimangono fisse, usiamo scale per ridimensionare)
  private startHeight = 0; // Dimensioni base (rimangono fisse, usiamo scale per ridimensionare)
  private startScale = 1; // Scale iniziale
  private startScaleX = 1; // Scale X iniziale (per resize non proporzionale)
  private startScaleY = 1; // Scale Y iniziale (per resize non proporzionale)
  private startCenterX = 0; // Centro iniziale del box (per calcolo scale rispetto al centro)
  private startCenterY = 0; // Centro iniziale del box (per calcolo scale rispetto al centro)
  private startDistanceFromCenter = 0; // Distanza iniziale del mouse dal centro
  private startDxAbsFromCenter = 0; // |dx| iniziale (per resize non proporzionale)
  private startDyAbsFromCenter = 0; // |dy| iniziale (per resize non proporzionale)
  private startLeft = 0; // Posizione X iniziale CSS per resize orizzontale
  private startCenterXReal = 0; // Centro X reale iniziale in viewport per resize orizzontale
  private startHostLeftViewport = 0; // Posizione X iniziale dell'host in viewport per resize orizzontale
  /**
   * Costante (viewport) che rappresenta l'offset "layout" tra host e content,
   * separando il contributo geometrico dovuto allo scale con origin al centro.
   *
   * Modello (rotation ~ 0):
   * contentLeftViewport = hostLeftViewport + C + widthBase * (1 - scale) / 2
   * contentRightViewport = hostLeftViewport + C + widthBase * (1 + scale) / 2
   */
  private startContentCViewport = 0;
  private startFixedLeftViewport = 0; // Bordo sinistro iniziale (viewport) per resize non-simmetrico
  private startFixedRightViewport = 0; // Bordo destro iniziale (viewport) per resize non-simmetrico
  private currentBaseWidth = 0; // Larghezza base corrente (può essere modificata dal resize orizzontale)
  private rafHorizontalResizeId: number | null = null;
  private lastHorizontalClientX: number | null = null;
  /** Contatore frame per log resize orizzontale (diagnostica flicker) */
  private horizontalResizeFrameCount = 0;
  private startTop = 0; // Posizione Y iniziale CSS per resize verticale
  private startCenterYReal = 0; // Centro Y reale iniziale in viewport per resize verticale
  private startHostTopViewport = 0; // Posizione Y iniziale dell'host in viewport per resize verticale
  private startFixedTopViewport = 0; // Bordo superiore iniziale (viewport) per resize verticale non-simmetrico
  private startFixedBottomViewport = 0; // Bordo inferiore iniziale (viewport) per resize verticale non-simmetrico
  /**
   * Costante (viewport) che rappresenta l'offset "layout" tra host e content,
   * separando il contributo geometrico dovuto allo scale con origin al centro.
   *
   * Modello (rotation ~ 0):
   * contentTopViewport = hostTopViewport + C + heightBase * (1 - scale) / 2
   * contentBottomViewport = hostTopViewport + C + heightBase * (1 + scale) / 2
   */
  private startContentCViewportY = 0;
  private rafVerticalResizeId: number | null = null;
  private lastVerticalClientY: number | null = null;
  private currentBaseHeight = 0; // Altezza base corrente (può essere modificata dal resize verticale)
  private justFinishedResizing = false;
  private gestureStageZoom = 1; // Zoom dello stage al momento dell'inizio gesture (tds_drawer scale)
  /** Rect corner resize: viewport del content all'avvio (vertice opposto fisso). */
  private startRectLeft = 0;
  private startRectTop = 0;
  private startRectRight = 0;
  private startRectBottom = 0;

  // PROPRIETÀ PRIVATE - Rotazione
  // ============================================================================
  private isRotating = false;
  private startRotationAngle = 0; // Angolo iniziale di rotazione
  private centerX = 0; // Centro X della nota
  private centerY = 0; // Centro Y della nota

  get isGestureActive(): boolean {
    return this.isResizing || this.isHorizontalResizing || this.isVerticalResizing || this.isRotating;
  }

  // PROPRIETÀ PRIVATE - Timing click
  // ============================================================================
  private mouseDownTimestamp: number = 0; // Timestamp del mouse down sulla nota

  // ============================================================================
  // PROPRIETÀ PRIVATE - Drag listeners
  // ============================================================================
  private draggedListener: EventListener | null = null;
  private draggingListener: EventListener | null = null;
  
  // ============================================================================
  // PROPRIETÀ PRIVATE - Servizi e logger
  // ============================================================================
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  // ============================================================================
  // GETTER
  // ============================================================================
  get isDraggable(): boolean {
    return this.stateNote !== 1 && !this.textareaHasFocus;
  }

  get isTextNote(): boolean {
    return !this.note?.type || this.note.type === 'text';
  }

  get isMediaNote(): boolean {
    return this.note?.type === 'media';
  }

  get mediaType(): 'image' | 'video' {
    const t = ((this.note?.payload as any)?.mediaType as string) || '';
    if (t === 'video') return 'video';
    return 'image';
  }

  get isEmbedMedia(): boolean {
    return this.isMediaNote && ((this.note?.payload as any)?.renderMode as string) === 'embed';
  }

  get embedUrl(): string {
    return (((this.note?.payload as any)?.embedUrl as string) || '');
  }

  get safeEmbedUrl(): SafeResourceUrl | null {
    const url = this.embedUrl;
    if (!url) return null;
    // IMPORTANT: cache the SafeResourceUrl object to avoid iframe reload loops.
    // Angular change detection runs frequently; creating a new SafeResourceUrl each time
    // makes `[src]` appear "changed" and forces a reload.
    if (url !== this.embedUrlCache) {
      this.embedUrlCache = url;
      this.safeEmbedUrlCache = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return this.safeEmbedUrlCache;
  }

  get mediaSrc(): string {
    return (
      ((this.note?.payload as any)?.mediaSrc as string) ||
      ((this.note?.payload as any)?.imageSrc as string) ||
      ''
    );
  }

  get hasMedia(): boolean {
    if (this.isEmbedMedia) {
      return typeof this.embedUrl === 'string' && this.embedUrl.trim().length > 0;
    }
    const src = this.mediaSrc;
    return typeof src === 'string' && src.trim().length > 0;
  }

  // ============================================================================
  // COSTRUTTORE
  // ============================================================================
  constructor(
    private stageService: StageService,
    private noteService: NoteService,
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef,
    private ngZone: NgZone,
    private noteResizeState: NoteResizeStateService
  ) { }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  ngOnInit(): void {
    this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Log diagnostica flicker: se durante resize orizzontale il parent ri-applica gli input (note), la CD può causare flicker
    if (changes['note'] && !changes['note'].firstChange && this.isHorizontalResizing) {
      this.logger.log('[CDS-NOTES-H-RESIZE] ngOnChanges: note input changed DURANTE resize orizzontale', {
        noteId: this.note?.note_id,
        previousValue: changes['note'].previousValue?.note_id,
        currentValue: changes['note'].currentValue?.note_id
      });
    }
    if (changes['note'] && this.note) {
      // Solo per note testuali
      if (!this.isTextNote) {
        return;
      }
      const noteChange = changes['note'];
      
      if (noteChange.isFirstChange()) {
        this.noteText = this.note.text || '';
        this.updateSanitizedHtml();
      } else {
        const newText = this.note.text || '';
        if (this.noteText !== newText && !this.textareaHasFocus) {
          this.noteText = newText;
          if (this.noteInput) {
            if (this.noteInput.nativeElement.innerHTML !== newText) {
              this.noteInput.nativeElement.innerHTML = newText;
            }
          }
          this.updateSanitizedHtml();
        }
      }
    }

    if (changes['autoFocus'] && changes['autoFocus'].currentValue === true) {
      this.tryAutoFocusText();
    }
  }

  ngAfterViewInit(): void {
    if (this.contentElement && this.note) {
      // Calcola e applica il font-size basandosi su note.width (proporzione inversa)
      this.calculateAndApplyFontSize();
      
      // Applica fontFamily
      if (this.noteInput) {
        this.noteInput.nativeElement.style.fontFamily = this.note.fontFamily;
      }
      
      // Applica scale, dimensioni e trasformazioni usando la funzione riutilizzabile
      this.applyScaleAndTransform();
      
      // Setup listeners e drag
      this.setupAllListeners();
      this.updateDragState();
      this.updateChildrenDraggableClass();
      this.setupMutationObserver();
    }

    // If the note was created with autoFocus, apply it after the first render.
    this.tryAutoFocusText();
  }

  private tryAutoFocusText(): void {
    if (this.hasAutoFocusedOnce) return;
    if (!this.autoFocus) return;
    if (!this.note || !this.isTextNote) return;
    if (!this.noteInput) return;

    // Let Angular finish binding + DOM settle.
    setTimeout(() => {
      if (this.hasAutoFocusedOnce) return;
      if (!this.autoFocus) return;
      if (!this.note || !this.isTextNote) return;
      if (!this.noteInput) return;

      this.changeState(1); // focuses contenteditable + caret at end
      this.hasAutoFocusedOnce = true;
      this.autoFocused.emit(this.note.note_id);
    }, 0);
  }

  ngOnDestroy(): void {
    // Rimuovi listener drag
    if (this.draggingListener) {
      document.removeEventListener("dragged", this.draggingListener, false);
    }
    if (this.draggedListener) {
      document.removeEventListener("end-dragging", this.draggedListener, false);
    }
    
    // Pulisci timer
    // this.cancelOpenPanelTimer();
    this.cancelSingleClickTimer();
    
    // Rimuovi sottoscrizioni
    if (this.noteUpdatedSubscription) {
      this.noteUpdatedSubscription.unsubscribe();
    }
    
    // Disconnetti MutationObserver
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }

  // ============================================================================
  // @HOSTLISTENER - Eventi globali del documento
  // ============================================================================
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    // Gestione rotazione
    if (this.isRotating && this.contentElement && this.note) {
      this.handleRotation(event);
      return;
    }
    
    // Gestione resize orizzontale simmetrico
    if (this.isHorizontalResizing && this.contentElement && this.note) {
      this.handleHorizontalResize(event);
      return;
    }

    // Gestione resize verticale simmetrico
    if (this.isVerticalResizing && this.contentElement && this.note) {
      this.handleVerticalResize(event);
      return;
    }
    
    // Gestione resize con transform: scale()
    if (!this.isResizing || !this.contentElement || !this.note) return;
    
    const minScale = 0.1; // Scale minimo (10% della dimensione originale)
    const maxScale = 10; // Scale massimo (1000% della dimensione originale)
    
    const currentDx = event.clientX - this.startCenterX;
    const currentDy = event.clientY - this.startCenterY;
    const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
    
    let scaleX = this.startScale;
    let scaleY = this.startScale;
    let transformOrigin = 'center center';

    const isRect = this.note?.type === 'rect';
    const isCornerHandle = this.resizeHandle === 'tl' || this.resizeHandle === 'tr' || this.resizeHandle === 'bl' || this.resizeHandle === 'br';

    if (isRect && isCornerHandle) {
      // Rect: vertice opposto fisso. Dimensione minima 40x40 px, nessun limite massimo.
      const MIN_RECT_SIZE_PX = 40;
      const minScaleXRect = MIN_RECT_SIZE_PX / this.startWidth;
      const minScaleYRect = MIN_RECT_SIZE_PX / this.startHeight;
      const zoom = this.gestureStageZoom || this.getSafeStageZoom();
      const wBase = this.startWidth * zoom;
      const hBase = this.startHeight * zoom;
      let newW = 0;
      let newH = 0;
      switch (this.resizeHandle) {
        case 'br':
          newW = event.clientX - this.startRectLeft;
          newH = event.clientY - this.startRectTop;
          transformOrigin = '0 0';
          break;
        case 'bl':
          newW = this.startRectRight - event.clientX;
          newH = event.clientY - this.startRectTop;
          transformOrigin = '100% 0';
          break;
        case 'tr':
          newW = event.clientX - this.startRectLeft;
          newH = this.startRectBottom - event.clientY;
          transformOrigin = '0 100%';
          break;
        case 'tl':
          newW = this.startRectRight - event.clientX;
          newH = this.startRectBottom - event.clientY;
          transformOrigin = '100% 100%';
          break;
        default:
          break;
      }
      if (wBase > 0 && hBase > 0) {
        scaleX = Math.max(minScaleXRect, newW / wBase);
        scaleY = Math.max(minScaleYRect, newH / hBase);
      }
    } else {
      if (this.startDistanceFromCenter > 0) {
        const distanceRatio = currentDistance / this.startDistanceFromCenter;
        const newScale = this.startScale * distanceRatio;
        scaleX = Math.max(minScale, Math.min(maxScale, newScale));
        scaleY = scaleX; // Mantieni proporzioni perfette
      } else {
        const deltaX = event.clientX - this.startX;
        const deltaY = event.clientY - this.startY;
        const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
        const newScale = this.startScale + (avgDelta / ((this.startWidth + this.startHeight) / 2));
        scaleX = Math.max(minScale, Math.min(maxScale, newScale));
        scaleY = scaleX;
      }
    }
    
    const rotation = this.note.rotation || 0;
    const transform = `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`;
    
    if (this.contentElement) {
      this.contentElement.nativeElement.style.transform = transform;
      this.contentElement.nativeElement.style.transformOrigin = transformOrigin;
      this.updateHandlesScale(scaleX, scaleY);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
   
    
    if (this.isHorizontalResizing) {
      const hostElement = this.elementRef.nativeElement as HTMLElement;
      const finalLeft = parseFloat(hostElement.style.left);
      if (!isNaN(finalLeft)) this.note.x = finalLeft;
      this.noteResizeState.setHorizontalResize(null);
      // Ricalcola dimensioni e scale basandosi sul transform corrente
      this.applyScaleAndTransform();
      this.logger.log('[CDS-NOTES-H-RESIZE] onMouseUp: fine resize orizzontale', { totalFrames: this.horizontalResizeFrameCount });
      this.isHorizontalResizing = false;
      this.resizeHandle = '';
      // Cleanup rAF/will-change (riduce flicker post-gesture)
      if (this.rafHorizontalResizeId != null) {
        window.cancelAnimationFrame(this.rafHorizontalResizeId);
        this.rafHorizontalResizeId = null;
      }
      this.lastHorizontalClientX = null;
      if (this.contentElement) {
        this.contentElement.nativeElement.style.willChange = '';
      }
      hostElement.style.willChange = '';
      // this.changeState(0);
      this.justFinishedResizing = true;
      setTimeout(() => {
        this.justFinishedResizing = false;
      }, 100);
      this.updateNote();
    }

    else if (this.isVerticalResizing) {
      // Ricalcola dimensioni e scale basandosi sul transform corrente
      this.applyScaleAndTransform();
      this.isVerticalResizing = false;
      this.resizeHandle = '';
      // Cleanup rAF/will-change (riduce flicker post-gesture)
      if (this.rafVerticalResizeId != null) {
        window.cancelAnimationFrame(this.rafVerticalResizeId);
        this.rafVerticalResizeId = null;
      }
      this.lastVerticalClientY = null;
      if (this.contentElement) {
        this.contentElement.nativeElement.style.willChange = '';
      }
      const hostElement = this.elementRef.nativeElement as HTMLElement;
      hostElement.style.willChange = '';
      this.justFinishedResizing = true;
      setTimeout(() => {
        this.justFinishedResizing = false;
      }, 100);
      this.updateNote();
    }
    
   else if (this.isResizing) {
      this.logNoteBlockPosition('AL RILASCIO (prima di applyScaleAndTransform)');
      const isRectCorner = this.note?.type === 'rect' &&
        (this.resizeHandle === 'tl' || this.resizeHandle === 'tr' || this.resizeHandle === 'bl' || this.resizeHandle === 'br');
      if (isRectCorner && this.contentElement) {
        // Normalizza: porta origin a center e aggiorna host così il top-left del box resta fermo.
        // Con origin (ox,oy) e scale(sx,sy), top-left = (note.x + ox*(1-sx), note.y + oy*(1-sy)).
        // Con origin center (w/2, h/2), top-left = (newX + w*(1-sx)/2, newY + h*(1-sy)/2). Uguagliando si ricava newX, newY.
        const el = this.contentElement.nativeElement;
        const t = el.style.transform || '';
        const scaleMatch = t.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
        const sx = scaleMatch ? (parseFloat(scaleMatch[1]) || 1) : 1;
        const sy = scaleMatch && scaleMatch[2] ? (parseFloat(scaleMatch[2]) || sx) : sx;
        const w = this.note.width || this.startWidth;
        const h = this.note.height || this.startHeight;
        let newX: number;
        let newY: number;
        switch (this.resizeHandle) {
          case 'br': // origin 0,0: topLeft = (note.x, note.y) => newX + w*(1-sx)/2 = note.x
            newX = this.note.x - w * (1 - sx) / 2;
            newY = this.note.y - h * (1 - sy) / 2;
            break;
          case 'bl': // origin w,0: topLeft = (note.x + w*(1-sx), note.y)
            newX = this.note.x + w * (1 - sx) / 2;
            newY = this.note.y - h * (1 - sy) / 2;
            break;
          case 'tr': // origin 0,h: topLeft = (note.x, note.y + h*(1-sy))
            newX = this.note.x - w * (1 - sx) / 2;
            newY = this.note.y + h * (1 - sy) / 2;
            break;
          case 'tl': // origin w,h: topLeft = (note.x + w*(1-sx), note.y + h*(1-sy))
            newX = this.note.x + w * (1 - sx) / 2;
            newY = this.note.y + h * (1 - sy) / 2;
            break;
          default:
            newX = this.note.x;
            newY = this.note.y;
        }
        this.note.x = newX;
        this.note.y = newY;
        this.note.scale = [sx, sy];
        const hostEl = this.elementRef.nativeElement as HTMLElement;
        hostEl.style.left = newX + 'px';
        hostEl.style.top = newY + 'px';
        el.style.transformOrigin = 'center center';
        // Non chiamare applyScaleAndTransform: abbiamo già normalizzato; notesChanged$ lo chiamerà e non migrerà (origin già center).
      } else {
        // Ricalcola dimensioni e scale basandosi sul transform corrente (non rect corner)
        this.applyScaleAndTransform();
      }
      this.logNoteBlockPosition('AL RILASCIO (dopo applyScaleAndTransform)');
      this.isResizing = false;
      this.resizeHandle = '';
      // this.changeState(0);
      this.justFinishedResizing = true;
      setTimeout(() => {
        this.justFinishedResizing = false;
      }, 100);
      this.updateNote();
    }
    else if (this.isRotating) {
      this.isRotating = false;
      // Ricalcola dimensioni e scale dopo la rotazione
      this.applyScaleAndTransform();
      this.justFinishedResizing = true;
      setTimeout(() => {
        this.justFinishedResizing = false;
      }, 100);
      this.updateNote();
    } else if (this.mouseDownTimestamp > 0) {
      const mouseUpTimestamp = Date.now();
      const clickDuration = mouseUpTimestamp - this.mouseDownTimestamp;
      if(clickDuration < 100) {
        this.changeState(2);
        if (this.shouldOpenDetailPanelOnClick()) {
          this.noteSelected.emit(this.note);
        } else if (this.isMediaNote && !this.hasMedia) {
          this.noteSelected.emit(this.note);
        } else {
          this.noteSelected.emit(null);
        }
        this.logger.log('[NOTES] Click duration:', clickDuration, 'ms');
      }
      this.mouseDownTimestamp = 0; // Reset per il prossimo click
    }

  }

  // Fallback: if the user releases the mouse outside the window (or the window loses focus),
  // ensure we never remain "stuck" in a resize/rotate gesture. Keep this scoped to media notes to
  // minimize impact/regression risk.
  @HostListener('window:blur')
  onWindowBlur(): void {
    if (!this.isMediaNote) return;
    if (!this.isResizing && !this.isHorizontalResizing && !this.isVerticalResizing && !this.isRotating) return;
    this.onMouseUp(new MouseEvent('mouseup'));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if(this.justFinishedResizing) {
      return;
    }
    // If user is interacting with the note detail panel, do NOT deselect the note.
    // Otherwise controls like color pickers would close the panel due to this global handler.
    const target = event.target as HTMLElement | null;
    if (target) {
      const clickedInsideNoteDetailPanel = !!(target.closest('cds-panel-note-detail') || target.closest('.panel-note-detail'));
      if (clickedInsideNoteDetailPanel) {
        return;
      }
    }
    // Intercetta se il click è fuori dal div note
    if (this.contentElement) {
      const target = event.target as HTMLElement;
      const clickedInside = this.contentElement.nativeElement.contains(target);
      
      // Se il click è fuori dal div note, deseleziona
      if (!clickedInside) {
        this.changeState(0);
        this.updateDragState();
      }
    }
  }

  // ============================================================================
  // EVENT HANDLERS - Chiamati dal template
  // ============================================================================
  onNoteInputClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (this.stateNote === 1) {
      event.stopPropagation();
      return;
    }
    
    const isLink = target.tagName === 'A' || target.closest('a') !== null;
    
    if (isLink) {
      this.handleLinkClick(target, event);
      return;
    }
    
    if (this.dragged) {
      this.dragged = false;
      if (!this.isDraggable) {
        event.stopPropagation();
      }
      return;
    }
    
    this.cancelSingleClickTimer();
    // this.singleClickTimer = setTimeout(() => {
      this.changeState(2);
      this.updateDragState();
      if (this.shouldOpenDetailPanelOnClick()) {
        this.noteSelected.emit(this.note);
      }
      this.singleClickTimer = null;
    // }, 100);
    
    if (!this.isDraggable) {
      event.stopPropagation();
    }
  }

  onNoteInputDoubleClick(event: MouseEvent): void {
    if (this.stateNote === 1) {
      event.stopPropagation();
      return;
    }
    
    event.stopPropagation();
    this.cancelSingleClickTimer();
    this.changeState(1);
    this.updateDragState();
  }

  onNoteInputMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Salva il timestamp del mouse down
    this.mouseDownTimestamp = Date.now();
    
    this.logger.log('[CDS-NOTES] onNoteInputMouseDown - stateNote:', this.stateNote, 'isDraggable:', this.isDraggable, 'target:', target, 'hasTdsDraggable:', target.classList.contains('tds_draggable'));
    
    if (this.stateNote === 1) {
      event.stopPropagation();
      return;
    }
    
    const isLink = target.tagName === 'A' || target.closest('a') !== null;
    if (isLink) {
      return;
    }
    
    if (this.isDraggable) {
      if (this.noteInput && this.noteInput.nativeElement.contains(target) && target !== this.noteInput.nativeElement) {
        target.classList.add('tds_draggable');
        this.logger.log('[CDS-NOTES] onNoteInputMouseDown - Added tds_draggable class to child element:', target);
      }
      return;
    }
    
    event.stopPropagation();
  }

  // ============================================================================
  // EVENT HANDLERS - Surface (valido per tutti i tipi)
  // ============================================================================
  onNoteSurfaceClick(event: MouseEvent): void {
    if (this.isTextNote) {
      this.onNoteInputClick(event);
      return;
    }
    // console.log('[CDS-NOTES-CLICK] Click su superficie blocco note (prima di onRectClick)', {
    //   noteId: this.note?.note_id,
    //   type: this.note?.type,
    //   modelXY: this.note ? { x: this.note.x, y: this.note.y } : null,
    //   hostStyle: this.elementRef?.nativeElement ? { left: (this.elementRef.nativeElement as HTMLElement).style?.left, top: (this.elementRef.nativeElement as HTMLElement).style?.top } : null,
    // });
    this.onRectClick(event);
  }

  onNoteSurfaceDoubleClick(event: MouseEvent): void {
    if (this.isTextNote) {
      this.onNoteInputDoubleClick(event);
      return;
    }
    this.onRectDoubleClick(event);
  }

  onNoteSurfaceMouseDown(event: MouseEvent): void {
    if (this.isTextNote) {
      this.onNoteInputMouseDown(event);
      return;
    }
    this.onRectMouseDown(event);
  }

  // ============================================================================
  // EVENT HANDLERS - Rect note
  // ============================================================================
  onRectClick(event: MouseEvent): void {
    // Per i tipi non testuali: click seleziona (no focus)
    if (this.stateNote === 1) {
      event.stopPropagation();
      return;
    }

    if (this.dragged) {
      this.dragged = false;
      if (!this.isDraggable) {
        event.stopPropagation();
      }
      return;
    }

    this.cancelSingleClickTimer();
    // console.log('[CDS-NOTES-CLICK] onRectClick: prima di changeState(2)', {
    //   noteId: this.note?.note_id,
    //   modelXY: this.note ? { x: this.note.x, y: this.note.y } : null,
    // });
    this.changeState(2);
    this.updateDragState();
    if (this.shouldOpenDetailPanelOnClick()) {
      this.noteSelected.emit(this.note);
    } else {
      // Media notes (image/video):
      // - if still empty (placeholder), open detail panel so the user can add content
      // - if it already has content, selecting the note must close the detail panel if open
      if (this.isMediaNote && !this.hasMedia) {
        this.noteSelected.emit(this.note);
      } else {
        this.noteSelected.emit(null);
      }
    }

    if (!this.isDraggable) {
      event.stopPropagation();
    }
  }

  onRectDoubleClick(event: MouseEvent): void {
    // Nessun editing per rect: manteniamo solo la selezione
    event.stopPropagation();
    this.cancelSingleClickTimer();
    this.changeState(2);
    this.updateDragState();
  }

  onRectMouseDown(event: MouseEvent): void {
    // Timestamp per coerenza con la logica click-duration (mouseup)
    this.mouseDownTimestamp = Date.now();
    if (this.stateNote === 1) {
      event.stopPropagation();
      return;
    }

    if (this.isDraggable) {
      return;
    }
    event.stopPropagation();
  }

  onInputChange(event: Event): void {
    const editableDiv = event.target as HTMLDivElement;
    if (this.note) {
      this.note.text = editableDiv.innerHTML;
    }
  }

  onFocusTextarea(event: FocusEvent): void {
    this.changeState(1);
    this.updateDragState();
  }

  onBlurTextarea(event: FocusEvent): void {
    this.changeState(0);
    this.updateDragState();
    this.updateSanitizedHtml();
    this.updateNote();
  }

  startResize(event: MouseEvent, handle: string): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.contentElement || !this.note) return;
    
    this.logNoteBlockPosition('PRIMA DEL CLICK (maniglia: ' + handle + ')');
    this.isResizing = true;
    this.resizeHandle = handle;
    this.startX = event.clientX;
    this.startY = event.clientY;
    
    // Calcola lo scale iniziale dal transform corrente (se presente)
    const currentTransform = this.contentElement.nativeElement.style.transform || '';
    const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
    
    // Determina lo scale iniziale con priorità:
    // 1. Transform CSS corrente
    // 2. Valore scale nel modello
    // 3. Calcolo da dimensioni reali
    if (scaleMatch) {
      // C'è già uno scale nel transform, usa quello
      this.startScale = parseFloat(scaleMatch[1]) || 1;
    } else if (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 1) {
      // Usa il valore scale dal modello
      this.startScale = this.note.scale[0];
    } else {
      // Calcola lo scale dalle dimensioni reali del modello
      // Usa i valori da note (garantiti da initializeDefaults)
      const baseWidth = this.note.width;
      const baseHeight = this.note.height;
      const realWidth = this.note.width;
      const realHeight = this.note.height;
      this.startScale = Math.min(realWidth / baseWidth, realHeight / baseHeight);
    }
    
    // Imposta le dimensioni base nel DOM per i vertici
    // Usa i valori da note (garantiti da initializeDefaults)
    this.startWidth = this.note.width;
    this.startHeight = this.note.height;
    this.contentElement.nativeElement.style.width = this.startWidth + 'px';
    this.contentElement.nativeElement.style.height = this.startHeight + 'px';
    
    // Calcola lo scale corrente
    const currentScaleX = this.startScale;
    const currentScaleY = scaleMatch && scaleMatch[2] ? parseFloat(scaleMatch[2]) : 
                          (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 2) ? 
                          this.note.scale[1] : currentScaleX;
    this.startScaleX = currentScaleX;
    this.startScaleY = currentScaleY;
    
    const rect = this.contentElement.nativeElement.getBoundingClientRect();
    const isRect = this.note.type === 'rect';
    const isCornerHandle = handle === 'tl' || handle === 'tr' || handle === 'bl' || handle === 'br';
    
    let transformOrigin: string;
    if (isRect && isCornerHandle) {
      // Rect: vertice opposto fisso. Salviamo viewport e zoom per il move.
      this.gestureStageZoom = this.getSafeStageZoom();
      this.startRectLeft = rect.left;
      this.startRectTop = rect.top;
      this.startRectRight = rect.right;
      this.startRectBottom = rect.bottom;
      // transform-origin sul vertice opposto alla maniglia
      switch (handle) {
        case 'br': transformOrigin = '0 0'; break;           // fisso TL
        case 'bl': transformOrigin = '100% 0'; break;       // fisso TR
        case 'tr': transformOrigin = '0 100%'; break;       // fisso BL
        case 'tl': transformOrigin = '100% 100%'; break;    // fisso BR
        default: transformOrigin = 'center center';
      }
      // Per il branch rect+corner in onMouseMove non usiamo centro/distanza
      this.startCenterX = rect.left + rect.width / 2;
      this.startCenterY = rect.top + rect.height / 2;
      this.startDistanceFromCenter = 0;
      this.startDxAbsFromCenter = 0;
      this.startDyAbsFromCenter = 0;
    } else {
      // Centro fisso (comportamento storico)
      transformOrigin = 'center center';
      this.startCenterX = rect.left + rect.width / 2;
      this.startCenterY = rect.top + rect.height / 2;
      const dx = this.startX - this.startCenterX;
      const dy = this.startY - this.startCenterY;
      this.startDistanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      this.startDxAbsFromCenter = Math.abs(dx);
      this.startDyAbsFromCenter = Math.abs(dy);
    }
    
    this.contentElement.nativeElement.style.transformOrigin = transformOrigin;
    
    // Preserva lo scale e la rotazione corrente
    const rotation = this.note.rotation || 0;
    const transform = `scale(${currentScaleX}, ${currentScaleY}) rotate(${rotation}deg)`;
    this.contentElement.nativeElement.style.transform = transform;
    
    // Rect corner: sposta l'host così il vertice fissato (transform-origin) resta nella stessa posizione.
    // Con origin center il box è centrato su (note.x + w/2, note.y + h/2); con origin a un vertice
    // quel vertice deve restare dove era, quindi aggiorniamo note.x/y e lo stile dell'host.
    if (isRect && isCornerHandle) {
      const w = this.startWidth;
      const h = this.startHeight;
      const sx = currentScaleX;
      const sy = currentScaleY;
      let newX = this.note.x;
      let newY = this.note.y;
      switch (handle) {
        case 'br': newX = this.note.x + w * (1 - sx) / 2; newY = this.note.y + h * (1 - sy) / 2; break;
        case 'bl': newX = this.note.x + w * (sx - 1) / 2; newY = this.note.y + h * (1 - sy) / 2; break;
        case 'tr': newX = this.note.x + w * (1 - sx) / 2; newY = this.note.y + h * (sy - 1) / 2; break;
        case 'tl': newX = this.note.x + w * (sx - 1) / 2; newY = this.note.y + h * (sy - 1) / 2; break;
        default: break;
      }
      this.note.x = newX;
      this.note.y = newY;
      const hostEl = this.elementRef.nativeElement as HTMLElement;
      hostEl.style.left = newX + 'px';
      hostEl.style.top = newY + 'px';
    }
    
    // Aggiorna anche gli handle
    this.updateHandlesScale(currentScaleX, currentScaleY);
    
    this.changeState(2);
    this.logNoteBlockPosition('SUBITO DOPO CLICK (maniglia: ' + handle + ')');
  }

  /**
   * Inizia il ridimensionamento orizzontale NON simmetrico:
   * - handle right: si espande solo verso destra mantenendo fisso il bordo sinistro
   * - handle left: si espande solo verso sinistra mantenendo fisso il bordo destro
   */
  startHorizontalResize(event: MouseEvent, handle: 'left' | 'right'): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.contentElement || !this.note) return;
    
    this.isHorizontalResizing = true;
    this.resizeHandle = handle;
    this.startX = event.clientX;
    this.startY = event.clientY;

    // IMPORTANT: stage zoom affects all viewport measurements (clientX/rect).
    // We keep all anchors in viewport px, but convert deltas back to CSS coords by dividing by stageZoom.
    this.gestureStageZoom = this.getSafeStageZoom();
    
    // Leggi la larghezza base corrente: usa note.width (garantito da initializeDefaults)
    // Se currentBaseWidth è stata modificata da resize orizzontale, usa quella, altrimenti note.width
    let currentWidth = this.currentBaseWidth > 0 ? this.currentBaseWidth : this.note.width;
    this.startWidth = currentWidth;
    this.currentBaseWidth = currentWidth; // Aggiorna anche currentBaseWidth
    
    // Leggi lo scale corrente (non deve essere modificato)
    const currentTransform = this.contentElement.nativeElement.style.transform || '';
    const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
    
    if (scaleMatch) {
      this.startScale = parseFloat(scaleMatch[1]) || 1;
    } else if (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 1) {
      this.startScale = this.note.scale[0];
    } else {
      this.startScale = 1;
    }
    
    // Salva i bordi reali del bounding box in viewport (ancore)
    const rect = this.contentElement.nativeElement.getBoundingClientRect();
    this.startFixedLeftViewport = rect.left;
    this.startFixedRightViewport = rect.right;
    // Manteniamo comunque questo campo per retro-compatibilità con altre parti
    this.startCenterXReal = rect.left + rect.width / 2;
    
    // Leggi la posizione X iniziale dell'host in viewport e CSS
    const hostElement = this.elementRef.nativeElement as HTMLElement;
    const hostRect = hostElement.getBoundingClientRect();
    this.startHostLeftViewport = hostRect.left;
    // Calcola C (viewport) isolando l'effetto dello scale con transform-origin al centro.
    // Questo evita che, con scale != 1, l'ancora "scivoli" durante il resize.
    const scale = this.startScale || 1;
    this.startContentCViewport =
      rect.left - hostRect.left - ((this.startWidth * (1 - scale)) / 2) * this.gestureStageZoom;
    
    const hostLeftCSS = parseFloat(hostElement.style.left);
    if (!isNaN(hostLeftCSS)) {
      this.startLeft = hostLeftCSS;
    } else {
      this.startLeft = this.note.x || 0;
    }

    // Performance: durante il resize vogliamo minimizzare reflow/jank.
    // - non aggiorniamo transform ad ogni mousemove (scale/rotation non cambiano qui)
    // - lasciamo il browser ottimizzare width/left
    this.contentElement.nativeElement.style.willChange = 'width';
    hostElement.style.willChange = 'left';

    this.horizontalResizeFrameCount = 0;
    this.logger.log('[CDS-NOTES-H-RESIZE] startHorizontalResize', {
      noteId: this.note.note_id,
      handle: handle,
      startWidth: this.startWidth,
      startLeft: this.startLeft,
      startFixedLeftViewport: this.startFixedLeftViewport,
      startFixedRightViewport: this.startFixedRightViewport
    });
    this.noteResizeState.setHorizontalResize(this.note.note_id, this.startLeft);

    // Assicuriamo che transform-origin/transform siano coerenti una volta sola
    const rotation = this.note.rotation || 0;
    const scaleForTransform = this.startScale || 1;
    this.contentElement.nativeElement.style.transformOrigin = 'center center';
    this.contentElement.nativeElement.style.transform = `scale(${scaleForTransform}, ${scaleForTransform}) rotate(${rotation}deg)`;
    this.updateHandlesScale(scaleForTransform, scaleForTransform);
    
    this.changeState(2);
  }

  /**
   * Inizia il ridimensionamento verticale simmetrico
   * Il centro verticale del div rimane fisso durante il resize
   */
  startVerticalResize(event: MouseEvent, handle: 'top' | 'bottom'): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.contentElement || !this.note) return;

    this.isVerticalResizing = true;
    this.resizeHandle = handle;
    this.startX = event.clientX;
    this.startY = event.clientY;

    this.gestureStageZoom = this.getSafeStageZoom();

    // Leggi l'altezza base corrente: usa note.height (garantito da initializeDefaults)
    // Se currentBaseHeight è stata modificata da resize verticale, usa quella, altrimenti note.height
    let currentHeight = this.currentBaseHeight > 0 ? this.currentBaseHeight : this.note.height;
    this.startHeight = currentHeight;
    this.currentBaseHeight = currentHeight;

    // Leggi lo scale corrente (non deve essere modificato)
    const currentTransform = this.contentElement.nativeElement.style.transform || '';
    const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);

    if (scaleMatch) {
      this.startScale = parseFloat(scaleMatch[1]) || 1;
    } else if (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 1) {
      this.startScale = this.note.scale[0];
    } else {
      this.startScale = 1;
    }

    // Calcola il centro Y reale iniziale in viewport (questo deve rimanere fisso)
    const rect = this.contentElement.nativeElement.getBoundingClientRect();
    this.startCenterYReal = rect.top + rect.height / 2;
    // Non-simmetrico: salviamo i bordi in viewport come ancore
    this.startFixedTopViewport = rect.top;
    this.startFixedBottomViewport = rect.bottom;

    // Leggi la posizione Y iniziale dell'host in viewport e CSS
    const hostElement = this.elementRef.nativeElement as HTMLElement;
    const hostRect = hostElement.getBoundingClientRect();
    this.startHostTopViewport = hostRect.top;
    // Calcola C (viewport) isolando l'effetto dello scale con transform-origin al centro.
    // Questo evita che, con scale != 1, l'ancora "scivoli" durante il resize.
    const scale = this.startScale || 1;
    this.startContentCViewportY =
      rect.top - hostRect.top - ((this.startHeight * (1 - scale)) / 2) * this.gestureStageZoom;

    const hostTopCSS = parseFloat(hostElement.style.top);
    if (!isNaN(hostTopCSS)) {
      this.startTop = hostTopCSS;
    } else {
      this.startTop = this.note.y || 0;
    }

    // Performance: minimizza reflow/jank durante la gesture
    this.contentElement.nativeElement.style.willChange = 'height';
    hostElement.style.willChange = 'top';

    // Assicuriamo che transform-origin/transform siano coerenti una volta sola
    const rotation = this.note.rotation || 0;
    const scaleForTransform = this.startScale || 1;
    this.contentElement.nativeElement.style.transformOrigin = 'center center';
    this.contentElement.nativeElement.style.transform = `scale(${scaleForTransform}, ${scaleForTransform}) rotate(${rotation}deg)`;
    this.updateHandlesScale(scaleForTransform, scaleForTransform);

    this.changeState(2);
  }

  /**
   * Calcola newWidth e newLeft per il resize orizzontale (stessa logica usata da performHorizontalResizeFrame).
   * Usato in mousemove per aggiornare subito il servizio, così la CD del parent legge già il valore giusto (niente flicker).
   */
  private computeHorizontalResizeValues(): { newWidth: number; newLeft: number } | null {
    if (!this.contentElement || !this.note || this.lastHorizontalClientX == null) return null;
    if (this.resizeHandle !== 'left' && this.resizeHandle !== 'right') return null;

    const scale = this.startScale || 1;
    const stageZoom = this.gestureStageZoom || this.getSafeStageZoom();

    let newWidth = this.startWidth;
    if (this.resizeHandle === 'right') {
      const visualWidth = this.lastHorizontalClientX - this.startFixedLeftViewport;
      newWidth = visualWidth / (scale * stageZoom);
    } else {
      const visualWidth = this.startFixedRightViewport - this.lastHorizontalClientX;
      newWidth = visualWidth / (scale * stageZoom);
    }
    const minWidth = 50;
    const maxWidth = 2000;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    const rotation = this.note.rotation || 0;
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isEffectivelyUnrotated = normalizedRotation < 0.01 || Math.abs(normalizedRotation - 360) < 0.01;

    let newLeft: number;
    if (isEffectivelyUnrotated) {
      let newHostLeftViewport = this.startHostLeftViewport;
      if (this.resizeHandle === 'right') {
        newHostLeftViewport =
          this.startFixedLeftViewport -
          this.startContentCViewport -
          ((newWidth * (1 - scale)) / 2) * stageZoom;
      } else {
        newHostLeftViewport =
          this.startFixedRightViewport -
          this.startContentCViewport -
          ((newWidth * (1 + scale)) / 2) * stageZoom;
      }
      const deltaViewport = newHostLeftViewport - this.startHostLeftViewport;
      newLeft = this.startLeft + deltaViewport / stageZoom;
    } else {
      // Ruotato: servizio aggiornato al frame prima; qui usiamo stima da formula non ruotata per evitare getBoundingClientRect nel mousemove
      let newHostLeftViewport = this.startHostLeftViewport;
      if (this.resizeHandle === 'right') {
        newHostLeftViewport =
          this.startFixedLeftViewport -
          this.startContentCViewport -
          ((newWidth * (1 - scale)) / 2) * stageZoom;
      } else {
        newHostLeftViewport =
          this.startFixedRightViewport -
          this.startContentCViewport -
          ((newWidth * (1 + scale)) / 2) * stageZoom;
      }
      newLeft = this.startLeft + (newHostLeftViewport - this.startHostLeftViewport) / stageZoom;
    }
    return { newWidth, newLeft };
  }

  /**
   * Gestisce il ridimensionamento orizzontale durante il movimento del mouse.
   * Aggiorna subito width del content e servizio (liveLeft) nel mousemove così, quando la CD
   * applica la nuova left dal parent, left e width sono coerenti (bordo opposto resta fisso, niente regressioni).
   * Il rAF riapplica DOM e servizio per coerenza.
   */
  private handleHorizontalResize(event: MouseEvent): void {
    if (!this.contentElement || !this.note) return;

    this.lastHorizontalClientX = event.clientX;
    const values = this.computeHorizontalResizeValues();
    if (values) {
      this.contentElement.nativeElement.style.width = values.newWidth + 'px';
      this.currentBaseWidth = values.newWidth;
      this.noteResizeState.setHorizontalResize(this.note.note_id, values.newLeft);
    }

    if (this.rafHorizontalResizeId != null) return;
    this.ngZone.runOutsideAngular(() => {
      this.rafHorizontalResizeId = window.requestAnimationFrame(() => {
        this.rafHorizontalResizeId = null;
        this.performHorizontalResizeFrame();
      });
    });
  }

  private performHorizontalResizeFrame(): void {
    if (!this.contentElement || !this.note) return;
    if (this.lastHorizontalClientX == null) return;

    const hostElement = this.elementRef.nativeElement as HTMLElement;
    const scale = this.startScale || 1;
    const stageZoom = this.gestureStageZoom || this.getSafeStageZoom();
    const rotation = this.note.rotation || 0;
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isEffectivelyUnrotated = normalizedRotation < 0.01 || Math.abs(normalizedRotation - 360) < 0.01;

    let newWidth = this.startWidth;
    if (this.resizeHandle === 'right') {
      const visualWidth = this.lastHorizontalClientX - this.startFixedLeftViewport;
      newWidth = visualWidth / (scale * stageZoom);
    } else if (this.resizeHandle === 'left') {
      const visualWidth = this.startFixedRightViewport - this.lastHorizontalClientX;
      newWidth = visualWidth / (scale * stageZoom);
    } else {
      return;
    }

    const minWidth = 50;
    const maxWidth = 2000;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    this.contentElement.nativeElement.style.width = newWidth + 'px';
    this.currentBaseWidth = newWidth;

    let newLeft = 0;
    if (isEffectivelyUnrotated) {
      let newHostLeftViewport = this.startHostLeftViewport;
      if (this.resizeHandle === 'right') {
        newHostLeftViewport =
          this.startFixedLeftViewport -
          this.startContentCViewport -
          ((newWidth * (1 - scale)) / 2) * stageZoom;
      } else {
        newHostLeftViewport =
          this.startFixedRightViewport -
          this.startContentCViewport -
          ((newWidth * (1 + scale)) / 2) * stageZoom;
      }
      const deltaViewport = newHostLeftViewport - this.startHostLeftViewport;
      newLeft = this.startLeft + deltaViewport / stageZoom;
      hostElement.style.left = newLeft + 'px';
      this.noteResizeState.setHorizontalResize(this.note.note_id, newLeft);
      this.ngZone.run(() => {});
    } else {
      const rectAfter = this.contentElement.nativeElement.getBoundingClientRect();
      const deltaViewport = this.resizeHandle === 'right'
        ? (this.startFixedLeftViewport - rectAfter.left)
        : (this.startFixedRightViewport - rectAfter.right);
      newLeft = this.startLeft + deltaViewport / stageZoom;
      hostElement.style.left = newLeft + 'px';
      this.noteResizeState.setHorizontalResize(this.note.note_id, newLeft);
      this.ngZone.run(() => {});
    }

    this.horizontalResizeFrameCount++;
  }

  /**
   * Gestisce il ridimensionamento verticale durante il movimento del mouse durante il movimento del mouse
   * Mantiene il centro verticale fisso e modifica solo l'altezza
   */
  private handleVerticalResize(event: MouseEvent): void {
    if (!this.contentElement || !this.note) return;

    // Batch su rAF: evita troppi layout per-frame su mousemove (soprattutto con scale != 1)
    this.lastVerticalClientY = event.clientY;
    if (this.rafVerticalResizeId != null) return;

    this.rafVerticalResizeId = window.requestAnimationFrame(() => {
      this.rafVerticalResizeId = null;
      this.performVerticalResizeFrame();
    });
  }

  private performVerticalResizeFrame(): void {
    if (!this.contentElement || !this.note) return;
    if (this.lastVerticalClientY == null) return;

    const hostElement = this.elementRef.nativeElement as HTMLElement;
    const scale = this.startScale || 1;
    const stageZoom = this.gestureStageZoom || this.getSafeStageZoom();
    const rotation = this.note.rotation || 0;
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isEffectivelyUnrotated = normalizedRotation < 0.01 || Math.abs(normalizedRotation - 360) < 0.01;

    // Calcolo della nuova altezza base (unscaled), ancorando un bordo in viewport:
    // - bottom: fixedTop + visualHeight(mouse)
    // - top:    fixedBottom - visualHeight(mouse)
    let newHeight = this.startHeight;
    if (this.resizeHandle === 'bottom') {
      const visualHeight = this.lastVerticalClientY - this.startFixedTopViewport;
      newHeight = visualHeight / (scale * stageZoom);
    } else if (this.resizeHandle === 'top') {
      const visualHeight = this.startFixedBottomViewport - this.lastVerticalClientY;
      newHeight = visualHeight / (scale * stageZoom);
    } else {
      return;
    }

    const minHeight = 30;
    const maxHeight = 2000;
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    // Applica height base (non tocchiamo scale/rotation per-frame)
    this.contentElement.nativeElement.style.height = newHeight + 'px';
    this.currentBaseHeight = newHeight;

    // Riallinea l'host per mantenere fisso il bordo opposto, SENZA leggere rect ad ogni frame (evita flicker).
    // Nota: formula esatta quando rotation ~ 0. Se ruotato, fallback a rectAfter.
    if (isEffectivelyUnrotated) {
      let newHostTopViewport = this.startHostTopViewport;
      if (this.resizeHandle === 'bottom') {
        // Fisso il bordo superiore:
        // startFixedTopViewport = hostTop + C + (newHeight*(1-scale)/2)*stageZoom
        newHostTopViewport =
          this.startFixedTopViewport -
          this.startContentCViewportY -
          ((newHeight * (1 - scale)) / 2) * stageZoom;
      } else {
        // Fisso il bordo inferiore:
        // startFixedBottomViewport = hostTop + C + (newHeight*(1+scale)/2)*stageZoom
        newHostTopViewport =
          this.startFixedBottomViewport -
          this.startContentCViewportY -
          ((newHeight * (1 + scale)) / 2) * stageZoom;
      }

    const deltaViewport = newHostTopViewport - this.startHostTopViewport;
    const newTop = this.startTop + deltaViewport / stageZoom;
    hostElement.style.top = newTop + 'px';
    this.note.y = newTop;
    } else {
      const rectAfter = this.contentElement.nativeElement.getBoundingClientRect();
      const deltaViewport = this.resizeHandle === 'bottom'
        ? (this.startFixedTopViewport - rectAfter.top)
        : (this.startFixedBottomViewport - rectAfter.bottom);
      const newTop = this.startTop + deltaViewport / stageZoom;
      hostElement.style.top = newTop + 'px';
      this.note.y = newTop;
    }
  }

  private getSafeStageZoom(): number {
    const z = this.stageService?.getZoom?.() || 1;
    return typeof z === 'number' && isFinite(z) && z > 0 ? z : 1;
  }

  /**
   * Log in console posizione del blocco nota (host, content, modello) e scale.
   * Usato per debug resize: prima del click su maniglia, subito dopo, al rilascio.
   */
  private logNoteBlockPosition(label: string): void {
    if (!this.note || !this.contentElement) return;
    const hostEl = this.elementRef.nativeElement as HTMLElement;
    const contentEl = this.contentElement.nativeElement;
    const hostRect = hostEl.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();
    const hostLeft = parseFloat(hostEl.style.left);
    const hostTop = parseFloat(hostEl.style.top);
    const scale = this.note.scale && Array.isArray(this.note.scale)
      ? [this.note.scale[0], this.note.scale[1]]
      : [1, 1];
    const zoom = this.getSafeStageZoom();
    const payload = {
      label,
      noteId: this.note.note_id,
      model: { x: this.note.x, y: this.note.y, scale },
      hostStyle: { left: hostLeft, top: hostTop },
      hostRect: { left: hostRect.left, top: hostRect.top, width: hostRect.width, height: hostRect.height },
      contentRect: { left: contentRect.left, top: contentRect.top, width: contentRect.width, height: contentRect.height },
      stageZoom: zoom,
      contentTransform: contentEl.style.transform || '(none)',
      contentTransformOrigin: contentEl.style.transformOrigin || '(default)',
    };
    // console.log('[CDS-NOTES-RESIZE-POS]', payload);
  }

  /**
   * Inizia la rotazione della nota
   */
  startRotate(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.contentElement || !this.note) return;
    
    this.isRotating = true;
    
    // Calcola il centro della nota
    const rect = this.contentElement.nativeElement.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    
    // Salva l'angolo iniziale di rotazione
    this.startRotationAngle = this.note.rotation || 0;
    
    // Calcola l'angolo iniziale tra il centro e la posizione del mouse
    const dx = event.clientX - this.centerX;
    const dy = event.clientY - this.centerY;
    const initialAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Salva l'offset angolare iniziale
    this.startX = initialAngle;
    
    this.changeState(2);
  }

  /**
   * Gestisce la rotazione durante il movimento del mouse
   */
  private handleRotation(event: MouseEvent): void {
    if (!this.contentElement || !this.note) return;
    
    // Calcola l'angolo corrente tra il centro e la posizione del mouse
    const dx = event.clientX - this.centerX;
    const dy = event.clientY - this.centerY;
    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Calcola la differenza angolare rispetto all'angolo iniziale
    let angleDelta = currentAngle - this.startX;
    
    // Normalizza l'angolo tra -180 e 180
    while (angleDelta > 180) angleDelta -= 360;
    while (angleDelta < -180) angleDelta += 360;
    
    // Calcola il nuovo angolo di rotazione
    let newRotation = this.startRotationAngle + angleDelta;
    
    // Normalizza l'angolo finale tra 0 e 360
    newRotation = ((newRotation % 360) + 360) % 360;
    
    // Aggiorna l'angolo nel modello
    this.note.rotation = newRotation;
    
    // Preserva lo scale esistente e combina con la rotazione
    if (this.contentElement) {
      const currentTransform = this.contentElement.nativeElement.style.transform || '';
      const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
      
      let scaleX = 1;
      let scaleY = 1;
      
      // Leggi lo scale dal transform corrente o dal modello
      if (scaleMatch) {
        scaleX = parseFloat(scaleMatch[1]) || 1;
        scaleY = parseFloat(scaleMatch[2]) || scaleX;
      } else if (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 2) {
        scaleX = this.note.scale[0];
        scaleY = this.note.scale[1];
      }
      
      // Aggiorna lo scale nel modello per mantenerlo sincronizzato
      this.note.scale = [scaleX, scaleY];
      
      const transform = `scale(${scaleX}, ${scaleY}) rotate(${newRotation}deg)`;
      this.contentElement.nativeElement.style.transform = transform;
      this.contentElement.nativeElement.style.transformOrigin = 'center center';
      
      // Aggiorna lo scale degli handle
      this.updateHandlesScale(scaleX, scaleY);
    }
  }

  /**
   * Applica uno scale inverso agli handle (resize e rotate) per mantenerli
   * alla dimensione originale anche quando il contenitore viene scalato.
   */
  private updateHandlesScale(scaleX: number, scaleY: number): void {
    if (!this.contentElement) return;
    
    // Calcola lo scale inverso.
    // I handle sono "figli" di un elemento scalato 2 volte:
    // - scala nota: transform: scale(scaleX, scaleY) sul content
    // - zoom stage: transform: scale(stageZoom) sul drawer (tds_drawer)
    // Per mantenere le maniglie di dimensione fissa (px) indipendentemente dallo zoom,
    // applichiamo un contro-scale pari a 1 / (scaleNota * stageZoom).
    const safeScaleX = typeof scaleX === 'number' && isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
    const safeScaleY = typeof scaleY === 'number' && isFinite(scaleY) && scaleY > 0 ? scaleY : 1;
    const stageZoom = this.stageService?.getZoom?.() || 1;
    const safeStageZoom = typeof stageZoom === 'number' && isFinite(stageZoom) && stageZoom > 0 ? stageZoom : 1;
    const inverseScaleX = 1 / (safeScaleX * safeStageZoom);
    const inverseScaleY = 1 / (safeScaleY * safeStageZoom);
    
    // Trova tutti gli handle/overlays che devono restare a dimensione costante.
    // Include:
    // - resize/rotate handles
    // - internal note controls menu (must NOT scale while resizing the note)
    // - media drag handle (optional)
    const handles = this.contentElement.nativeElement.querySelectorAll(
      '.resize-handle, .rotate-handle, .note-controls, .media-drag-handle'
    ) as NodeListOf<HTMLElement>;
    
    handles.forEach(handle => {
      // Applica lo scale inverso agli handle per mantenerli alla dimensione originale
      const isRotateHandle = handle.classList.contains('rotate-handle');
      const isHorizontalHandle = handle.classList.contains('resize-left') || handle.classList.contains('resize-right');
      const isVerticalHandle = handle.classList.contains('resize-top') || handle.classList.contains('resize-bottom');
      const isNoteControls = handle.classList.contains('note-controls');
      const isMediaDragHandle = handle.classList.contains('media-drag-handle');
      
      if (isNoteControls) {
        // Posizione fissa in alto a destra: top -30px, right 0px (in pixel visivi).
        // Con scale nota e zoom stage, in coordinate del content servono:
        // top = -30 / (scaleY * stageZoom), right = 0 / (scaleX * stageZoom).
        const topPx = -30 * inverseScaleY;
        const rightPx = 0 * inverseScaleX;
        handle.style.top = `${topPx}px`;
        handle.style.right = `${rightPx}px`;
        handle.style.transform = `scale(${inverseScaleX}, ${inverseScaleY})`;
        handle.style.transformOrigin = 'top right';
      } else if (isMediaDragHandle) {
        // No positional translate needed here: we only want a stable visual size.
        handle.style.transform = `scale(${inverseScaleX}, ${inverseScaleY})`;
      } else if (isRotateHandle) {
        // Rotate-handle: must stay at a fixed 20px from the top edge in SCREEN pixels,
        // independent from:
        // - note scale (scaleY)
        // - stage zoom (tds_drawer scale)
        //
        // The `top` property is affected by parent's scales (note scale * stage zoom),
        // while the handle itself is counter-scaled via transform.
        // To keep a constant rendered offset, set:
        //   top = -20 / (scaleY * stageZoom)
        const desiredOffsetPx = 0;
        const topPx = -(desiredOffsetPx * inverseScaleY)-0;
        //handle.style.top = `${topPx}px`;
        handle.style.transform = `translateX(-50%) scale(${inverseScaleX}, ${inverseScaleY})`;
      } else if (isHorizontalHandle) {
        // Per le maniglie laterali, preserva translateY(-50%)
        handle.style.transform = `translateY(-50%) scale(${inverseScaleX}, ${inverseScaleY})`;
      } else if (isVerticalHandle) {
        // Per le maniglie verticali, preserva translateX(-50%)
        handle.style.transform = `translateX(-50%) scale(${inverseScaleX}, ${inverseScaleY})`;
      } else {
        // Per gli angoli, solo scale
        handle.style.transform = `scale(${inverseScaleX}, ${inverseScaleY})`;
      }
      if (!isNoteControls) {
        handle.style.transformOrigin = 'center center';
      }
    });

    // Titolo rect: scala inversa solo rispetto alla nota (non allo zoom stage) così resta 40px in altezza e in 0,0.
    // Larghezza: calc(100% * scaleX); altezza: 40 * scaleY px; dopo scale(1/sx, 1/sy) il titolo occupa visivamente 100% x 40px.
    if (this.note?.type === 'rect') {
      const titleEl = this.contentElement.nativeElement.querySelector('.note-title') as HTMLElement | null;
      if (titleEl) {
        titleEl.style.width = `calc(100% * ${safeScaleX})`;
        titleEl.style.height = `${40 * safeScaleY}px`;
        titleEl.style.transform = `scale(${1 / safeScaleX}, ${1 / safeScaleY})`;
        titleEl.style.transformOrigin = '0 0';
      }
    }
  }

  // ============================================================================
  // METODI PUBBLICI
  // ============================================================================
  private shouldOpenDetailPanelOnClick(): boolean {
    // Requirement:
    // - rect + text => open detail panel on click
    // - media (image/video) => DO NOT open detail panel on click
    const type = this.note?.type || 'text';
    return type === 'rect' || type === 'text';
  }

  changeState(state: 0|1|2|3): void {
    const previousState = this.stateNote;
    this.stateNote = state;
    if (state === 2) {
      // console.log('[CDS-NOTES-CLICK] SELEZIONE (changeState 2)', {
      //   noteId: this.note?.note_id,
      //   previousState,
      //   modelXY: this.note ? { x: this.note.x, y: this.note.y } : null,
      // });
    }
    if (state === 1) {
      // this.cancelOpenPanelTimer();
      this.textareaHasFocus = true;
      this.updateChildrenDraggableClass();
      // setTimeout(() => {
        if (this.noteInput) {
          this.noteInput.nativeElement.focus();
          this.placeCaretAtEnd(this.noteInput.nativeElement);
        }
      // }, 150);
    } else if (state === 2) {
      this.textareaHasFocus = false;
      if (this.noteInput) {
        this.noteInput.nativeElement.blur();
      }
      this.updateChildrenDraggableClass();
      // NOTE:
      // The detail panel opening is handled by click handlers and is conditional:
      // - rect/text: emits noteSelected on click
      // - media: no panel open on click (menu still supports open detail)
    } else if (state === 0 || state === 3) {
      // this.cancelOpenPanelTimer();
      this.textareaHasFocus = false;
      if (this.noteInput) {
        this.noteInput.nativeElement.blur();
      }
      this.updateChildrenDraggableClass();
      if (previousState === 2) {
        this.noteSelected.emit(null);
      }
    }
    
    this.updateDragState();
  }

  // ============================================================================
  // METODI PRIVATI - Inizializzazione
  // ============================================================================
  /**
   * Inizializza i valori di default solo se non sono già presenti nell'oggetto note.
   * Se sono presenti, usa sempre i valori dell'oggetto note.
   */
  private initializeDefaults(): void {
    if (!this.note) return;
    
    // Inizializza type per retro-compatibilità (note salvate prima dell'introduzione dei tipi)
    if (!this.note.type) {
      this.note.type = 'text';
    }

    // Inizializza borderWidth: 0 per note rettangolo (bordo disabilitato), altrimenti default se non presente
    if (this.note.type === 'rect') {
      this.note.borderWidth = 0;
      if (this.note.title === undefined || this.note.title === null) {
        this.note.title = '';
      }
    } else if (this.note.borderWidth === undefined || this.note.borderWidth === null) {
      this.note.borderWidth = Note.DEFAULT_BORDER_WIDTH;
    }

    // Inizializza width solo se non presente
    if (this.note.width === undefined || this.note.width === null) {
      this.note.width = Note.DEFAULT_WIDTH;
    }
    
    // Inizializza height solo se non presente
    if (this.note.height === undefined || this.note.height === null) {
      this.note.height = Note.DEFAULT_HEIGHT;
    }

    // Image/media notes: shadow disabled by default.
    // Keep this backward compatible: if older notes don't have boxShadow set, force it off for image type.
    if (this.note.type === 'media' && (this.note.boxShadow === undefined || this.note.boxShadow === null)) {
      this.note.boxShadow = false;
    }
    
    // Inizializza fontSize solo se non presente
    // Se non presente, calcola in proporzione inversa basandosi su width
    if (!this.note.fontSize) {
      const noteWidth = this.note.width;
      const defaultWidth = Note.DEFAULT_WIDTH;
      const defaultFontSizeEm = Note.DEFAULT_FONT_SIZE_EM;
      
      // Formula: font-size = (DEFAULT_WIDTH / note.width) * DEFAULT_FONT_SIZE_EM
      let fontSizeEm = (defaultWidth / noteWidth) * defaultFontSizeEm;
      
      // Limiti ragionevoli per evitare font-size troppo piccoli o troppo grandi
      fontSizeEm = Math.max(0.3, Math.min(3, fontSizeEm)); // tra 0.3em e 3em
      
      this.note.fontSize = fontSizeEm.toFixed(2) + 'em';
    }
  }

  private initialize(): void {
    if (this.note) {
      // Inizializza i valori di default solo se non presenti
      this.initializeDefaults();

      // Solo note testuali: sanificazione e binding HTML
      if (this.isTextNote) {
        const purifiedText = this.purifyAndNormalizeText(this.note.text || '');
        this.noteText = purifiedText;
        if (this.note.text !== purifiedText) {
          this.note.text = purifiedText;
        }
        this.updateSanitizedHtml();
      }
    }
    
    this.noteUpdatedSubscription = this.noteService.notesChanged$
      .pipe(
        filter(notes => notes && notes.length > 0 && !!this.note)
      )
      .subscribe(notes => {
        // Cerca la nota specifica nell'array aggiornato
        const updatedNote = notes.find(n => n && n.note_id === this.note?.note_id);
        if (updatedNote && this.note) {
          Object.assign(this.note, updatedNote);
          
          if (this.isTextNote && updatedNote.text) {
            const purifiedText = this.purifyAndNormalizeText(updatedNote.text);
            this.note.text = purifiedText;
          }
          
          if (this.isTextNote && !this.textareaHasFocus) {
            const newText = this.note.text || '';
            if (this.noteText !== newText) {
              this.noteText = newText;
              if (this.noteInput && this.noteInput.nativeElement.innerHTML !== newText) {
                this.noteInput.nativeElement.innerHTML = newText;
              }
              this.updateSanitizedHtml();
            }
          }
          
          // Applica scale e trasformazioni se contentElement è disponibile
          if (this.contentElement) {
            // console.log('[CDS-NOTES-CLICK] notesChanged$: applico applyScaleAndTransform', this.note?.note_id);
            this.applyScaleAndTransform();
          }
          
          // if (this.noteInput) {
          //   if (updatedNote.fontSize && this.note.fontSize !== updatedNote.fontSize) {
          //     this.noteInput.nativeElement.style.fontSize = updatedNote.fontSize + 'px';
          //   }
          //   if (updatedNote.fontFamily && this.note.fontFamily !== updatedNote.fontFamily) {
          //     this.noteInput.nativeElement.style.fontFamily = updatedNote.fontFamily;
          //   }
          // }
          this.logger.log('[CDS-NOTES] Note updated from service (notesChanged$):', updatedNote.note_id);
        }
      });
  }

  private setupMutationObserver(): void {
    if (this.noteInput) {
      this.mutationObserver = new MutationObserver(() => {
        if (this.isDraggable) {
          this.updateChildrenDraggableClass();
        }
      });
      
      this.mutationObserver.observe(this.noteInput.nativeElement, {
        childList: true,
        subtree: true
      });
    }
  }

  // ============================================================================
  // METODI PRIVATI - Setup listeners
  // ============================================================================
  private setupAllListeners(): void {
    this.setupDragListeners();
  }

  private setupDragListeners(): void {
    this.setupDraggingListener();
    this.setupDragEndListener();
  }

  private setupDraggingListener(): void {
    this.draggingListener = ((e: CustomEvent) => {
      const el = e.detail.element;
      if (el && el.id === this.note?.note_id) {
        this.dragged = true;
      }
    }) as EventListener;
    document.addEventListener("dragged", this.draggingListener, false);
  }

  private setupDragEndListener(): void {
    this.draggedListener = ((e: CustomEvent) => {
      const el = e.detail.element;
      if (el && el.id === this.note?.note_id) {
        // Ricalcola sempre dimensioni e posizione prima di salvare
        this.recalculateNoteDimensionsAndPosition();
        this.updateNote();
      } else {
        this.changeState(0);
      }
    }) as EventListener;
    document.addEventListener("end-dragging", this.draggedListener, false);
  }

  // ============================================================================
  // METODI PRIVATI - Utility e helper
  // ============================================================================
  /**
   * Applica il font-size dall'oggetto note al DOM.
   * Il font-size è garantito essere presente grazie a initializeDefaults().
   */
  private calculateAndApplyFontSize(): void {
    if (!this.isTextNote) {
      return;
    }
    if (!this.note || !this.noteInput) {
      return;
    }

    // Usa fontSize da note (garantito da initializeDefaults)
    if (this.noteInput) {
      this.noteInput.nativeElement.style.fontSize = this.note.fontSize;
    }

    this.logger.log('[CDS-NOTES] Applied font-size from note:', this.note.fontSize);
  }

  /**
   * Verifica che l'altezza del contenitore non sia inferiore all'altezza minima
   * del testo (scrollHeight + padding verticale).
   * Se l'altezza è inferiore al minimo, la corregge automaticamente.
   * Se siamo in fase di resize e la maniglia è superiore (tr, tl), aggiorna anche la posizione Y.
   */
  private ensureMinimumHeight(): void {
    if (!this.note || !this.noteInput || !this.contentElement) {
      return;
    }

    // Calcola l'altezza minima: scrollHeight del testo + padding verticale (10px top + 10px bottom = 20px)
    const textScrollHeight = this.noteInput.nativeElement.scrollHeight;
    const verticalPadding = 20; // 10px top + 10px bottom dal CSS (.cds-notes-content padding: 10px 8px)
    const minHeight = textScrollHeight + verticalPadding;

    // Ottieni l'altezza corrente del contenitore
    const currentHeight = this.note.height || this.contentElement.nativeElement.offsetHeight;

    // Se l'altezza corrente è inferiore al minimo, correggila
    // NOTA: Non aggiorniamo note.height per mantenerlo invariato, ma aggiorniamo solo il DOM
    if (currentHeight < minHeight) {
      const newHeight = minHeight;
      const heightDelta = newHeight - currentHeight;
      
      // NON aggiorniamo il modello note.height (deve rimanere invariato)
      // Aggiorna solo il DOM per la visualizzazione
      this.contentElement.nativeElement.style.height = newHeight + 'px';
      
      // Se siamo in fase di resize e la maniglia è superiore (tr, tl), aggiorna anche la posizione Y
      // per mantenere il punto fisso (bottom-right per tl, bottom-left per tr)
      if (this.isResizing && (this.resizeHandle === 'tr' || this.resizeHandle === 'tl')) {
        this.note.y = this.note.y - heightDelta;
        if (this.contentElement) {
          this.contentElement.nativeElement.style.top = this.note.y + 'px';
        }
      }
    }
  }

  private purifyAndNormalizeText(html: string): string {
    if (!html) return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const links = tempDiv.querySelectorAll('a');
    links.forEach((link: HTMLAnchorElement) => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        link.setAttribute('href', 'http://' + href);
      }
    });
    
    return tempDiv.innerHTML;
  }

  private updateSanitizedHtml(): void {
    if (!this.isTextNote) {
      return;
    }
    if (this.textareaHasFocus) {
      return;
    }
    const html = this.note?.text || '';
    const purifiedHtml = this.purifyAndNormalizeText(html);
    this.sanitizedNoteHtml = this.sanitizer.bypassSecurityTrustHtml(purifiedHtml);
  }

  /** HTML sanitizzato per il titolo della nota rect (da Quill); vuoto se non rect o titolo assente. */
  get sanitizedTitleHtml(): SafeHtml {
    if (this.note?.type !== 'rect') {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    const raw = this.note?.title ?? '';
    if (!raw) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    return this.sanitizer.bypassSecurityTrustHtml(this.purifyAndNormalizeText(raw));
  }

  private updateChildrenDraggableClass(): void {
    if (!this.noteInput) return;
    
    const children = this.noteInput.nativeElement.querySelectorAll('*');
    
    if (this.isDraggable) {
      children.forEach((child: Element) => {
        (child as HTMLElement).classList.add('tds_draggable');
      });
    } else {
      children.forEach((child: Element) => {
        (child as HTMLElement).classList.remove('tds_draggable');
      });
    }
  }

  private placeCaretAtEnd(element: HTMLElement): void {
    try {
      const range = document.createRange();
      const selection = window.getSelection();
      
      if (!selection) return;
      
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      element.focus();
    } catch (error) {
      console.error('[CDS-NOTES] Error placing caret at end:', error);
    }
  }

  private openPanelWithDelay(): void {
    // this.cancelOpenPanelTimer();
    // this.openPanelTimer = setTimeout(() => {
      if (this.stateNote === 2) {
        this.noteSelected.emit(this.note);
      }
      // this.openPanelTimer = null;
    // }, 200);
  }

  // ============================================================================
  // NOTE CONTROLS MENU (internal)
  // ============================================================================
  onOpenDetailFromMenu(): void {
    if (!this.note) return;
    this.changeState(2);
    this.updateDragState();
    this.noteSelected.emit(this.note);
  }

  onDuplicateFromMenu(): void {
    if (!this.note) return;
    this.duplicateNote.emit(this.note);
  }

  onDeleteFromMenu(): void {
    if (!this.note) return;
    this.deleteNote.emit(this.note);
  }

  // private cancelOpenPanelTimer(): void {
  //   if (this.openPanelTimer) {
  //     clearTimeout(this.openPanelTimer);
  //     this.openPanelTimer = null;
  //   }
  // }

  private cancelSingleClickTimer(): void {
    if (this.singleClickTimer) {
      clearTimeout(this.singleClickTimer);
      this.singleClickTimer = null;
    }
  }

  /**
   * Funzione riutilizzabile che applica scale, dimensioni e trasformazioni CSS alla nota.
   * 
   * Questa funzione:
   * 1. Legge il valore scale dal modello Note (se presente) oppure lo calcola da width/height
   * 2. Imposta le dimensioni base nel DOM (DEFAULT_WIDTH x DEFAULT_HEIGHT)
   * 3. Applica le trasformazioni CSS (scale + rotation)
   * 4. Aggiorna le dimensioni nel modello basandosi su scale (base * scale)
   * 5. Aggiorna anche il campo scale nel modello per mantenerlo sincronizzato
   * 
   * Viene chiamata in:
   * - ngAfterViewInit: per inizializzare la nota
   * - onMouseUp: dopo resize o rotazione
   * - recalculateNoteDimensionsAndPosition: dopo drag
   */
  private applyScaleAndTransform(): void {
    if (!this.note || !this.contentElement) return;
    // console.log('[CDS-NOTES-CLICK] applyScaleAndTransform chiamata', {
    //   noteId: this.note.note_id,
    //   type: this.note.type,
    //   modelXYBefore: { x: this.note.x, y: this.note.y },
    // });
    const element = this.contentElement.nativeElement;

    // MEDIA NOTE: after loading media we update note.width/note.height to the real media size.
    // But currentBaseWidth/currentBaseHeight might still be stuck to the placeholder (e.g. 240x180),
    // causing the box to keep the old ratio and the media to be letterboxed (object-fit: contain),
    // making handles appear "misaligned" with the media content.
    //
    // Fix: when we're not in an active resize gesture, let the base sizes follow the model.
    if (this.note.type === 'media' && !this.isResizing && !this.isHorizontalResizing && !this.isVerticalResizing) {
      const targetW = Number(this.note.width);
      const targetH = Number(this.note.height);
      const needsAdoptW = isFinite(targetW) && targetW > 0 && Math.abs(this.currentBaseWidth - targetW) > 0.5;
      const needsAdoptH = isFinite(targetH) && targetH > 0 && Math.abs(this.currentBaseHeight - targetH) > 0.5;
      if (needsAdoptW) this.currentBaseWidth = targetW;
      if (needsAdoptH) this.currentBaseHeight = targetH;
    }
    
    // Determina la larghezza base: usa currentBaseWidth se è stata impostata (da resize orizzontale),
    // altrimenti usa note.width (garantito da initializeDefaults)
    let baseWidth = this.currentBaseWidth > 0 ? this.currentBaseWidth : this.note.width;
    if (this.currentBaseWidth === 0) {
      this.currentBaseWidth = baseWidth;
    }
    
    // Determina l'altezza base: usa note.height (garantito da initializeDefaults)
    const baseHeight = this.currentBaseHeight > 0 ? this.currentBaseHeight : this.note.height;
    if (this.currentBaseHeight === 0) {
      this.currentBaseHeight = baseHeight;
    }
    
    // Rect con origin a vertice (es. dopo resize corner): migra host a "center" così il visivo non salta.
    // Esegui la migrazione SOLO se l'origin è davvero un vertice (0 0, 100% 0, 0 100%, 100% 100% o equivalenti in px).
    // Il browser può restituire "65px 21px" per center (50% 50%) → non migrare in quel caso.
    if (this.note.type === 'rect') {
      const compStyle = window.getComputedStyle(element);
      const origin = (compStyle.transformOrigin || element.style.transformOrigin || '').trim();
      const originLower = origin.toLowerCase();
      let isOriginAtVertex = false;
      if (originLower.includes('50%') || originLower === 'center center') {
        isOriginAtVertex = false; // center
      } else if (originLower === '0 0' || originLower === '0% 0%' || originLower === '0px 0px') {
        isOriginAtVertex = true;
      } else if (originLower.includes('100%') || (originLower.includes('0px') && originLower.includes('100%'))) {
        isOriginAtVertex = true; // 100% 0, 0 100%, 100% 100%, 100% 0px, etc.
      } else {
        // Pixel: "65px 21px" → center se ~ (baseWidth/2, baseHeight/2)
        const pxMatch = origin.match(/^(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px$/);
        if (pxMatch) {
          const ox = parseFloat(pxMatch[1]);
          const oy = parseFloat(pxMatch[2]);
          const centerTolerance = 2;
          const isPixelCenter = Math.abs(ox - baseWidth / 2) <= centerTolerance && Math.abs(oy - baseHeight / 2) <= centerTolerance;
          isOriginAtVertex = !isPixelCenter;
        }
        // Se non siamo in pixel e non è 50%/center, potrebbe essere 100% 100% senza "0px"
        if (!pxMatch && (originLower.includes('100%') || originLower === 'top left' || originLower === 'top right' || originLower === 'bottom left' || originLower === 'bottom right')) {
          isOriginAtVertex = true;
        }
      }
      if (isOriginAtVertex) {
        const curT = compStyle.transform || element.style.transform || '';
        let sx = 1;
        let sy = 1;
        const scaleMatch = curT.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
        if (scaleMatch) {
          sx = parseFloat(scaleMatch[1]) || 1;
          sy = scaleMatch[2] ? (parseFloat(scaleMatch[2]) || sx) : sx;
        } else {
          const matrixMatch = curT.match(/matrix\(([^)]+)\)/);
          if (matrixMatch) {
            const v = matrixMatch[1].split(',').map(x => parseFloat(x.trim()));
            if (v.length >= 4) {
              sx = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
              sy = Math.sqrt(v[2] * v[2] + v[3] * v[3]);
            }
          }
        }
        const xBefore = this.note.x;
        const yBefore = this.note.y;
        // Mantenere il top-left del box fisso: con origin a vertice il top-left è in (note.x + w*(1-sx), note.y + h*(1-sy));
        // con origin center il top-left è in (host - w*sx/2, host - h*sy/2). Uguagliando: host = note.x + w*(1 - sx/2).
        this.note.x = this.note.x + baseWidth * (1 - sx / 2);
        this.note.y = this.note.y + baseHeight * (1 - sy / 2);
        const hostEl = this.elementRef.nativeElement as HTMLElement;
        hostEl.style.left = this.note.x + 'px';
        hostEl.style.top = this.note.y + 'px';
        // console.log('[CDS-NOTES-CLICK] applyScaleAndTransform: MIGRAZIONE RECT (origin non center)', {
        //   noteId: this.note.note_id,
        //   transformOrigin: origin,
        //   baseWidth,
        //   baseHeight,
        //   sx,
        //   sy,
        //   xyBefore: { x: xBefore, y: yBefore },
        //   xyAfter: { x: this.note.x, y: this.note.y },
        // });
      }
    }
    
    // Imposta sempre le dimensioni base nel DOM (rimangono fisse, usiamo scale per ridimensionare)
    element.style.width = baseWidth + 'px';
    element.style.height = baseHeight + 'px';
    
    // Determina lo scale da applicare
    let scaleX = 1;
    let scaleY = 1;
    
    // Priorità 1: Se c'è un transform CSS già applicato, leggi lo scale da lì
    const computedStyle = window.getComputedStyle(element);
    const currentTransform = computedStyle.transform || element.style.transform || '';
    
    if (currentTransform && currentTransform !== 'none') {
      // Prova prima con la stringa scale() se presente
      const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
      if (scaleMatch) {
        scaleX = parseFloat(scaleMatch[1]) || 1;
        scaleY = parseFloat(scaleMatch[2]) || scaleX;
      } else {
        // Se è una matrix, estrai lo scale dalla matrice
        // matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
        const matrixMatch = currentTransform.match(/matrix\(([^)]+)\)/);
        if (matrixMatch) {
          const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
          if (values.length >= 4) {
            scaleX = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
            scaleY = Math.sqrt(values[2] * values[2] + values[3] * values[3]);
          }
        }
      }
    } else {
      // Priorità 2: Se c'è un valore scale nel modello, usalo
      if (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 2) {
        scaleX = this.note.scale[0];
        scaleY = this.note.scale[1];
      } else {
        // Priorità 3: Calcola lo scale dalle dimensioni salvate nel modello
        const savedWidth = this.note.width || baseWidth;
        const savedHeight = this.note.height || baseHeight;
        scaleX = savedWidth / baseWidth;
        scaleY = savedHeight / baseHeight;
      }
    }
    
    // Applica la trasformazione combinando scale + rotate
    const rotation = this.note.rotation || 0;
    const transform = `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`;
    element.style.transform = transform;
    element.style.transformOrigin = 'center center';
    
    // Calcola le dimensioni reali (base * scale)
    const width = baseWidth * scaleX;
    const height = baseHeight * scaleY;
    
    // Aggiorna il modello con le dimensioni reali e lo scale
    // this.note.width = width;
    // this.note.height = height;
    this.note.scale = [scaleX, scaleY];
    
    // Applica scale inverso agli handle per mantenerli alla dimensione originale
    this.updateHandlesScale(scaleX, scaleY);
    
    if(this.isHorizontalResizing) {
      const DOMWidth = parseFloat(this.contentElement.nativeElement.style.width);
      this.note.width = DOMWidth;
    }
    if(this.isVerticalResizing) {
      const DOMHeight = parseFloat(this.contentElement.nativeElement.style.height);
      this.note.height = DOMHeight;
    }
    this.logger.log('[CDS-NOTES] Applied scale and transform:', {
      scaleX: scaleX,
      scaleY: scaleY,
      width: width,
      height: height,
      rotation: rotation,
      scale: this.note.scale,
      DOMWidth: this.contentElement.nativeElement.style.width,
      noteWidth: this.note.width,
    });
  }

  private recalculateNoteDimensionsAndPosition(): void {
    if (!this.note || !this.contentElement) return;
    
    // L'elemento host del componente (cds-notes) ha la posizione impostata dal template
    // Usa ElementRef per accedere all'elemento host
    const hostElement = this.elementRef.nativeElement as HTMLElement;
    const contentElement = this.contentElement.nativeElement;
    
    let left = 0;
    let top = 0;
    
    // Prova a leggere la posizione dall'elemento host (dove viene impostata dal template)
    const hostLeft = parseFloat(hostElement.style.left);
    const hostTop = parseFloat(hostElement.style.top);
    
    if (!isNaN(hostLeft)) {
      left = hostLeft;
    } else {
      // Fallback: leggi da offsetLeft/offsetTop dell'host
      left = hostElement.offsetLeft || 0;
    }
    
    if (!isNaN(hostTop)) {
      top = hostTop;
    } else {
      // Fallback: leggi da offsetTop dell'host
      top = hostElement.offsetTop || 0;
    }
    
    // Se non abbiamo trovato la posizione dall'host, prova a leggere dal div interno
    // (tiledesk-stage potrebbe impostare la posizione direttamente sul div con l'id)
    if ((left === 0 && top === 0) || (isNaN(hostLeft) && isNaN(hostTop))) {
      const contentLeft = parseFloat(contentElement.style.left);
      const contentTop = parseFloat(contentElement.style.top);
      
      if (!isNaN(contentLeft)) {
        left = contentLeft;
      }
      if (!isNaN(contentTop)) {
        top = contentTop;
      }
    }
    
    // Se ancora non abbiamo trovato la posizione, usa i valori dal modello come ultimo fallback
    // (ma solo se non sono 0,0, per evitare di sovrascrivere una posizione valida)
    if (left === 0 && top === 0 && (this.note.x !== 0 || this.note.y !== 0)) {
      left = this.note.x;
      top = this.note.y;
    }
    
    // Aggiorna la posizione nel modello
    this.note.x = left;
    this.note.y = top;
    
    // Ricalcola dimensioni e scale usando la funzione riutilizzabile
    this.applyScaleAndTransform();
    
    this.logger.log('[CDS-NOTES] Recalculated dimensions and position:', {
      x: this.note.x,
      y: this.note.y,
      width: this.note.width,
      height: this.note.height,
      scale: this.note.scale,
      hostLeft: hostLeft,
      hostTop: hostTop,
      contentLeft: parseFloat(contentElement.style.left),
      contentTop: parseFloat(contentElement.style.top)
    });
  }
  
  private updateDragState(): void {
    if (this.note?.note_id) {
      // setTimeout(() => {
        if (this.isDraggable) {
          this.logger.log('[CDS-NOTES] updateDragState - Initializing drag for note_id:', this.note.note_id, 'isDraggable:', this.isDraggable);
          
          if (this.contentElement) {
            const element = this.contentElement.nativeElement;
            const hasClass = element.classList.contains('tds_draggable');
            this.logger.log('[CDS-NOTES] updateDragState - contentElement exists:', !!element, 'has tds_draggable class:', hasClass);
            
            if (!hasClass) {
              element.classList.add('tds_draggable');
              this.logger.log('[CDS-NOTES] updateDragState - Added tds_draggable class manually');
            }
          }
          
          this.stageService.setDragElement(this.note.note_id);
        } else {
          this.logger.log('[CDS-NOTES] updateDragState - Drag NOT initialized, isDraggable:', this.isDraggable);
        }
      // }, 50);
    }
  }

  private handleLinkClick(target: HTMLElement, event: MouseEvent): void {
    const linkElement = target.tagName === 'A' ? target as HTMLAnchorElement : target.closest('a') as HTMLAnchorElement;
    let linkUrl = linkElement?.getAttribute('href') || 'N/A';
    
    if (linkUrl !== 'N/A' && !linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
      linkUrl = 'http://' + linkUrl;
    }
    
    const linkText = linkElement?.textContent || linkElement?.innerText || 'N/A';
    const targetAttr = linkElement?.getAttribute('target') || '_blank';
    
    this.logger.log('[CDS-NOTES] 🔗 LINK CLICKED - URL:', linkUrl, 'Text:', linkText, 'Target:', targetAttr);
    
    if (linkUrl && linkUrl !== 'N/A') {
      if (targetAttr === '_blank' || linkElement?.target === '_blank') {
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = linkUrl;
      }
    }
    
    event.stopPropagation();
  }

  private async updateNote(): Promise<void> {
    if (this.note && this.note.id_faq_kb) {
      try {
        await firstValueFrom(this.noteService.saveRemoteNote(this.note, this.note.id_faq_kb));
      } catch (error) {
        console.error('[CDS-NOTES] Error saving note:', error);
      }
    } else {
      console.warn('[CDS-NOTES] Cannot save note: missing note or id_faq_kb');
    }
  }
}
