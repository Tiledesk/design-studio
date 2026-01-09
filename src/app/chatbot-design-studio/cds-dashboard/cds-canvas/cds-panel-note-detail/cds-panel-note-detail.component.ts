import { Component, ElementRef, EventEmitter, Input, OnInit, OnDestroy, Output, ViewChild } from '@angular/core';
import { Note } from 'src/app/models/note-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { NoteService } from 'src/app/services/note.service';
import { STAGE_SETTINGS, ColorUtils, NOTE_COLORS } from 'src/app/chatbot-design-studio/utils';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { QUILL_COLOR_TOKENS } from 'src/app/chatbot-design-studio/cds-dashboard/utils/quill-color-classes';
import { UploadService } from 'src/chat21-core/providers/abstract/upload.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { UploadModel } from 'src/chat21-core/models/upload';

@Component({
  selector: 'cds-panel-note-detail',
  templateUrl: './cds-panel-note-detail.component.html',
  styleUrls: ['./cds-panel-note-detail.component.scss']
})
export class CdsPanelNoteDetailComponent implements OnInit, OnDestroy {
  @Input() note: Note;
  @Output() closePanel = new EventEmitter();
  @Output() savePanelNoteDetail = new EventEmitter<Note>();
  @Output() deleteNote = new EventEmitter<Note>();
  @Output() duplicateNote = new EventEmitter<Note>();
  @ViewChild('quillEditor', { static: false }) quillEditor: any;
  @ViewChild('imageFileInput', { static: false }) imageFileInput: ElementRef<HTMLInputElement>;
  
  maximize: boolean = true;
  // private saveTimer: any = null; // Timer per il debounce del salvataggio automatico

  toolbarOptions: any;
  quillModules: any;
  
  // Sottoscrizioni per i cambiamenti delle note
  private noteUpdatedSubscription: Subscription;
  imageUrlInput: string = '';
  isReplacingImage: boolean = false;
  isUploadingImage: boolean = false;
  imagePreviewLoaded: boolean = false;
  imageUploadError: string = '';

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private readonly stageService: StageService,
    private readonly noteService: NoteService,
    private readonly uploadService: UploadService,
    private readonly tiledeskAuthService: TiledeskAuthService
  ) { }

  ngOnInit(): void {
    this.maximize = this.stageService.getMaximize();
    this.toolbarOptions = [
      ['bold', 'italic', 'underline'],            // testo
      [{ 'color': QUILL_COLOR_TOKENS }, { 'background': QUILL_COLOR_TOKENS }],    // colori (class-based, no inline styles)
      [{ 'align': [] }],                          // allineamento
      ['link'],                                   // link
      ['clean']                                   // rimuovi formattazione
    ];

    // Configurazione dei moduli Quill
    this.quillModules = {
      toolbar: this.toolbarOptions
    };
    
    // Sottoscrivi ai cambiamenti delle note per aggiornare il contenuto quando una nota viene modificata
    // Usa notesChanged$ invece di noteUpdated$ per aggiornare quando cambiano (non solo quando vengono salvate)
    this.noteUpdatedSubscription = this.noteService.notesChanged$
      .pipe(
        filter(notes => notes && notes.length > 0 && !!this.note)
      )
      .subscribe(notes => {
        // Cerca la nota specifica nell'array aggiornato
        const updatedNote = notes.find(n => n && n.note_id === this.note?.note_id);
        // Aggiorna la nota locale con i dati aggiornati
        if (updatedNote && this.note) {
          // Aggiorna tutte le proprietà della nota
          // Nota: non aggiorniamo il testo se l'utente sta modificando nel pannello
          // perché potrebbe causare conflitti
          const propertiesToUpdate = [
            'backgroundColor', 'backgroundOpacity',
            'borderColor', 'borderOpacity', 'borderWidth', 'boxShadow',
            'width', 'height', 'x', 'y'
          ];
          
          propertiesToUpdate.forEach(prop => {
            if (updatedNote[prop] !== undefined) {
              this.note[prop] = updatedNote[prop];
            }
          });
          
          // Aggiorna il testo solo se non è stato modificato localmente
          // (il testo viene gestito separatamente per evitare conflitti con Quill)
          if (updatedNote.text && updatedNote.text !== this.note.text) {
            // Aggiorna solo se Quill non ha il focus
            if (this.quillEditor && this.quillEditor.quillEditor) {
              const quillInstance = this.quillEditor.quillEditor;
              if (!quillInstance.hasFocus()) {
                this.note.text = updatedNote.text;
              }
            } else {
              this.note.text = updatedNote.text;
            }
          }
          
          this.logger.log('[CdsPanelNoteDetailComponent] Note updated from service (notesChanged$):', updatedNote.note_id);
        }
      });
  }

  // ============================================================================
  // IMAGE NOTE
  // ============================================================================
  get isImageNote(): boolean {
    return this.note?.type === 'image';
  }

  get imageSrc(): string {
    return ((this.note?.payload as any)?.imageSrc as string) || '';
  }

  get imageNaturalWidth(): number {
    return Number((this.note?.payload as any)?.imageWidth) || 0;
  }

  get imageNaturalHeight(): number {
    return Number((this.note?.payload as any)?.imageHeight) || 0;
  }

  get hasImage(): boolean {
    return !!this.imageSrc && this.imageNaturalWidth > 0 && this.imageNaturalHeight > 0;
  }

  triggerImageFilePicker(): void {
    if (!this.imageFileInput?.nativeElement) return;
    this.imageFileInput.nativeElement.value = '';
    this.imageFileInput.nativeElement.click();
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.loadImageFromFile(file);
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const dt = event.dataTransfer;
    if (!dt) return;

    const file = dt.files && dt.files.length > 0 ? dt.files[0] : null;
    if (file) {
      this.loadImageFromFile(file);
      return;
    }

    const url = dt.getData('text/uri-list') || dt.getData('text/plain');
    if (url) {
      this.loadImageFromUrl(url.trim());
    }
  }

  onImageDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onImageUrlSubmit(): void {
    const url = (this.imageUrlInput || '').trim();
    if (!url) return;
    this.loadImageFromUrl(url);
  }

  onReplaceImage(): void {
    // Replace: mostriamo di nuovo le opzioni di caricamento
    this.isReplacingImage = true;
    this.imagePreviewLoaded = false;
    this.imageUploadError = '';
  }

  private async loadImageFromFile(file: File): Promise<void> {
    if (!this.note) return;
    if (!file.type.startsWith('image/')) return;

    try {
      this.isUploadingImage = true;
      this.imagePreviewLoaded = false;
      this.imageUploadError = '';
      const user = this.tiledeskAuthService.getCurrentUser();
      const currentUpload = new UploadModel(file);
      const data = await this.uploadService.upload(user.uid, currentUpload);
      // VINCOLO: prima upload, poi salviamo l'URL risultante nella nota
      const url = data?.downloadURL || data?.src;
      if (!url) {
        throw new Error('Upload did not return downloadURL/src');
      }
      await this.setImageFromSrc(url);
    } catch (e) {
      this.imageUploadError = 'Upload failed. Please try again.';
      this.logger.error('[CdsPanelNoteDetailComponent] Error uploading image for image note', e);
    } finally {
      this.isUploadingImage = false;
    }
  }

  private async loadImageFromUrl(url: string): Promise<void> {
    if (!this.note) return;
    this.imagePreviewLoaded = false;
    try {
      this.isUploadingImage = true;
      this.imageUploadError = '';

      const normalized = this.normalizeImageUrl(url);
      if (!normalized) {
        this.imageUploadError = 'Invalid URL.';
        return;
      }

      // VINCOLO: per "link" prima salviamo l'immagine (upload) e poi scriviamo l'URL risultante nella nota.
      try {
        const uploadedUrl = await this.uploadImageFromExternalUrl(normalized);
        await this.setImageFromSrc(uploadedUrl);
        return;
      } catch (e) {
        /**
         * CORS NOTE:
         * Molti host consentono l'uso di <img src="..."> ma NON consentono fetch() cross-origin (manca Access-Control-Allow-Origin).
         * In quel caso il browser lancia TypeError: Failed to fetch.
         * Non possiamo "fixare" CORS lato client: fallbackiamo a hotlink diretto.
         */
        const msg = (e as any)?.message || '';
        const isFailedToFetch = typeof msg === 'string' && msg.toLowerCase().includes('failed to fetch');
        this.logger.warn('[CdsPanelNoteDetailComponent] uploadImageFromExternalUrl failed, fallback to hotlink', {
          url: normalized,
          isFailedToFetch,
          e
        });

        await this.setImageFromSrc(normalized);
        this.imageUploadError =
          'This URL cannot be imported into storage due to browser security (CORS). The image has been linked externally. To store a copy, upload the file instead.';
        return;
      }
    } catch (e) {
      this.imageUploadError = 'Unable to load image from this URL.';
      this.logger.error('[CdsPanelNoteDetailComponent] Error loading image from URL', { url, e });
    } finally {
      this.isUploadingImage = false;
    }
  }

  private async setImageFromSrc(src: string): Promise<void> {
    if (!this.note) return;
    this.imagePreviewLoaded = false;
    const { width, height } = await this.measureImage(src);

    if (!this.note.payload) this.note.payload = {};
    (this.note.payload as any).imageSrc = src;
    (this.note.payload as any).imageWidth = width;
    (this.note.payload as any).imageHeight = height;

    // Dimensioni sullo stage:
    // `tds_drawer` è scalato via transform (StageService.getZoom()).
    // Quindi per avere dimensione visiva = dimensione immagine * zoom,
    // dobbiamo salvare width/height come dimensione reale (a zoom=1),
    // senza dividere per lo zoom.
    this.note.width = width;
    this.note.height = height;

    // Reset scale locale della nota (evita deformazioni)
    this.note.scale = [1, 1];

    // Dopo caricamento valido: esci dalla modalità replace e salva immediatamente
    this.isReplacingImage = false;
    this.autoSave();
  }

  onImagePreviewLoad(): void {
    this.imagePreviewLoaded = true;
  }

  onImagePreviewError(): void {
    // Manteniamo placeholder visibile se il browser non riesce a renderizzare l'immagine
    this.imagePreviewLoaded = false;
  }

  private measureImage(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = src;
    });
  }

  private normalizeImageUrl(input: string): string | null {
    if (!input) return null;
    let url = input.trim();
    if (!url) return null;
    // Common UX: allow pasting without protocol
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      return new URL(url).toString();
    } catch {
      return null;
    }
  }

  private async uploadImageFromExternalUrl(url: string): Promise<string> {
    const user = this.tiledeskAuthService.getCurrentUser();

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status}`);
    }
    const blob = await res.blob();
    const type = blob.type || 'image/jpeg';
    if (!type.startsWith('image/')) {
      throw new Error(`Not an image: ${type}`);
    }

    const filenameFromUrl = (() => {
      try {
        const u = new URL(url);
        const last = u.pathname.split('/').filter(Boolean).pop() || 'image';
        return last;
      } catch {
        return 'image';
      }
    })();

    const file = new File([blob], filenameFromUrl, { type });
    const data = await this.uploadService.upload(user.uid, new UploadModel(file));
    const uploadedUrl = data?.downloadURL || data?.src;
    if (!uploadedUrl) {
      throw new Error('Upload did not return downloadURL/src');
    }
    return uploadedUrl;
  }

  // ============================================================================
  // BORDER WIDTH (spessore bordo)
  // ============================================================================
  onBorderWidthInput(event: Event): void {
    if (!this.note) return;
    const input = event.target as HTMLInputElement;
    let value = (input.value || '').replace(/[^0-9]/g, '');
    if (value.length > 2) {
      value = value.slice(0, 2);
    }
    input.value = value;
  }

  onBorderWidthChange(value?: any): void {
    if (!this.note) return;
    const parsed = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ''), 10) : value;
    let borderWidth = Number.isFinite(parsed) ? parsed : 0;
    borderWidth = Math.max(0, Math.min(20, borderWidth)); // 0..20px
    this.note.borderWidth = borderWidth;
    this.autoSave();
  }

  ngOnDestroy(): void {
    // Pulisce il timer se il componente viene distrutto prima che il salvataggio venga completato
    // if (this.saveTimer) {
    //   clearTimeout(this.saveTimer);
    //   this.saveTimer = null;
    // }
    
    // Rimuovi la sottoscrizione ai cambiamenti delle note
    if (this.noteUpdatedSubscription) {
      this.noteUpdatedSubscription.unsubscribe();
    }
  }


  /**
   * Gestisce il cambio di formattazione (per la sezione Background)
   * Calcola e salva il colore di sfondo finale in formato rgba nel note.backgroundColor
   * Accorpa le chiamate multiple ravvicinate tramite debounce
   */
  onFormatChange(): void {
    this.logger.log('[CdsPanelNoteDetailComponent] Format changed:', this.note);
    
    // Calcola e salva il colore di sfondo finale in formato rgba
    if (this.note) {
      this.note.backgroundColor = this.calculateBackgroundColorWithOpacity();
      this.note.borderColor = this.calculateBorderColorWithOpacity();
    }
    
    // Salvataggio automatico con debounce - accorpa le chiamate multiple ravvicinate
    this.autoSave();
  }

  /**
   * Gestisce il cambio del checkbox box-shadow
   */
  onBoxShadowChange(event: MatCheckboxChange): void {
    if (this.note) {
      this.note.boxShadow = event.checked;
      this.logger.log('[CdsPanelNoteDetailComponent] Box shadow changed:', this.note.boxShadow);
      
      // Salvataggio automatico con debounce
      this.autoSave();
    }
  }

  /**
   * Gestisce l'input in tempo reale, filtra solo numeri
   */
  onOpacityInput(event: Event, target: 'background' | 'border'): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Rimuove tutti i caratteri non numerici
    value = value.replace(/[^0-9]/g, '');

    // Limita a 3 cifre (max 100)
    if (value.length > 3) {
      value = value.slice(0, 3);
    }

    // Se il valore supera 100, imposta a 100
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 100) {
      value = '100';
    }

    // Aggiorna il valore nell'input
    input.value = value;

    // Aggiorna il modello se il valore è valido, altrimenti imposta a 0
    if (value !== '' && !isNaN(parseInt(value, 10))) {
      const normalizedValue = parseInt(value, 10);
      if (target === 'background') {
        this.note.backgroundOpacity = normalizedValue;
      } else {
        this.note.borderOpacity = normalizedValue;
      }
    } else {
      // Se il valore è vuoto, imposta a 0
      if (target === 'background') {
        this.note.backgroundOpacity = 0;
      } else {
        this.note.borderOpacity = 0;
      }
    }
  }

  /**
   * Gestisce il cambio di valore nell'input dell'opacità
   * Valida e normalizza il valore tra 0 e 100
   */
  onOpacityInputChange(target: 'background' | 'border', value?: any): void {
    if (!this.note) return;

    let inputValue: number;
    
    if (value !== undefined) {
      // Valore passato come parametro (da ngModelChange)
      inputValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ''), 10) : value;
    } else {
      // Usa il valore corrente dalla nota
      inputValue = target === 'background' 
        ? this.note.backgroundOpacity 
        : this.note.borderOpacity;
    }

    // Valida e normalizza il valore usando la funzione di utility
    const normalizedValue = ColorUtils.normalizeOpacityValue(inputValue, 0);

    // Aggiorna il valore normalizzato
    if (target === 'background') {
      this.note.backgroundOpacity = normalizedValue;
    } else {
      this.note.borderOpacity = normalizedValue;
    }

    // Aggiorna i colori con la nuova opacità
    // onFormatChange() chiamerà automaticamente autoSave() con debounce
    this.onFormatChange();
  }

  /**
   * Gestisce il blur dell'input dell'opacità
   * Assicura che il valore sia valido quando l'utente esce dal campo
   */
  onOpacityInputBlur(target: 'background' | 'border'): void {
    if (!this.note) return;

    const opacity = target === 'background' 
      ? this.note.backgroundOpacity 
      : this.note.borderOpacity;

    // Normalizza il valore usando la funzione di utility
    const normalizedValue = ColorUtils.normalizeOpacityValue(opacity, 0);

    // Aggiorna il valore normalizzato
    if (target === 'background') {
      this.note.backgroundOpacity = normalizedValue;
    } else {
      this.note.borderOpacity = normalizedValue;
    }

    // Aggiorna i colori con la nuova opacità
    // onFormatChange() chiamerà automaticamente autoSave()
    this.onFormatChange();
  }

  /**
   * Gestisce il cambio del colore in tempo reale durante la selezione nel picker
   * Viene chiamato durante il movimento del picker (evento input)
   * Aggiorna immediatamente il colore e notifica il cambiamento per visualizzazione in tempo reale
   */
  onColorInput(event: Event, target: 'background' | 'border', opacity: number): void {
    const colorInput = event.target as HTMLInputElement;
    const hexColor = colorInput.value; // Il color picker restituisce sempre hex
    if (!this.note) return;

    const { r, g, b } = ColorUtils.hexToRgb(hexColor);

    if (target === 'background') {
      this.note.backgroundColor = ColorUtils.buildRgba(r, g, b, opacity);
      this.logger.log('[CdsPanelNoteDetailComponent] Background color changed (real-time):', this.note.backgroundColor);
    } else {
      this.note.borderColor = ColorUtils.buildRgba(r, g, b, opacity);
      this.logger.log('[CdsPanelNoteDetailComponent] Border color changed (real-time):', this.note.borderColor);
    }

    // Notifica immediatamente il cambiamento per visualizzazione in tempo reale
    // senza debounce per avere feedback visivo istantaneo
    this.savePanelNoteDetail.emit(this.note);
  }

  /**
   * Gestisce il cambio colore dal color picker per background e border
   * Usa la stessa logica con opacità e trasparenza
   * Chiamato quando si chiude il picker (evento change)
   */
  onColorChange(event: Event, target: 'background' | 'border', opacity: number): void {
    const colorInput = event.target as HTMLInputElement;
    const hexColor = colorInput.value; // Il color picker restituisce sempre hex
    this.logger.log('[CdsPanelNoteDetailComponent] onColorChange:', target, opacity, hexColor);
    if (!this.note) return;

    // // Gestione trasparenza quando opacità è 0
    // if (target === 'background' && this.note.backgroundOpacity === 0) {
    //   this.note.backgroundColor = 'transparent';
    //   this.logger.log('[CdsPanelNoteDetailComponent] Background color set to transparent due to 0 opacity');
    //   return;
    // }
    // if (target === 'border' && this.note.borderOpacity === 0) {
    //   this.note.borderColor = 'transparent';
    //   this.logger.log('[CdsPanelNoteDetailComponent] Border color set to transparent due to 0 opacity');
    //   return;
    // }

    const { r, g, b } = ColorUtils.hexToRgb(hexColor);
    // const opacity = ColorUtils.normalizeOpacity(
    //   target === 'background' ? this.note.backgroundOpacity : this.note.borderOpacity
    // );

    if (target === 'background') {
      this.note.backgroundColor = ColorUtils.buildRgba(r, g, b, opacity);
      this.logger.log('[CdsPanelNoteDetailComponent] Background color changed:', this.note.backgroundColor);
    } else {
      this.note.borderColor = ColorUtils.buildRgba(r, g, b, opacity);
      this.logger.log('[CdsPanelNoteDetailComponent] Border color changed:', opacity, this.note.borderColor);
    }

    // Salvataggio automatico con debounce
    this.autoSave();
  }

  /**
   * Estrae il colore base (hex) per il color picker
   * Il color picker HTML accetta solo formato hex
   */
  getBaseColorForPicker(target: 'background' | 'border' = 'background'): string {
    if (!this.note) {
      const defaultColor = target === 'background' 
        ? NOTE_COLORS.BACKGROUND_COLOR 
        : NOTE_COLORS.BORDER_COLOR;
      return ColorUtils.rgbStringToHex(defaultColor);
    }

    const rawColor =
      target === 'background' ? this.note.backgroundColor : (this.note as any).borderColor;

    const defaultColor = target === 'background' 
      ? NOTE_COLORS.BACKGROUND_COLOR 
      : NOTE_COLORS.BORDER_COLOR;
    const defaultHex = ColorUtils.rgbStringToHex(defaultColor);

    return ColorUtils.toHexColor(rawColor, defaultHex);
  }

  /**
   * Calcola il colore di sfondo finale in formato rgba combinando backgroundColor e backgroundOpacity
   * Restituisce sempre un valore in formato rgba(r, g, b, opacity)
   */
  private calculateBackgroundColorWithOpacity(): string {
    if (!this.note) return `rgba(${NOTE_COLORS.BACKGROUND_COLOR}, 1)`;
    return ColorUtils.applyOpacityToColor(
      this.note.backgroundColor,
      this.note.backgroundOpacity,
      `rgba(${NOTE_COLORS.BACKGROUND_COLOR}, 1)`
    );
  }

  /**
   * Calcola il colore del bordo finale in formato rgba combinando borderColor e borderOpacity
   * Restituisce sempre un valore in formato rgba(r, g, b, opacity)
   */
  private calculateBorderColorWithOpacity(): string {
    if (!this.note) return `rgba(${NOTE_COLORS.BORDER_COLOR}, 1)`;
    return ColorUtils.applyOpacityToColor(
      this.note.borderColor,
      this.note.borderOpacity,
      `rgba(${NOTE_COLORS.BORDER_COLOR}, 1)`
    );
  }

  onSaveNote(): void {
    this.logger.log('[CdsPanelNoteDetailComponent] onSaveNote:: ', this.note);
    this.savePanelNoteDetail.emit(this.note);
  }

  /**
   * Gestisce il cambio di contenuto in Quill
   * Il contenuto è già sincronizzato tramite [(ngModel)]="note.text"
   * Chiama autoSave() per salvare automaticamente con debounce
   */
  onQuillContentChanged(event: any): void {
    if (!this.note || !event) return;
    
    try {
      // Il contenuto è già aggiornato in note.text tramite [(ngModel)]
      // Non serve confrontare o aggiornare manualmente
      // Chiama sempre autoSave() - il debounce gestisce le chiamate multiple
      this.logger.log('[CdsPanelNoteDetailComponent] Quill content changed, triggering auto-save', event);
      this.autoSave();
    } catch (error) {
      this.logger.error('[CdsPanelNoteDetailComponent] Error handling Quill content change:', error);
    }
  }

  /**
   * Salvataggio automatico con debounce di 1 secondo
   * Evita chiamate multiple troppo ravvicinate
   */
  private autoSave(): void {
    // Cancella il timer precedente se esiste
    // if (this.saveTimer) {
    //   clearTimeout(this.saveTimer);
    // }

    // Imposta un nuovo timer per il salvataggio dopo 1 secondo
    //this.saveTimer = setTimeout(() => {
      this.logger.log('[CdsPanelNoteDetailComponent] Auto-saving note after debounce');
      this.onSaveNote();
      // this.saveTimer = null;
    //}, 100);
  }

  onChangeMaximize(): void {
    this.maximize = !this.maximize;
    const id_faq_kb = this.note?.id_faq_kb;
    if (id_faq_kb) {
      this.stageService.saveSettings(id_faq_kb, STAGE_SETTINGS.Maximize, this.maximize);
    }
  }

  onClosePanel(): void {
    this.closePanel.emit();
  }

  /**
   * Gestisce l'eliminazione della nota
   */
  onDeleteNote(): void {
    if (this.note) {
      this.logger.log('[CdsPanelNoteDetailComponent] Delete note:', this.note.note_id);
      this.deleteNote.emit(this.note);
      this.closePanel.emit();
    }
  }

  /**
   * Gestisce la duplicazione della nota
   */
  onDuplicateNote(): void {
    if (this.note) {
      this.logger.log('[CdsPanelNoteDetailComponent] Duplicate note:', this.note.note_id);
      this.duplicateNote.emit(this.note);
    }
  }
}

