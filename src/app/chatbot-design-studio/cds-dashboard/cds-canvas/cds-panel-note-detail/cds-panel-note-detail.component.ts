import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Note } from 'src/app/models/note-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { STAGE_SETTINGS } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-panel-note-detail',
  templateUrl: './cds-panel-note-detail.component.html',
  styleUrls: ['./cds-panel-note-detail.component.scss']
})
export class CdsPanelNoteDetailComponent implements OnInit {
  @Input() note: Note;
  @Output() closePanel = new EventEmitter();
  @Output() savePanelNoteDetail = new EventEmitter<Note>();
  
  maximize: boolean = true;

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private readonly stageService: StageService
  ) { }

  ngOnInit(): void {
    this.maximize = this.stageService.getMaximize();
    this.initializeFormattingDefaults();
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
    if (this.note.textOpacity === undefined || this.note.textOpacity === null) this.note.textOpacity = 100;
    if (this.note.backgroundOpacity === undefined || this.note.backgroundOpacity === null) this.note.backgroundOpacity = 100;
    if (this.note.isLink === undefined || this.note.isLink === null) this.note.isLink = false;
    if (!this.note.linkUrl) this.note.linkUrl = '';
  }

  /**
   * Gestisce il cambio di formattazione
   */
  onFormatChange(): void {
    this.logger.log('[CdsPanelNoteDetailComponent] Format changed:', this.note);
  }

  /**
   * Imposta l'allineamento del testo
   */
  setTextAlign(align: 'left' | 'center' | 'right'): void {
    this.note.textAlign = align;
    this.onFormatChange();
  }

  /**
   * Attiva/disattiva lo stile italic
   */
  toggleItalic(): void {
    this.note.fontStyle = this.note.fontStyle === 'italic' ? 'normal' : 'italic';
    this.onFormatChange();
  }

  /**
   * Attiva/disattiva la sottolineatura
   */
  toggleUnderline(): void {
    this.note.textDecoration = this.note.textDecoration === 'underline' ? 'none' : 'underline';
    this.onFormatChange();
  }

  /**
   * Attiva/disattiva il link
   */
  toggleLink(): void {
    this.note.isLink = !this.note.isLink;
    if (!this.note.isLink) {
      this.note.linkUrl = '';
    }
    this.onFormatChange();
  }

  onSaveNote(): void {
    this.logger.log('[CdsPanelNoteDetailComponent] onSaveNote:: ', this.note);
    this.savePanelNoteDetail.emit(this.note);
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
}

