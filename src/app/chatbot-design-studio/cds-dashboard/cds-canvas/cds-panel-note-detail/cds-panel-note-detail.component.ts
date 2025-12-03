import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, ViewChild } from '@angular/core';
import { Note } from 'src/app/models/note-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { NoteService } from 'src/app/services/note.service';
import { STAGE_SETTINGS, ColorUtils, NOTE_COLORS } from 'src/app/chatbot-design-studio/utils';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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
  
  maximize: boolean = true;
  private saveTimer: any = null; // Timer per il debounce del salvataggio automatico

  toolbarOptions: any;
  quillModules: any;
  
  // Sottoscrizioni per i cambiamenti delle note
  private noteUpdatedSubscription: Subscription;

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private readonly stageService: StageService,
    private readonly noteService: NoteService
  ) { }

  ngOnInit(): void {
    this.maximize = this.stageService.getMaximize();
    this.toolbarOptions = [
      ['bold', 'italic', 'underline'],            // testo
      [{ 'color': [] }, { 'background': [] }],    // colori
      [{ 'align': [] }],                          // allineamento
      ['link'],                                   // link
      ['clean']                                   // rimuovi formattazione
    ];

    // Configurazione dei moduli Quill
    this.quillModules = {
      toolbar: this.toolbarOptions
    };
    
    // Sottoscrivi ai cambiamenti delle note per aggiornare il contenuto quando una nota viene modificata
    this.noteUpdatedSubscription = this.noteService.noteUpdated$
      .pipe(
        filter(updatedNote => updatedNote && this.note && updatedNote.note_id === this.note.note_id)
      )
      .subscribe(updatedNote => {
        // Aggiorna la nota locale con i dati aggiornati
        if (updatedNote && this.note) {
          // Aggiorna tutte le proprietà della nota
          // Nota: non aggiorniamo il testo se l'utente sta modificando nel pannello
          // perché potrebbe causare conflitti
          const propertiesToUpdate = [
            'backgroundColor', 'backgroundOpacity',
            'borderColor', 'borderOpacity', 'boxShadow',
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
          
          this.logger.log('[CdsPanelNoteDetailComponent] Note updated from service:', updatedNote.note_id);
        }
      });
  }

  ngOnDestroy(): void {
    // Pulisce il timer se il componente viene distrutto prima che il salvataggio venga completato
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    
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
   * Gestisce il cambio colore dal color picker per background e border
   * Usa la stessa logica con opacità e trasparenza
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
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // Imposta un nuovo timer per il salvataggio dopo 1 secondo
    this.saveTimer = setTimeout(() => {
      this.logger.log('[CdsPanelNoteDetailComponent] Auto-saving note after debounce');
      this.onSaveNote();
      this.saveTimer = null;
    }, 1000);
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

