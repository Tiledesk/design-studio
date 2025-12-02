import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Note } from 'src/app/models/note-model';
import { StageService } from '../../../services/stage.service';
import { NoteService } from 'src/app/services/note.service';
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
  @Output() noteSelected = new EventEmitter<Note>();
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

  // ============================================================================
  // PROPRIETÀ PRIVATE - Timer e sottoscrizioni
  // ============================================================================
  private openPanelTimer: any = null;
  private singleClickTimer: any = null;
  private noteUpdatedSubscription: Subscription;
  private mutationObserver: MutationObserver | null = null;

  // ============================================================================
  // PROPRIETÀ PRIVATE - Resize
  // ============================================================================
  private isResizing = false;
  private resizeHandle: string = '';
  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private startNoteX = 0;
  private startNoteY = 0;
  private startFontSize = 0;
  private justFinishedResizing = false;

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

  // ============================================================================
  // COSTRUTTORE
  // ============================================================================
  constructor(
    private stageService: StageService,
    private noteService: NoteService,
    private sanitizer: DomSanitizer
  ) { }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  ngOnInit(): void {
    this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['note'] && this.note) {
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
  }

  ngAfterViewInit(): void {
    if (this.contentElement && this.note) {
      // Imposta dimensioni iniziali
      const width = this.note.width || 220;
      const height = this.note.height || 50;
      this.contentElement.nativeElement.style.width = width + 'px';
      this.contentElement.nativeElement.style.height = height + 'px';
      
      // Inizializza fontSize e fontFamily se non presenti
      if (!this.note.fontSize) {
        this.note.fontSize = 14;
      }
      if (!this.note.fontFamily) {
        this.note.fontFamily = 'Open Sans, sans-serif';
      }
      
      // Applica fontSize e fontFamily
      if (this.noteInput) {
        this.noteInput.nativeElement.style.fontSize = this.note.fontSize + 'px';
        this.noteInput.nativeElement.style.fontFamily = this.note.fontFamily;
      }
      
      // Setup listeners e drag
      this.setupAllListeners();
      this.updateDragState();
      this.updateChildrenDraggableClass();
      this.setupMutationObserver();
    }
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
    this.cancelOpenPanelTimer();
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
    if (!this.isResizing || !this.contentElement || !this.note) return;
    
    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;
    const minWidth = 50;
    const minHeight = this.noteInput.nativeElement.offsetHeight;
    
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    let newNoteX = this.startNoteX;
    let newNoteY = this.startNoteY;
    
    switch (this.resizeHandle) {
      case 'br': // Bottom-right: top-left fisso
          newWidth = Math.max(minWidth, this.startWidth + deltaX);
          newHeight = Math.max(minHeight, this.startHeight + deltaY);
          newNoteX = this.startNoteX;
          newNoteY = this.startNoteY;
        break;
      case 'tr': // Top-right: bottom-left fisso
          newWidth = Math.max(minWidth, this.startWidth + deltaX);
          newHeight = Math.max(minHeight, this.startHeight - deltaY);
        newNoteX = this.startNoteX;
        newNoteY = this.startNoteY - (newHeight - this.startHeight);
        break;
      case 'bl': // Bottom-left: top-right fisso
          newWidth = Math.max(minWidth, this.startWidth - deltaX);
          newHeight = Math.max(minHeight, this.startHeight + deltaY);
        newNoteX = this.startNoteX - (newWidth - this.startWidth);
        newNoteY = this.startNoteY;
        break;
      case 'tl': // Top-left: bottom-right fisso
          newWidth = Math.max(minWidth, this.startWidth - deltaX);
          newHeight = Math.max(minHeight, this.startHeight - deltaY);
        newNoteX = this.startNoteX - (newWidth - this.startWidth);
        newNoteY = this.startNoteY - (newHeight - this.startHeight);
        break;
    }
    
    // Aggiorna note
    this.note.width = newWidth;
    this.note.height = newHeight;
    this.note.x = newNoteX;
    this.note.y = newNoteY;
    
    // Calcola font size proporzionale
    const widthRatio = newWidth / this.startWidth;
    const newFontSize = Math.max(8, Math.min(72, this.startFontSize * widthRatio));
    this.note.fontSize = Math.round(newFontSize);
    
    // Applica dimensioni al DOM
    this.contentElement.nativeElement.style.width = newWidth + 'px';
    this.contentElement.nativeElement.style.height = newHeight + 'px';
    
    if (this.noteInput) {
      this.noteInput.nativeElement.style.width = (newWidth - 16) + 'px';
      this.noteInput.nativeElement.style.fontSize = this.note.fontSize + 'px';
      if (this.note.fontFamily) {
        this.noteInput.nativeElement.style.fontFamily = this.note.fontFamily;
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeHandle = '';
      this.changeState(0);
      this.justFinishedResizing = true;
      setTimeout(() => {
        this.justFinishedResizing = false;
      }, 100);
      this.updateNote();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isResizing || this.justFinishedResizing) {
      return;
    }
    
    if ((this.stateNote === 1 || this.stateNote === 2) && this.contentElement) {
      const target = event.target as HTMLElement;
      const clickedInside = this.contentElement.nativeElement.contains(target);
      const clickedOnHandle = target.classList.contains('resize-handle');
      const clickedOnPanel = target.closest('.panel-note-detail') !== null;
      
      if (!clickedInside && !clickedOnHandle && !clickedOnPanel) {
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
    this.singleClickTimer = setTimeout(() => {
      this.changeState(2);
      this.updateDragState();
      this.singleClickTimer = null;
    }, 300);
    
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
    
    this.isResizing = true;
    this.resizeHandle = handle;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startWidth = this.note.width || 220;
    this.startHeight = this.note.height || 50;
    this.startNoteX = this.note.x || 0;
    this.startNoteY = this.note.y || 0;
    this.startFontSize = this.note.fontSize || 14;
    this.changeState(2);
  }

  // ============================================================================
  // METODI PUBBLICI
  // ============================================================================
  changeState(state: 0|1|2|3): void {
    const previousState = this.stateNote;
    this.stateNote = state;
    
    if (state === 1) {
      this.cancelOpenPanelTimer();
      this.textareaHasFocus = true;
      if (previousState === 2) {
        this.noteSelected.emit(null);
      }
      this.updateChildrenDraggableClass();
      setTimeout(() => {
        if (this.noteInput) {
          this.noteInput.nativeElement.focus();
          this.placeCaretAtEnd(this.noteInput.nativeElement);
        }
      }, 150);
    } else if (state === 2) {
      this.textareaHasFocus = false;
      if (this.noteInput) {
        this.noteInput.nativeElement.blur();
      }
      this.updateChildrenDraggableClass();
      this.openPanelWithDelay();
    } else if (state === 0 || state === 3) {
      this.cancelOpenPanelTimer();
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
  private initialize(): void {
    if (this.note) {
      const purifiedText = this.purifyAndNormalizeText(this.note.text || '');
      this.noteText = purifiedText;
      if (this.note.text !== purifiedText) {
        this.note.text = purifiedText;
      }
      this.updateSanitizedHtml();
    }
    
    this.noteUpdatedSubscription = this.noteService.noteUpdated$
      .pipe(
        filter(updatedNote => updatedNote && this.note && updatedNote.note_id === this.note.note_id)
      )
      .subscribe(updatedNote => {
        if (updatedNote && this.note) {
          Object.assign(this.note, updatedNote);
          
          if (updatedNote.text) {
            const purifiedText = this.purifyAndNormalizeText(updatedNote.text);
            this.note.text = purifiedText;
          }
          
          if (!this.textareaHasFocus) {
            const newText = this.note.text || '';
            if (this.noteText !== newText) {
              this.noteText = newText;
              if (this.noteInput && this.noteInput.nativeElement.innerHTML !== newText) {
                this.noteInput.nativeElement.innerHTML = newText;
              }
              this.updateSanitizedHtml();
            }
          }
          
          if (this.noteInput) {
            if (updatedNote.fontSize && this.note.fontSize !== updatedNote.fontSize) {
              this.noteInput.nativeElement.style.fontSize = updatedNote.fontSize + 'px';
            }
            if (updatedNote.fontFamily && this.note.fontFamily !== updatedNote.fontFamily) {
              this.noteInput.nativeElement.style.fontFamily = updatedNote.fontFamily;
            }
          }
          
          this.logger.log('[CDS-NOTES] Note updated from service:', updatedNote.note_id);
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
        if (this.note.x !== el.offsetLeft || this.note.y !== el.offsetTop) {
          this.recalculateNoteDimensionsAndPosition(el);
          this.updateNote();
        }
      } else {
        this.changeState(0);
      }
    }) as EventListener;
    document.addEventListener("end-dragging", this.draggedListener, false);
  }

  // ============================================================================
  // METODI PRIVATI - Utility e helper
  // ============================================================================
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
    if (this.textareaHasFocus) {
      return;
    }
    const html = this.note?.text || '';
    const purifiedHtml = this.purifyAndNormalizeText(html);
    this.sanitizedNoteHtml = this.sanitizer.bypassSecurityTrustHtml(purifiedHtml);
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
    this.cancelOpenPanelTimer();
    this.openPanelTimer = setTimeout(() => {
      if (this.stateNote === 2) {
        this.noteSelected.emit(this.note);
      }
      this.openPanelTimer = null;
    }, 200);
  }

  private cancelOpenPanelTimer(): void {
    if (this.openPanelTimer) {
      clearTimeout(this.openPanelTimer);
      this.openPanelTimer = null;
    }
  }

  private cancelSingleClickTimer(): void {
    if (this.singleClickTimer) {
      clearTimeout(this.singleClickTimer);
      this.singleClickTimer = null;
    }
  }

  private recalculateNoteDimensionsAndPosition(element: HTMLElement): void {
    if (!this.note || !this.contentElement) return;
    
    const computedStyle = window.getComputedStyle(element);
    const left = parseFloat(computedStyle.left) || parseFloat(element.style.left) || element.offsetLeft || 0;
    const top = parseFloat(computedStyle.top) || parseFloat(element.style.top) || element.offsetTop || 0;
    const width = parseFloat(computedStyle.width) || parseFloat(element.style.width) || element.offsetWidth || this.note.width || 220;
    const height = parseFloat(computedStyle.height) || parseFloat(element.style.height) || element.offsetHeight || this.note.height || 50;
    
    this.note.x = left;
    this.note.y = top;
    this.note.width = width;
    this.note.height = height;
  }
  
  private updateDragState(): void {
    if (this.note?.note_id) {
      setTimeout(() => {
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
      }, 50);
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
