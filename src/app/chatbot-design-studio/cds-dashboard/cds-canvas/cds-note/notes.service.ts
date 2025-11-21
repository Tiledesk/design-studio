import { Injectable } from '@angular/core';
import { Note } from './note.model';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private storageKey = 'tiledesk_notes_example';

  save(notes: Note[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(notes));
  }

  load(): Note[] {
    const v = localStorage.getItem(this.storageKey);
    if (!v) return [];
    try { return JSON.parse(v) as Note[] } catch { return []; }
  }
}
