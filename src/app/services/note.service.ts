import { Injectable } from '@angular/core';
import { Note } from '../models/note-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor() { }

  /**
   * Ottiene la chiave del localStorage per un chatbot specifico
   */
  private getStorageKey(id_faq_kb: string): string {
    return `notes_${id_faq_kb}`;
  }

  /**
   * Salva una nota nel localStorage
   * Aggiunge la nota all'array esistente o crea un nuovo array
   */
  saveNote(note: Note, id_faq_kb: string): void {
    try {
      const storageKey = this.getStorageKey(id_faq_kb);
      const notes = this.getNotes(id_faq_kb);
      const existingIndex = notes.findIndex(n => n.note_id === note.note_id);
      
      if (existingIndex >= 0) {
        // Aggiorna la nota esistente
        notes[existingIndex] = note;
        this.logger.log('[NOTE-SERVICE] Note updated:', note.note_id);
      } else {
        // Aggiunge la nuova nota
        notes.push(note);
        this.logger.log('[NOTE-SERVICE] Note added:', note.note_id);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(notes));
      this.logger.log('[NOTE-SERVICE] Notes saved to localStorage. Key:', storageKey, 'Total notes:', notes.length);
    } catch (error) {
      this.logger.error('[NOTE-SERVICE] Error saving note:', error);
    }
  }

  /**
   * Recupera tutte le note dal localStorage per un chatbot specifico
   */
  getNotes(id_faq_kb: string): Note[] {
    try {
      const storageKey = this.getStorageKey(id_faq_kb);
      const notesJson = localStorage.getItem(storageKey);
      if (notesJson) {
        const notes = JSON.parse(notesJson);
        return notes;
        // Converti le date da stringa a Date object e imposta isNew = false per le note caricate
        // return notes.map((note: any) => ({
        //   ...note,
        //   createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
        //   isNew: false // Le note caricate dal localStorage non sono nuove
        // }));
      }
      return [];
    } catch (error) {
      this.logger.error('[NOTE-SERVICE] Error getting notes:', error);
      return [];
    }
  }

  /**
   * Elimina una nota dal localStorage
   */
  deleteNote(noteId: string, id_faq_kb: string): void {
    try {
      const storageKey = this.getStorageKey(id_faq_kb);
      const notes = this.getNotes(id_faq_kb);
      const filteredNotes = notes.filter(n => n.note_id !== noteId);
      localStorage.setItem(storageKey, JSON.stringify(filteredNotes));
      this.logger.log('[NOTE-SERVICE] Note deleted:', noteId);
    } catch (error) {
      this.logger.error('[NOTE-SERVICE] Error deleting note:', error);
    }
  }

  /**
   * Elimina tutte le note dal localStorage per un chatbot specifico
   */
  clearNotes(id_faq_kb: string): void {
    try {
      const storageKey = this.getStorageKey(id_faq_kb);
      localStorage.removeItem(storageKey);
      this.logger.log('[NOTE-SERVICE] All notes cleared for chatbot:', id_faq_kb);
    } catch (error) {
      this.logger.error('[NOTE-SERVICE] Error clearing notes:', error);
    }
  }
}

