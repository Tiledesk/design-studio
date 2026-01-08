import { Component, EventEmitter, HostListener, OnInit, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { OPTIONS } from 'src/app/chatbot-design-studio/utils';
import { NoteType } from 'src/app/models/note-types';

@Component({
  selector: 'cds-options',
  templateUrl: './cds-options.component.html',
  styleUrls: ['./cds-options.component.scss']
})
export class CdsOptionsComponent implements OnInit {
  @ViewChild('alphaInput') alphaInput!: ElementRef;
  @ViewChild('divNote', { read: ElementRef }) divNote!: ElementRef<HTMLElement>;
  @Input() id_faq_kb: any;
  @Input() stateUndoRedo: any;
  @Output() onOptionClicked = new EventEmitter<{ option: OPTIONS; alpha?: any; isActive?: boolean; noteType?: NoteType }>();
  @Output() noteDroppedOnStage = new EventEmitter<{ noteType: NoteType; clientX: number; clientY: number }>();

  OPTIONS = OPTIONS;
  alpha: number;
  isMoreMenu: boolean = false;
  stageSettings: any;
  notePalette: Array<{ type: NoteType; icon: string; labelKey: string }> = [
    { type: 'rect', icon: 'crop_square', labelKey: 'CdsOptions.NoteType.Rectangle' },
    { type: 'text', icon: 'text_fields', labelKey: 'CdsOptions.NoteType.Text' },
    { type: 'image', icon: 'image', labelKey: 'CdsOptions.NoteType.Image' },
    { type: 'video', icon: 'videocam', labelKey: 'CdsOptions.NoteType.Video' },
  ];
  isNoteTypeMenuOpen: boolean = false;
  noteTypeMenuPos: { left: number; top: number } = { left: 0, top: 0 };
  private isDraggingNotePalette: boolean = false;
  
  

  constructor(
    private readonly stageService: StageService
  ) { }

  ngOnInit(): void {
    this.initialize();
  }


  private initialize(){
    this.alpha = this.stageService.getAlpha();
  }

  // updateAlphaConnectors() {
  //   this.onOptionClicked.emit({ option: OPTIONS.ALPHA, alpha: this.alpha });
  // }

  forceAlphaConnectorsFocus(): void {
    this.alphaInput.nativeElement.focus();
  }

  closeAlphaConnectorsMenu(){
    this.isMoreMenu = false;
  }

  toggleNoteTypeMenu(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.isNoteTypeMenuOpen = !this.isNoteTypeMenuOpen;
    if (!this.isNoteTypeMenuOpen) return;
    this.repositionNoteTypeMenu();
  }

  private repositionNoteTypeMenu(): void {
    const rect = this.divNote?.nativeElement?.getBoundingClientRect();
    if (!rect) return;

    // Replichiamo le stesse costanti che hai impostato nel CSS (top/left offsets)
    const menuOffsetLeft = -5;
    const menuOffsetTop = -10;
    const itemHeight = 30;
    const paddingY = 6 * 2; // padding menu content (top+bottom)
    const borderY = 3 * 2;
    const menuApproxHeight = paddingY + borderY + (itemHeight * this.notePalette.length);

    // Posizionamento: sopra al pulsante note, left-aligned
    this.noteTypeMenuPos = {
      left: rect.left + menuOffsetLeft,
      top: rect.top - menuApproxHeight + menuOffsetTop
    };
  }

  closeNoteTypeMenu(): void {
    if (this.isDraggingNotePalette) return;
    this.isNoteTypeMenuOpen = false;
  }


  onOptionClick(option){
    // Il pulsante NOTE ora serve solo ad aprire/chiudere il submenu.
    // La creazione note avviene solo via drag&drop dagli items del menu sullo stage.
    this.onOptionClicked.emit({option: option});
  }

  onNotePaletteDragEnded(event: CdkDragEnd, noteType: NoteType): void {
    // Reset visivo dell'item nel menu (il drag è solo "palette", non spostiamo realmente l'elemento)
    event.source.reset();
    document.body.classList.remove('cds-note-palette-dragging');
    this.isDraggingNotePalette = false;

    const rawEvent: any = (event as any).event;
    const clientX: number | undefined = rawEvent?.clientX ?? rawEvent?.changedTouches?.[0]?.clientX;
    const clientY: number | undefined = rawEvent?.clientY ?? rawEvent?.changedTouches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;

    const stageEl = document.getElementById('tds_container');
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const isInsideStage =
      clientX >= rect.left && clientX <= rect.right &&
      clientY >= rect.top && clientY <= rect.bottom;
    if (!isInsideStage) return;

    this.noteDroppedOnStage.emit({ noteType, clientX, clientY });
    // Chiudi il menu dopo un drop valido (evita click accidentali post-drag)
    this.isNoteTypeMenuOpen = false;
  }

  onNotePaletteDragStarted(): void {
    document.body.classList.add('cds-note-palette-dragging');
    this.isDraggingNotePalette = true;
  }

  onTogleAlphaConnectorsMenu(){
    this.isMoreMenu = !this.isMoreMenu;
    if(this.isMoreMenu){
      setTimeout(() => {
        if (this.alphaInput) {
          this.forceAlphaConnectorsFocus();
        }
      }, 0);
    } 
  }

  onChangeAlphaConnectors(alpha){
    this.onOptionClicked.emit({ option: OPTIONS.ALPHA, alpha: alpha });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.isNoteTypeMenuOpen) return;
    this.repositionNoteTypeMenu();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.isNoteTypeMenuOpen) return;
    if (this.isDraggingNotePalette) return;
    const target = event.target as HTMLElement;
    if (!target) return;
    if (target.closest('.note-type-menu') || target.closest('#cds-options-panel')) return;
    this.isNoteTypeMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isNoteTypeMenuOpen) return;
    this.isNoteTypeMenuOpen = false;
  }
}
