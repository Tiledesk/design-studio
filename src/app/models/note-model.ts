import { v4 as uuidv4 } from 'uuid';
import { INTENT_COLORS } from 'src/app/chatbot-design-studio/utils';

export class Note {
  id_faq_kb?: string;
  note_id: string;
  x: number;
  y: number;
  text?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  createdAt: Date;
  isNew?: boolean;
  
  // Text formatting properties
  fontFamily?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textColor?: string;
  textOpacity?: number;
  backgroundOpacity?: number;
  isLink?: boolean;
  linkUrl?: string;

  constructor(id_faq_kb: string, pos: any) {
    this.id_faq_kb = id_faq_kb;
    this.note_id = uuidv4();
    this.x = pos.x;
    this.y = pos.y;
    this.text = 'Type something';
    this.width = 220;
    this.height = 50;
    this.createdAt = new Date();
    this.backgroundColor = INTENT_COLORS.COLOR1;
    this.isNew = true; // Indica che la nota è appena stata creata
    
    // Default formatting values
    this.fontFamily = 'Open Sans';
    this.fontSize = 14;
    this.textAlign = 'left';
    this.fontStyle = 'normal';
    this.textDecoration = 'none';
    this.textColor = '#000000';
    this.textOpacity = 100;
    this.backgroundOpacity = 100;
    this.isLink = false;
    this.linkUrl = '';
  }
}

