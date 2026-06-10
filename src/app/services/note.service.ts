import { Injectable } from '@angular/core';
import { Note } from '../models/note-model';
import { NoteType } from '../models/note-types';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { FaqKbService } from './faq-kb.service';
import { DashboardService } from './dashboard.service';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private logger: LoggerService = LoggerInstance.getInstance();
  private static readonly LAST_USED_NOTE_STYLE_STORAGE_KEY = 'cds_last_used_note_style_v1';
  
  // Subject per notificare i cambiamenti alle note
  // Emette l'array completo di note quando viene modificato
  private notesChangedSubject = new BehaviorSubject<Note[]>([]);
  public notesChanged$ = this.notesChangedSubject.asObservable();
  
  // Subject per notificare i cambiamenti a una singola nota
  // Emette la nota modificata
  private noteUpdatedSubject = new Subject<Note>();
  public noteUpdated$ = this.noteUpdatedSubject.asObservable();

  constructor(
    private faqKbService: FaqKbService,
    private dashboardService: DashboardService
  ) { }

  /**
   * Normalizza i default per retro-compatibilità (note salvate prima dell'introduzione dei tipi).
   * Da chiamare prima di persistere o duplicare.
   */
  private ensureNoteDefaults(note: Note): void {
    if (!note) return;
    if (!note.type) {
      note.type = 'text';
    }
    if (note.borderWidth === undefined || note.borderWidth === null) {
      note.borderWidth = Note.DEFAULT_BORDER_WIDTH;
    }
    // Default colors depend on note type (retro-compat for saved notes missing these fields).
    if (!note.backgroundColor) {
      note.backgroundColor = Note.defaultBackgroundColor(note.type);
    }
    if (!note.borderColor) {
      note.borderColor = Note.defaultBorderColor(note.type);
    }
  }

  // ============================================================================
  // LocalStorage: "Last used" note style (per type)
  // ============================================================================
  private safeReadLocalStorage(key: string): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  private safeWriteLocalStorage(key: string, value: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, value);
    } catch (e) {
      // ignore (privacy mode / storage full / server-side rendering)
    }
  }

  private normalizeNoteType(type?: NoteType): NoteType {
    if (!type) return 'text';
    if (type === 'media') return 'media';
    if (type === 'rect') return 'rect';
    return 'text';
  }

  public getLastUsedColorsForType(type?: NoteType): {
    backgroundColor?: string;
    backgroundOpacity?: number;
    borderColor?: string;
    borderOpacity?: number;
    borderWidth?: number;
    boxShadow?: boolean;
  } | null {
    const normalized = this.normalizeNoteType(type);
    if (normalized === 'media') return null;

    const raw = this.safeReadLocalStorage(NoteService.LAST_USED_NOTE_STYLE_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as any;
      const t = parsed?.[normalized];
      if (!t || typeof t !== 'object') return null;
      return {
        backgroundColor: typeof t.backgroundColor === 'string' ? t.backgroundColor : undefined,
        backgroundOpacity: typeof t.backgroundOpacity === 'number' ? t.backgroundOpacity : undefined,
        borderColor: typeof t.borderColor === 'string' ? t.borderColor : undefined,
        borderOpacity: typeof t.borderOpacity === 'number' ? t.borderOpacity : undefined,
        borderWidth: typeof t.borderWidth === 'number' ? t.borderWidth : undefined,
        boxShadow: typeof t.boxShadow === 'boolean' ? t.boxShadow : undefined,
      };
    } catch (e) {
      return null;
    }
  }

  public setLastUsedColorsForType(type: NoteType, colors: {
    backgroundColor?: string;
    backgroundOpacity?: number;
    borderColor?: string;
    borderOpacity?: number;
    borderWidth?: number;
    boxShadow?: boolean;
  }): void {
    const normalized = this.normalizeNoteType(type);
    if (normalized === 'media') return;

    const raw = this.safeReadLocalStorage(NoteService.LAST_USED_NOTE_STYLE_STORAGE_KEY);
    let parsed: any = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) || {};
      } catch (e) {
        parsed = {};
      }
    }

    parsed[normalized] = {
      ...(parsed[normalized] || {}),
      ...(colors || {}),
    };

    this.safeWriteLocalStorage(NoteService.LAST_USED_NOTE_STYLE_STORAGE_KEY, JSON.stringify(parsed));
  }

  public rememberLastUsedColorsFromNote(note: Note | null | undefined): void {
    if (!note) return;
    const type = this.normalizeNoteType(note.type);
    if (type === 'media') return;

    this.setLastUsedColorsForType(type, {
      backgroundColor: note.backgroundColor,
      backgroundOpacity: note.backgroundOpacity,
      borderColor: note.borderColor,
      borderOpacity: note.borderOpacity,
      borderWidth: note.borderWidth,
      boxShadow: note.boxShadow,
    });
  }
  
  /**
   * Notifica i cambiamenti all'array di note
   * Chiamato internamente quando l'array viene modificato
   */
  public notifyNotesChanged(): void {
    const notes = this.dashboardService.selectedChatbot.attributes?.notes || [];
    this.notesChangedSubject.next([...notes]);
    this.logger.log('[NOTE-SERVICE] Notes changed notification sent. Total notes:', notes.length);
  }
  
  /**
   * Notifica i cambiamenti a una singola nota
   * @param note - La nota che è stata modificata
   */
  private notifyNoteUpdated(note: Note): void {
    this.noteUpdatedSubject.next(note);
    this.logger.log('[NOTE-SERVICE] Note updated notification sent:', note.note_id);
  }

  /**
   * Ottiene la chiave del localStorage per un chatbot specifico
   */
  // private getStorageKey(id_faq_kb: string): string {
  //   return `notes_${id_faq_kb}`;
  // }

  /**
   * Salva una nota nel localStorage
   * Aggiunge la nota all'array esistente o crea un nuovo array
   * Dopo il salvataggio locale, salva anche in remoto tramite saveRemoteNote
   * Best practice: Il servizio gestisce tutto internamente, recuperando e aggiornando l'array completo
   * @param note - La nota da salvare
   * @param id_faq_kb - ID del chatbot
   */
  // saveNote(note: Note, id_faq_kb: string): void {
  //   try {
  //     const storageKey = this.getStorageKey(id_faq_kb);
  //     // Recupera tutte le note esistenti
  //     const notes = this.getNotes(id_faq_kb);
  //     const existingIndex = notes.findIndex(n => n.note_id === note.note_id);
      
  //     if (existingIndex >= 0) {
  //       // Aggiorna la nota esistente
  //       notes[existingIndex] = note;
  //       this.logger.log('[NOTE-SERVICE] Note updated:', note.note_id);
  //     } else {
  //       // Aggiunge la nuova nota
  //       notes.push(note);
  //       this.logger.log('[NOTE-SERVICE] Note added:', note.note_id);
  //     }
      
  //     // Salva l'array aggiornato nel localStorage
  //     localStorage.setItem(storageKey, JSON.stringify(notes));
  //     this.logger.log('[NOTE-SERVICE] Notes saved to localStorage. Key:', storageKey, 'Total notes:', notes.length);
      
  //   } catch (error) {
  //     this.logger.error('[NOTE-SERVICE] Error saving note:', error);
  //   }
  // }

  /**
   * Recupera tutte le note dal localStorage per un chatbot specifico
   * Se non ci sono note nel localStorage, tenta di recuperarle da remoto
   */
  // getNotes(id_faq_kb: string): Note[] {
  //   try {
  //     const storageKey = this.getStorageKey(id_faq_kb);
  //     const notesJson = localStorage.getItem(storageKey);
  //     if (notesJson) {
  //       const notes = JSON.parse(notesJson);
  //       return notes;
  //     }
  //     return [];
  //   } catch (error) {
  //     this.logger.error('[NOTE-SERVICE] Error getting notes:', error);
  //     return [];
  //   }
  // }

  /**
   * Elimina una nota dal localStorage
   */
  // deleteNote(noteId: string, id_faq_kb: string): void {
  //   try {
  //     const storageKey = this.getStorageKey(id_faq_kb);
  //     const notes = this.getNotes(id_faq_kb);
  //     const filteredNotes = notes.filter(n => n.note_id !== noteId);
  //     localStorage.setItem(storageKey, JSON.stringify(filteredNotes));
  //     this.logger.log('[NOTE-SERVICE] Note deleted:', noteId);
  //   } catch (error) {
  //     this.logger.error('[NOTE-SERVICE] Error deleting note:', error);
  //   }
  // }

  /**
   * Elimina tutte le note dal localStorage per un chatbot specifico
   */
  // clearNotes(id_faq_kb: string): void {
  //   try {
  //     const storageKey = this.getStorageKey(id_faq_kb);
  //     localStorage.removeItem(storageKey);
  //     this.logger.log('[NOTE-SERVICE] All notes cleared for chatbot:', id_faq_kb);
  //   } catch (error) {
  //     this.logger.error('[NOTE-SERVICE] Error clearing notes:', error);
  //   }
  // }

  /**
   * Salva le note in remoto tramite patchAttributes
   * Recupera tutte le note dal dashboardService, aggiorna o aggiunge la nota specifica,
   * e salva l'array completo in remoto
   * @param note - La nota da salvare o aggiornare
   * @param id_faq_kb - ID del chatbot a cui appartengono le note
   * @returns Observable che emette il risultato della chiamata
   */
  saveRemoteNote(note: Note, id_faq_kb: string): Observable<any> {
    try {
      this.ensureNoteDefaults(note);

      // Assicurati che attributes esista
      if (!this.dashboardService.selectedChatbot.attributes) {
        this.dashboardService.selectedChatbot.attributes = {};
      }
      
      // Recupera tutte le note dal dashboardService (o array vuoto se non esiste)
      const notes = this.dashboardService.selectedChatbot.attributes.notes || [];
      // Garantisce default anche per note già presenti (retro-compatibilità)
      notes.forEach(n => this.ensureNoteDefaults(n));
      
      // Cerca se la nota esiste già nell'array
      const existingIndex = notes.findIndex(n => n.note_id === note.note_id);
      
      if (existingIndex >= 0) {
        // Sostituisce la nota esistente
        notes[existingIndex] = note;
        this.logger.log('[NOTE-SERVICE] Note updated in array:', note.note_id);
      } else {
        // Aggiunge la nuova nota all'array
        notes.push(note);
        this.logger.log('[NOTE-SERVICE] Note added to array:', note.note_id);
      }
      
      // Aggiorna anche l'array nel dashboardService per mantenere la sincronizzazione
      this.dashboardService.selectedChatbot.attributes.notes = notes;
      
      this.logger.log('[NOTE-SERVICE] Saving notes remotely:', notes.length, 'notes for chatbot:', id_faq_kb);
      
      // Notifica i cambiamenti
      this.notifyNotesChanged();
      this.notifyNoteUpdated(note);
      
      // Prepara gli attributi da inviare
      const attributes = {
        notes: notes
      };
      
      // Chiama patchAttributes per salvare le note in remoto
      return this.faqKbService.patchAttributes(id_faq_kb, attributes);
    } catch (error) {
      this.logger.error('[NOTE-SERVICE] Error saving notes remotely:', error);
      throw error;
    }
  }

  /**
   * Elimina una nota dall'array e salva l'array aggiornato in remoto
   * @param note - La nota da eliminare
   * @param id_faq_kb - ID del chatbot a cui appartiene la nota
   * @returns Observable che emette il risultato della chiamata
   */
  deleteNote(note: Note, id_faq_kb: string): Observable<any> {
    try {
      this.logger.log('[NOTE-SERVICE] deleteNote note:', note.note_id);
      
      if (!note || !note.note_id) {
        throw new Error('Note is required for deletion');
      }

      // Assicurati che attributes esista
      if (!this.dashboardService.selectedChatbot.attributes) {
        this.dashboardService.selectedChatbot.attributes = {};
      }
      
      // Recupera tutte le note dal dashboardService
      const notes = this.dashboardService.selectedChatbot.attributes?.notes || [];
      
      // Rimuove la nota dall'array
      const filteredNotes = notes.filter(n => n.note_id !== note.note_id);
      
      // Aggiorna l'array nel dashboardService
      this.dashboardService.selectedChatbot.attributes.notes = filteredNotes;
      
      this.logger.log('[NOTE-SERVICE] Note removed from array. Remaining notes:', filteredNotes.length);
      
      // Notifica i cambiamenti
      this.notifyNotesChanged();
      
      // Prepara gli attributi da inviare
      const attributes = {
        notes: filteredNotes
      };
      
      // Chiama patchAttributes per salvare l'array aggiornato in remoto
      return this.faqKbService.patchAttributes(id_faq_kb, attributes);
    } catch (error) {
      this.logger.error('[NOTE-SERVICE] Error deleting note:', error);
      throw error;
    }
  }

  /**
   * Duplica una nota creando una copia con un nuovo ID e posizione leggermente spostata
   * @param note - La nota da duplicare
   * @param id_faq_kb - ID del chatbot a cui appartiene la nota
   * @returns Observable che emette la nota duplicata e il risultato della chiamata
   */
  duplicateNote(note: Note, id_faq_kb: string): Observable<Note> {
    try {
      this.logger.log('[NOTE-SERVICE] duplicateNote note:', note.note_id);
      
      if (!note || !note.note_id) {
        throw new Error('Note is required for duplication');
      }
      this.ensureNoteDefaults(note);

      // Crea una copia della nota con un nuovo ID
      // Sposta leggermente la posizione della nota duplicata
      const duplicatedNote = new Note(id_faq_kb, {
        x: note.x + 20,
        y: note.y + 20
      });
      
      /**
       * Copia tutte le proprietà dalla nota originale, mantenendo:
       * - `note_id` nuovo (generato dal costruttore)
       * - `createdAt` nuovo
       * - `x/y` spostati di offset
       * - `id_faq_kb` coerente con quello passato
       *
       * Questo rende la duplicazione future-proof (nuove proprietà come `type/payload`,
       * `scale/rotation`, `fontSize/fontFamily`, ecc. vengono duplicate automaticamente).
       */
      const {
        note_id: _noteId,
        createdAt: _createdAt,
        x: _x,
        y: _y,
        id_faq_kb: _idFaqKb,
        ...rest
      } = note as any;
      Object.assign(duplicatedNote, rest);
      duplicatedNote.id_faq_kb = id_faq_kb;
      duplicatedNote.x = note.x + 20;
      duplicatedNote.y = note.y + 20;
      duplicatedNote.createdAt = new Date();
      duplicatedNote.isNew = true;
      
      // Assicurati che attributes esista
      if (!this.dashboardService.selectedChatbot.attributes) {
        this.dashboardService.selectedChatbot.attributes = {};
      }
      
      // Recupera tutte le note dal dashboardService
      const notes = this.dashboardService.selectedChatbot.attributes?.notes || [];
      
      // Aggiunge la nota duplicata all'array
      notes.push(duplicatedNote);
      
      // Aggiorna l'array nel dashboardService
      this.dashboardService.selectedChatbot.attributes.notes = notes;
      
      this.logger.log('[NOTE-SERVICE] Note duplicated. New note ID:', duplicatedNote.note_id);
      
      // Notifica i cambiamenti
      this.notifyNotesChanged();
      this.notifyNoteUpdated(duplicatedNote);
      
      // Prepara gli attributi da inviare
      const attributes = {
        notes: notes
      };
      
      // Salva la nota duplicata in remoto e restituisce la nota duplicata
      return this.faqKbService.patchAttributes(id_faq_kb, attributes).pipe(
        map(() => duplicatedNote)
      );
    } catch (error) {
      this.logger.error('[NOTE-SERVICE] Error duplicating note:', error);
      throw error;
    }
  }
}

