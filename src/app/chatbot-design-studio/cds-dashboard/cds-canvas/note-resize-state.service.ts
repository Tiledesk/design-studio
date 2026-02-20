import { Injectable } from '@angular/core';
import { Note } from 'src/app/models/note-model';

/**
 * Stato condiviso durante il resize orizzontale di una nota.
 * Il parent (cds-canvas) usa getNoteLeft(note) per applicare la stessa left che il figlio imposta,
 * evitando che la change detection riapplichi note.x (valore vecchio) e causi flicker.
 */
@Injectable()
export class NoteResizeStateService {
  resizingNoteId: string | null = null;
  liveLeft: number = 0;

  setHorizontalResize(noteId: string | null, left?: number): void {
    this.resizingNoteId = noteId;
    if (noteId != null && left !== undefined) {
      this.liveLeft = left;
    }
  }

  /** Restituisce la left da usare per la nota: live durante resize orizzontale, altrimenti note.x */
  getNoteLeft(note: Note): number {
    if (note && this.resizingNoteId === note.note_id) {
      return this.liveLeft;
    }
    return note?.x ?? 0;
  }
}
