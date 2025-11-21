import { Component, OnInit, ViewChild, ChangeDetectorRef, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Note } from '../note.model';
import { NotesService } from '../notes.service';
import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';

@Component({
  selector: 'cds-stage-notes',
  templateUrl: './stage-notes.component.html',
  styleUrls: ['./stage-notes.component.scss']
})
export class StageNotesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('stageContainer', { static: false }) stageContainer!: ElementRef<HTMLDivElement>;

  private stage: Konva.Stage | null = null;
  private layer: Konva.Layer | null = null;
  private noteGroups: Map<string, Konva.Group> = new Map();

  notes: Note[] = [];
  selectedId: string | null = null;
  imageCache: Map<string, HTMLImageElement> = new Map();

  // immagine di esempio: usa il file caricato
  sampleImage = 'https://via.placeholder.com/240x160';

  constructor(
    private notesService: NotesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.notes = this.notesService.load();
    // se vuoto, aggiungi qualche nota demo
    if (this.notes.length === 0) {
      this.notes = [
        {
          id: uuidv4(),
          x: 200, y: 200,
          width: 180, height: 60,
          rotation: 0,
          type: 'text',
          content: 'Doppio click per modificare',
          fontSize: 16,
          color: '#222',
          scale: 1
        },
        {
          id: uuidv4(),
          x: 420, y: 260,
          width: 260, height: 180,
          rotation: 0,
          type: 'image',
          content: this.sampleImage,
          scale: 1
        }
      ];
    }
    // Carica tutte le immagini
    this.loadAllImages();
  }

  ngAfterViewInit() {
    if (this.stageContainer) {
      this.initStage();
      this.renderNotes();
    }
  }

  ngOnDestroy() {
    if (this.stage) {
      this.stage.destroy();
    }
  }

  /**
   * Inizializza lo stage Konva
   */
  initStage() {
    const width = window.innerWidth - 300;
    const height = window.innerHeight - 100;

    this.stage = new Konva.Stage({
      container: this.stageContainer.nativeElement,
      width: width,
      height: height,
      draggable: true
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  }

  /**
   * Renderizza tutte le note sullo stage
   */
  async renderNotes() {
    if (!this.layer) return;

    // Rimuovi tutte le note esistenti
    this.noteGroups.forEach(group => group.destroy());
    this.noteGroups.clear();
    this.layer.destroyChildren();

    // Renderizza ogni nota
    for (const note of this.notes) {
      await this.renderNote(note);
    }

    this.layer.draw();
  }

  /**
   * Renderizza una singola nota
   */
  async renderNote(note: Note) {
    if (!this.layer) return;

    const group = new Konva.Group({
      x: note.x,
      y: note.y,
      rotation: note.rotation,
      draggable: true,
      id: note.id
    });

    if (note.type === 'text') {
      // Background
      const rect = new Konva.Rect({
        width: note.width,
        height: note.height,
        fill: '#fdfd8b',
        cornerRadius: 6
      });
      group.add(rect);

      // Text
      const text = new Konva.Text({
        text: note.content,
        fontSize: note.fontSize || 16,
        width: note.width - 10,
        padding: 6,
        fill: note.color || '#000',
        x: 5,
        y: 5
      });
      group.add(text);

      // Event handlers
      group.on('dragend', () => {
        this.updateNoteTransform(note.id, {
          x: group.x(),
          y: group.y()
        });
      });

      group.on('click', () => {
        this.selectNote(note.id);
      });

      group.on('dblclick', () => {
        this.selectNote(note.id);
      });

    } else if (note.type === 'image') {
      const img = this.getImageElement(note.content);
      if (img) {
        // Background
        const rect = new Konva.Rect({
          width: note.width,
          height: note.height,
          fill: '#fff',
          cornerRadius: 6,
          stroke: '#ccc',
          strokeWidth: 1
        });
        group.add(rect);

        // Image
        const konvaImage = new Konva.Image({
          x: 0,
          y: 0,
          width: note.width,
          height: note.height,
          image: img
        });
        group.add(konvaImage);

        // Event handlers
        group.on('dragend', () => {
          this.updateNoteTransform(note.id, {
            x: group.x(),
            y: group.y()
          });
        });

        group.on('click', () => {
          this.selectNote(note.id);
        });
      }
    }

    this.noteGroups.set(note.id, group);
    this.layer.add(group);
  }

  /**
   * Carica un'immagine da URL e la converte in HTMLImageElement
   */
  loadImage(url: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(url)) {
      return Promise.resolve(this.imageCache.get(url)!);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Carica tutte le immagini delle note
   */
  async loadAllImages() {
    const imageNotes = this.notes.filter(n => n.type === 'image' && typeof n.content === 'string');
    for (const note of imageNotes) {
      try {
        await this.loadImage(note.content);
      } catch (error) {
        console.error('Errore nel caricamento immagine:', note.content, error);
      }
    }
    this.cdr.detectChanges();
  }

  /**
   * Ottiene l'HTMLImageElement per una nota immagine
   */
  getImageElement(url: string): HTMLImageElement | null {
    return this.imageCache.get(url) || null;
  }

  addTextNote() {
    this.notes.push({
      id: uuidv4(),
      x: 100, y: 100,
      width: 200, height: 80,
      rotation: 0,
      type: 'text',
      content: 'Nuova nota',
      fontSize: 16,
      color: '#000',
      scale: 1
    });
    this.save();
    this.renderNotes();
  }

  addImageNote(url?: string) {
    const newNote: Note = {
      id: uuidv4(),
      x: 150, y: 150,
      width: 240, height: 160,
      rotation: 0,
      type: 'image',
      content: url || this.sampleImage,
      scale: 1
    };
    this.notes.push(newNote);
    this.save();
    if (url || this.sampleImage) {
      this.loadImage(newNote.content).then(() => {
        this.renderNotes();
      });
    } else {
      this.renderNotes();
    }
  }

  removeNote(id: string) {
    this.notes = this.notes.filter(n => n.id !== id);
    const group = this.noteGroups.get(id);
    if (group) {
      group.destroy();
      this.noteGroups.delete(id);
      if (this.layer) {
        this.layer.draw();
      }
    }
    this.save();
  }

  selectNote(id: string) {
    this.selectedId = id;
  }

  updateNoteTransform(id: string, data: Partial<Note>) {
    const n = this.notes.find(x => x.id === id);
    if (!n) return;
    Object.assign(n, data);
    this.save();
    
    // Aggiorna anche il gruppo Konva
    const group = this.noteGroups.get(id);
    if (group && data.x !== undefined && data.y !== undefined) {
      group.position({ x: data.x, y: data.y });
      if (this.layer) {
        this.layer.draw();
      }
    }
  }


  save() {
    this.notesService.save(this.notes);
  }

  clearAll() {
    this.notes = [];
    this.noteGroups.forEach(group => group.destroy());
    this.noteGroups.clear();
    if (this.layer) {
      this.layer.destroyChildren();
      this.layer.draw();
    }
    this.save();
  }
}
