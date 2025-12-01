import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, ViewChild, ElementRef } from '@angular/core';
import { Note } from 'src/app/models/note-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { STAGE_SETTINGS, ColorUtils, NOTE_COLORS } from 'src/app/chatbot-design-studio/utils';
import { MatCheckboxChange } from '@angular/material/checkbox';

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
  @ViewChild('richTextEditor', { static: false }) richTextEditor: ElementRef<HTMLDivElement>;
  @ViewChild('quillEditor', { static: false }) quillEditor: any;
  
  maximize: boolean = true;
  showLinkDialog: boolean = false;
  linkUrl: string = '';
  selectedText: string = '';
  private savedSelection: Range | null = null;
  private savedSelectedText: string = '';
  private saveTimer: any = null; // Timer per il debounce del salvataggio automatico


  toolbarOptions: any;
  quillModules: any;

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private readonly stageService: StageService
  ) { }

  ngOnInit(): void {
    this.maximize = this.stageService.getMaximize();
    this.initializeFormattingDefaults();

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
  }

  ngOnDestroy(): void {
    // Pulisce il timer se il componente viene distrutto prima che il salvataggio venga completato
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * Inizializza i valori di default per la formattazione se non sono presenti
   */
  private initializeFormattingDefaults(): void {
    if (!this.note) return;
    
    if (!this.note.fontFamily) this.note.fontFamily = 'Open Sans';
    if (!this.note.fontSize) this.note.fontSize = 14;
    if (!this.note.textAlign) this.note.textAlign = 'left';
    if (!this.note.fontStyle) this.note.fontStyle = 'normal';
    if (!this.note.textDecoration) this.note.textDecoration = 'none';
    if (!this.note.textColor) this.note.textColor = '#000000';
    this.note.textOpacity = this.note.textOpacity ?? 100;
    // Inizializza l'opacità di sfondo se non presente
    this.note.backgroundOpacity = this.note.backgroundOpacity ?? 100;
    
    // Inizializza il colore di sfondo se non presente usando NOTE_COLORS.BACKGROUND_COLOR
    // Il colore viene sempre salvato in formato rgba completo (con opacità)
    if (!this.note.backgroundColor) {
      const opacity = (this.note.backgroundOpacity || 100) / 100;
      this.note.backgroundColor = `rgba(${NOTE_COLORS.BACKGROUND_COLOR}, ${opacity})`;
    }
    // Nota: non modifichiamo il colore esistente all'apertura per preservare i valori salvati
    
    // Inizializza l'opacità del bordo se non presente
    this.note.borderOpacity = this.note.borderOpacity ?? 100;
    
    // Inizializza il colore del bordo se non presente usando NOTE_COLORS.BORDER_COLOR
    if (!this.note.borderColor) {
      const opacity = (this.note.borderOpacity || 100) / 100;
      this.note.borderColor = `rgba(${NOTE_COLORS.BORDER_COLOR}, ${opacity})`;
    }
    // Nota: non modifichiamo il colore esistente all'apertura per preservare i valori salvati
    
    // Inizializza boxShadow se non presente (default: true)
    if (this.note.boxShadow === undefined || this.note.boxShadow === null) {
      this.note.boxShadow = true;
    }
    
    if (this.note.isLink === undefined || this.note.isLink === null) this.note.isLink = false;
    if (!this.note.linkUrl) this.note.linkUrl = '';
  }

  /**
   * Applica formattazione al testo selezionato nell'editor
   * Mantiene la selezione dopo l'applicazione dello stile
   */
  formatText(command: string): void {
    // Salva la selezione corrente e il testo selezionato
    this.saveSelection();
    const selection = window.getSelection();
    this.savedSelectedText = selection ? selection.toString() : '';
    
    // Applica il comando di formattazione
    document.execCommand(command, false, undefined);
    // Aggiorna il testo
    this.updateNoteText();
    // Ripristina la selezione per mantenere il testo evidenziato
    setTimeout(() => {
      this.restoreSelection();
    }, 0);
  }

  /**
   * Applica il colore al testo selezionato
   * Mantiene la selezione dopo l'applicazione del colore
   */
  formatTextColor(event: Event): void {
    // Salva la selezione corrente e il testo selezionato
    this.saveSelection();
    const selection = window.getSelection();
    this.savedSelectedText = selection ? selection.toString() : '';
    
    const colorInput = event.target as HTMLInputElement;
    const color = colorInput.value;
    // Applica il colore
    document.execCommand('foreColor', false, color);
    // Aggiorna il testo
    this.updateNoteText();
    // Ripristina la selezione per mantenere il testo evidenziato
    setTimeout(() => {
      this.restoreSelection();
    }, 0);
  }

  /**
   * Ottiene il colore corrente del testo selezionato
   */
  getCurrentTextColor(): string {
    return this.note?.textColor || '#000000';
  }

  /**
   * Inserisce un link nel testo selezionato
   */
  insertLink(): void {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      this.selectedText = selection.toString();
      this.showLinkDialog = true;
      setTimeout(() => {
        const input = document.querySelector('.link-dialog input') as HTMLInputElement;
        if (input) input.focus();
      }, 0);
    } else {
      // Se non c'è testo selezionato, chiedi l'URL
      this.selectedText = '';
      this.showLinkDialog = true;
      setTimeout(() => {
        const input = document.querySelector('.link-dialog input') as HTMLInputElement;
        if (input) input.focus();
      }, 0);
    }
  }

  /**
   * Conferma l'inserimento del link
   */
  confirmLink(): void {
    if (this.linkUrl && this.linkUrl.trim() !== '') {
      if (this.selectedText) {
        // C'è testo selezionato, crea il link
        document.execCommand('createLink', false, this.linkUrl);
      } else {
        // Non c'è testo selezionato, inserisci l'URL come link
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const link = document.createElement('a');
          link.href = this.linkUrl;
          link.textContent = this.linkUrl;
          range.insertNode(link);
        }
      }
      this.updateNoteText();
    }
    this.cancelLink();
  }

  /**
   * Annulla l'inserimento del link
   */
  cancelLink(): void {
    this.showLinkDialog = false;
    this.linkUrl = '';
    this.selectedText = '';
    // Ripristina il focus sull'editor
    if (this.richTextEditor) {
      this.richTextEditor.nativeElement.focus();
    }
  }

  /**
   * Gestisce l'input nell'editor
   * Salva e ripristina la posizione del cursore per evitare che si sposti
   */
  onEditorInput(event: Event): void {
    // Salva la posizione del cursore prima di aggiornare
    //this.saveSelection();
    // Aggiorna il testo
    //this.updateNoteText();
    // Ripristina la posizione del cursore dopo l'aggiornamento
    //setTimeout(() => {
      //this.restoreSelection();
    //}, 0);
  }

  /**
   * Gestisce il focus sull'editor
   */
  onEditorFocus(): void {
    // Mantieni il focus per permettere la formattazione
  }

  /**
   * Gestisce il blur dell'editor
   */
  onEditorBlur(): void {
    this.updateNoteText();
  }

  /**
   * Aggiorna il testo della nota con il contenuto HTML dell'editor
   */
  private updateNoteText(): void {
    if (this.richTextEditor && this.note) {
      // Non aggiornare l'innerHTML se è già aggiornato per evitare di perdere il cursore
      const currentHtml = this.richTextEditor.nativeElement.innerHTML;
      if (this.note.text !== currentHtml) {
        this.note.text = currentHtml;
        this.logger.log('[CdsPanelNoteDetailComponent] Text updated:', this.note.text);
      }
    }
  }

  /**
   * Salva la posizione corrente del cursore/selezione
   */
  private saveSelection(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedSelection = selection.getRangeAt(0).cloneRange();
    } else {
      this.savedSelection = null;
    }
  }

  /**
   * Ripristina la posizione del cursore/selezione salvata
   * Aggiorna il range per riflettere eventuali modifiche al DOM dopo la formattazione
   */
  private restoreSelection(): void {
    if (this.savedSelection && this.richTextEditor) {
      const selection = window.getSelection();
      if (selection) {
        try {
          // Crea un nuovo range basato sulle posizioni salvate
          const startContainer = this.savedSelection.startContainer;
          const endContainer = this.savedSelection.endContainer;
          
          // Verifica che i container siano ancora validi
          if (this.richTextEditor.nativeElement.contains(startContainer) &&
              this.richTextEditor.nativeElement.contains(endContainer)) {
            
            // Prova a ripristinare il range originale
            try {
              const range = document.createRange();
              range.setStart(startContainer, this.savedSelection.startOffset);
              range.setEnd(endContainer, this.savedSelection.endOffset);
              selection.removeAllRanges();
              selection.addRange(range);
              return;
            } catch (e) {
              // Se il range originale non funziona, prova a selezionare il testo formattato
            }
          }
          
          // Se i container non sono più validi o il range non funziona,
          // cerca di selezionare il testo che è stato appena formattato
          this.selectFormattedText();
        } catch (e) {
          // Se c'è un errore, prova a selezionare il testo formattato
          this.selectFormattedText();
        }
      }
    }
  }

  /**
   * Seleziona il testo che è stato appena formattato
   * Cerca il testo salvato nel DOM e lo seleziona
   */
  private selectFormattedText(): void {
    if (!this.richTextEditor || !this.savedSelectedText) return;
    
    const editor = this.richTextEditor.nativeElement;
    const selection = window.getSelection();
    
    if (!selection) return;
    
    try {
      // Cerca il testo salvato nel DOM
      const textToFind = this.savedSelectedText.trim();
      
      if (textToFind.length === 0) {
        this.placeCaretAtEnd(editor);
        return;
      }
      
      // Cerca tutti i nodi di testo nell'editor
      const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let foundNode: Node | null = null;
      let foundOffset = -1;
      
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeText = node.textContent || '';
        
        // Cerca il testo salvato nel nodo corrente
        const index = nodeText.indexOf(textToFind);
        if (index !== -1) {
          foundNode = node;
          foundOffset = index;
          break;
        }
      }
      
      if (foundNode && foundOffset !== -1) {
        // Seleziona il testo trovato
        const range = document.createRange();
        range.setStart(foundNode, foundOffset);
        range.setEnd(foundNode, foundOffset + textToFind.length);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      
      // Se non trova il testo esatto, cerca elementi formattati che potrebbero contenere il testo
      const formattedElements = editor.querySelectorAll('strong, em, u, span[style], a');
      
      for (let i = formattedElements.length - 1; i >= 0; i--) {
        const element = formattedElements[i] as HTMLElement;
        const elementText = element.textContent || '';
        
        // Se l'elemento contiene il testo cercato (o parte di esso)
        if (elementText.includes(textToFind) || textToFind.includes(elementText)) {
          const range = document.createRange();
          range.selectNodeContents(element);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
      }
      
      // Se tutto fallisce, posiziona il cursore alla fine
      this.placeCaretAtEnd(editor);
    } catch (e) {
      // Se c'è un errore, posiziona il cursore alla fine
      this.placeCaretAtEnd(editor);
    }
  }

  /**
   * Posiziona il cursore alla fine del contenuto
   */
  private placeCaretAtEnd(element: HTMLElement): void {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
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
    
    // Aggiorna immediatamente il testo se presente nell'editor
    if (this.richTextEditor && this.note) {
      this.updateNoteText();
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
   * Converte il Delta in HTML e salva nel note.text
   */
  onQuillContentChanged(event: any): void {
    if (!this.note || !event) return;

    try {
      // Quill restituisce il contenuto in formato Delta
      // Convertiamo in HTML usando il metodo getContents() e poi convertiamo in HTML
      const quillInstance = event.editor;
      if (quillInstance) {
        // Ottieni il contenuto HTML dall'editor Quill
        const htmlContent = quillInstance.root.innerHTML;
        
        // Aggiorna il testo della nota con l'HTML
        if (this.note.text !== htmlContent) {
          this.note.text = htmlContent;
          this.logger.log('[CdsPanelNoteDetailComponent] Quill content changed, HTML:', htmlContent);
          
          // Salvataggio automatico con debounce
          this.autoSave();
        }
      }
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

