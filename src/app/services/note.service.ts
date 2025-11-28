import { Injectable } from '@angular/core';
import { Note } from '../models/note-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { FaqKbService } from './faq-kb.service';
import { DashboardService } from './dashboard.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private faqKbService: FaqKbService,
    private dashboardService: DashboardService
  ) { }

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
      // Assicurati che attributes esista
      if (!this.dashboardService.selectedChatbot.attributes) {
        this.dashboardService.selectedChatbot.attributes = {};
      }
      
      // Recupera tutte le note dal dashboardService (o array vuoto se non esiste)
      const notes = this.dashboardService.selectedChatbot.attributes.notes || [];
      
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
}

