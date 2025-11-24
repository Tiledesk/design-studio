import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { Note } from '../cds-canvas.component';

@Component({
  selector: 'cds-notes',
  templateUrl: './cds-notes.component.html',
  styleUrls: ['./cds-notes.component.scss']
})
export class CdsNotesComponent implements OnInit, AfterViewInit {
  @Input() note: Note;
  @ViewChild('noteInput', { static: false }) noteInput: ElementRef<HTMLTextAreaElement>;
  @ViewChild('contentElement', { static: false }) contentElement: ElementRef<HTMLDivElement>;
  
  // Riferimento al container (ottenuto tramite parentElement)
  private get container(): HTMLElement | null {
    return this.contentElement?.nativeElement?.closest('.container') as HTMLElement || null;
  }

  selected = false;
  text_disabled: boolean = false;
  
  // Variabili per il ridimensionamento
  private isResizing = false;
  private resizeHandle: string = '';
  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private startLeft = 0;
  private startTop = 0;
  
  constructor() { }

  ngOnInit(): void {
    
  }

  ngAfterViewInit(): void {


    // Se la nota è appena stata creata, calcola anche la larghezza per correggere la posizione
    // const isNewNote = !this.note?.text;
    // if (isNewNote) {
    //     // this.autoResizeWidth();
    //     this.note.x = this.note.x - 80;
    //     this.note.y = this.note.y - 20;
    // }

    // Imposta il focus e auto-resize iniziale
    if (this.noteInput) {
      setTimeout(() => {
        this.noteInput.nativeElement.focus();
        // if (!this.note?.text || this.note.text === 'Type something') {
        //   this.noteInput.nativeElement.select();
        // }
        // this.autoResize();
      }, 0);
    }
  }

  onInputChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (this.note) {
      this.note.text = textarea.value;
    }
    this.autoResize();
  }

  private autoResize(): void {
    if (this.noteInput) {
      const textarea = this.noteInput.nativeElement;
      // Reset height per calcolare correttamente scrollHeight
      textarea.style.height = 'auto';
      // Imposta l'altezza basata sul contenuto, rispettando min e max
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + 'px';
      
      // Auto-resize width
      // this.autoResizeWidth();
    }
  }

  onBlurTextarea(event: FocusEvent): void {
    this.text_disabled = true;
    console.log('onBlurTextarea', event);
    this.selected = false;
  }

  onSingleClick(event: MouseEvent): void {
    event.stopPropagation();
    console.log('onSingleClick');
    this.noteInput.nativeElement.blur();
    this.selected = true;
  }

  onDoubleClick(event: MouseEvent): void {
    // Previeni la propagazione dell'evento per evitare conflitti
    event.stopPropagation();
    console.log('onDoubleClick');
    this.text_disabled = false;
    setTimeout(() => {
        this.noteInput.nativeElement.focus();
      }, 100);
  }

  startResize(event: MouseEvent, handle: string): void {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.contentElement) return;
    
    this.isResizing = true;
    this.resizeHandle = handle;
    
    const rect = this.contentElement.nativeElement.getBoundingClientRect();
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startWidth = rect.width;
    this.startHeight = rect.height;
    
    // Ottieni la posizione iniziale del container (nota)
    const container = this.container;
    if (container) {
      // Usa le coordinate della nota invece di getBoundingClientRect per evitare problemi con lo scroll
      this.startLeft = this.note?.x || 0;
      this.startTop = this.note?.y || 0;
    } else {
      this.startLeft = rect.left;
      this.startTop = rect.top;
    }
    
    // Previeni la selezione del testo durante il drag
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing || !this.contentElement) return;
    
    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;
    
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    let newLeft = this.startLeft;
    let newTop = this.startTop;
    
    const minWidth = 50;
    const minHeight = 20;
    const aspectRatio = this.startWidth / this.startHeight;
    
    switch (this.resizeHandle) {
      case 'tl': // Top-left: ridimensionamento proporzionale
        {
          const scale = Math.min(
            (this.startWidth - deltaX) / this.startWidth,
            (this.startHeight - deltaY) / this.startHeight
          );
          newWidth = Math.max(minWidth, this.startWidth * scale);
          newHeight = Math.max(minHeight, this.startHeight * scale);
          newLeft = this.startLeft + (this.startWidth - newWidth);
          newTop = this.startTop + (this.startHeight - newHeight);
        }
        break;
        
      case 'tr': // Top-right: ridimensionamento proporzionale
        {
          const scale = Math.min(
            (this.startWidth + deltaX) / this.startWidth,
            (this.startHeight - deltaY) / this.startHeight
          );
          newWidth = Math.max(minWidth, this.startWidth * scale);
          newHeight = Math.max(minHeight, this.startHeight * scale);
          newTop = this.startTop + (this.startHeight - newHeight);
        }
        break;
        
      case 'bl': // Bottom-left: ridimensionamento proporzionale
        {
          const scale = Math.min(
            (this.startWidth - deltaX) / this.startWidth,
            (this.startHeight + deltaY) / this.startHeight
          );
          newWidth = Math.max(minWidth, this.startWidth * scale);
          newHeight = Math.max(minHeight, this.startHeight * scale);
          newLeft = this.startLeft + (this.startWidth - newWidth);
        }
        break;
        
      case 'br': // Bottom-right: ridimensionamento proporzionale
        {
          const scale = Math.min(
            (this.startWidth + deltaX) / this.startWidth,
            (this.startHeight + deltaY) / this.startHeight
          );
          newWidth = Math.max(minWidth, this.startWidth * scale);
          newHeight = Math.max(minHeight, this.startHeight * scale);
        }
        break;
        
      case 'left': // Lato sinistro: solo larghezza
        newWidth = Math.max(minWidth, this.startWidth - deltaX);
        newLeft = this.startLeft + (this.startWidth - newWidth);
        break;
        
      case 'right': // Lato destro: solo larghezza
        newWidth = Math.max(minWidth, this.startWidth + deltaX);
        break;
    }
    
    // Applica le nuove dimensioni
    this.contentElement.nativeElement.style.width = newWidth + 'px';
    this.contentElement.nativeElement.style.height = newHeight + 'px';
    
    // Aggiorna la posizione del container se necessario
    const container = this.container;
    
    if (container && this.note) {
      // Calcola la differenza di posizione in pixel
      const deltaLeft = newLeft - this.startLeft;
      const deltaTop = newTop - this.startTop;
      
      // Aggiorna la posizione della nota se si ridimensiona da sinistra o dall'alto
      if (this.resizeHandle.includes('l')) {
        this.note.x = this.startLeft + deltaLeft;
        container.style.left = this.note.x + 'px';
      }
      if (this.resizeHandle.includes('t')) {
        this.note.y = this.startTop + deltaTop;
        container.style.top = this.note.y + 'px';
      }
    }
    
    // Aggiorna le dimensioni della textarea (sottrai padding: 10px top/bottom, 8px left/right)
    if (this.noteInput) {
      this.noteInput.nativeElement.style.width = (newWidth - 16) + 'px';
      this.noteInput.nativeElement.style.height = (newHeight - 20) + 'px';
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeHandle = '';
    }
  }
//   private autoResizeWidth(): void {
//     if (this.noteInput) {
//       const textarea = this.noteInput.nativeElement;
//       // Reset width per calcolare correttamente
//       textarea.style.width = 'auto';
      
//       // Crea un elemento temporaneo per misurare la larghezza del testo
//       const measureElement = document.createElement('span');
//       const styles = window.getComputedStyle(textarea);
      
//       // Copia gli stili rilevanti per la misurazione
//       measureElement.style.visibility = 'hidden';
//       measureElement.style.position = 'absolute';
//       measureElement.style.whiteSpace = 'pre-wrap';
//       measureElement.style.wordWrap = 'break-word';
//       measureElement.style.font = styles.font;
//       measureElement.style.fontSize = styles.fontSize;
//       measureElement.style.fontFamily = styles.fontFamily;
//       measureElement.style.fontWeight = styles.fontWeight;
//       measureElement.style.lineHeight = styles.lineHeight;
//       measureElement.style.padding = styles.padding;
//       measureElement.style.border = styles.border;
//       measureElement.style.boxSizing = styles.boxSizing;
      
//       // Imposta il contenuto (considera anche il valore di default)
//       const text = textarea.value || 'Type something';
//       measureElement.textContent = text;
      
//       // Aggiungi al DOM temporaneamente
//       document.body.appendChild(measureElement);
      
//       // Calcola la larghezza necessaria
//       // Per una textarea, dobbiamo considerare la larghezza della riga più lunga
//       const lines = text.split('\n');
//       let maxWidth = 0;
      
//       lines.forEach(line => {
//         measureElement.textContent = line || ' '; // Usa spazio se la riga è vuota
//         const width = measureElement.offsetWidth;
//         if (width > maxWidth) {
//           maxWidth = width;
//         }
//       });
      
//       // Rimuovi l'elemento temporaneo
//       document.body.removeChild(measureElement);
      
//       // Imposta la larghezza con un minimo di 50px
//       const minWidth = 50;
//       textarea.style.width = Math.max(maxWidth, minWidth) + 'px';
//     }
//   }

}

