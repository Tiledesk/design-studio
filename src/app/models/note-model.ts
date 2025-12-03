import { v4 as uuidv4 } from 'uuid';
import { NOTE_COLORS } from 'src/app/chatbot-design-studio/utils';

export class Note {
  static readonly DEFAULT_WIDTH = 130;
  static readonly DEFAULT_HEIGHT = 42;
  static readonly DEFAULT_FONT_SIZE_EM = 0.96;
  
  id_faq_kb?: string;
  note_id: string;
  x: number;
  y: number;
  text?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  createdAt: Date;
  isNew?: boolean;
  
  backgroundOpacity?: number;
  borderOpacity?: number;
  boxShadow?: boolean;
  fontSize?: string; // Dimensione del font in pixel
  fontFamily?: string; // Famiglia del font

  constructor(id_faq_kb: string, pos: any) {
    this.id_faq_kb = id_faq_kb;
    this.note_id = uuidv4();
    this.x = pos.x;
    this.y = pos.y;
    this.text = 'Type something';
    this.width = Note.DEFAULT_WIDTH;
    this.height = Note.DEFAULT_HEIGHT;
    this.createdAt = new Date();
    this.backgroundColor = 'rgba('+NOTE_COLORS.BACKGROUND_COLOR+', 1)'; // Colore di default
    this.borderColor = 'rgba('+NOTE_COLORS.BORDER_COLOR+', 1)'; // Colore di default
    this.isNew = true; // Indica che la nota è appena stata creata
    this.backgroundOpacity = 100;
    this.borderOpacity = 100;
    this.boxShadow = true; // Default: ombra attiva
    this.fontSize =  Note.DEFAULT_FONT_SIZE_EM + 'em'; // Dimensione del font di default
    this.fontFamily = 'Open Sans, sans-serif'; // Famiglia del font di default
  }
}

