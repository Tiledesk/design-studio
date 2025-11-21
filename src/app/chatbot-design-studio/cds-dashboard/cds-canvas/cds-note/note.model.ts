
import { v4 as uuidv4 } from 'uuid';
export interface Note {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    type: 'text' | 'image' | 'video';
    content: string; // testo oppure url immagine/video
    fontSize?: number;
    color?: string;
    scale?: number;
  }

export class NoteModel implements Note {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type: 'text' | 'image' | 'video';
  content: string;
  fontSize?: number;
  color?: string;
  scale?: number;

  constructor(text?: string) {
    this.id = uuidv4();
    this.x = 0;
    this.y = 0;
    this.width = 100;
    this.height = 100;
    this.rotation = 0;
    this.type = 'text';
    this.content = text || '';
    this.fontSize = 16;
    this.color = '#000000';
    this.scale = 1;
  }
}
