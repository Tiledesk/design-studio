// Interface per le note
export interface Note {
  note_id: string;
  x: number;
  y: number;
  text?: string;
  width?: number;
  height?: number;
  createdAt: Date;
}

