import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter, Input, AfterViewInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser'
import { getEmbedUrl } from '../../../../utils';
import { Metadata } from 'src/app/models/action-model';
import { CDSTextareaComponent } from '../textarea/textarea.component';

@Component({
  selector: 'cds-element-from-url',
  templateUrl: './element-from-url.component.html',
  styleUrls: ['./element-from-url.component.scss']
})
export class CDSElementFromUrlComponent implements OnInit, AfterViewInit {
  @ViewChild('imageUploaded', { static: false }) myIdentifier: ElementRef;
  @ViewChild('pathTextarea', { static: false }) pathTextarea: CDSTextareaComponent;
  
  @Input() metadata: Metadata;
  @Input() previewMode: boolean = false;
  @Output() onChangeMetadata = new EventEmitter();
  @Output() onDeletedMetadata = new EventEmitter<any>();

  pathElement: string = '';
  pathElementUrl: any;
  widthElement: string = '100%';
  heightElement: string;

  constructor(
    private readonly sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    if(this.metadata.src && this.metadata.src != ''){
      // Inizializza pathElement con l'URL esistente (rimuovi il prefisso getEmbedUrl se presente)
      // getEmbedUrl potrebbe aggiungere prefissi, quindi estraiamo l'URL originale
      this.pathElement = this.metadata.src;
    }
  }

  ngAfterViewInit(): void {
    // Prevenire il ritorno a capo nella textarea
    setTimeout(() => {
      if (this.pathTextarea && this.pathTextarea['autosize']) {
        const textareaElement = this.pathTextarea['autosize']['_textareaElement'] as HTMLTextAreaElement;
        if (textareaElement) {
          textareaElement.addEventListener('keydown', (event: KeyboardEvent) => {
            // Prevenire il ritorno a capo quando si preme Invio
            if (event.key === 'Enter') {
              event.preventDefault();
            }
          });
        }
      }
    }, 0);
  }



  onCloseImagePanel(){
    // this.showAddImage = false;
  }

  onDeletePathElement(event){
    this.pathElement = ''
    this.onDeletedMetadata.emit()
  }

  sanitizerUrl(){
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.metadata.src);
  }

  /** onChangeTextarea */
  onChangeTextArea(text:string) {
    this.pathElement = text;
  }

  onBlur(event){
    // Leggi il valore direttamente dalla textarea per catturare anche i valori vuoti
    // che non vengono emessi dall'evento changeTextarea
    let currentValue = '';
    if (this.pathTextarea && this.pathTextarea['autosize']) {
      const textareaElement = this.pathTextarea['autosize']['_textareaElement'] as HTMLTextAreaElement;
      if (textareaElement) {
        currentValue = textareaElement.value || '';
        
        // Aggiorna pathElement con il valore corrente
        this.pathElement = currentValue;
      }
    }
    
    // Salva ogni volta che il testo perde il focus
    this.onLoadPathElement();
  }

  onLoadPathElement(){
    let url = this.pathElement ? this.pathElement.trim() : '';
    
    // Se l'URL è vuoto o contiene solo spazi, salva src = null
    if (!url || url.length === 0) {
      this.metadata.src = null;
      this.pathElement = '';
      this.onChangeMetadata.emit();
      return;
    }
    
    // Se l'URL non inizia con "http://" o "https://", aggiungi "http://"
    if (!url.toLowerCase().startsWith('http://') && !url.toLowerCase().startsWith('https://')) {
      url = 'http://' + url;
    }
    
    // Verifica che l'URL dopo "http://" o "https://" abbia almeno qualche carattere valido
    // Rimuovi il protocollo per verificare la lunghezza del dominio
    let urlWithoutProtocol = url.replace(/^https?:\/\//i, '').trim();
    if (!urlWithoutProtocol || urlWithoutProtocol.length === 0) {
      this.metadata.src = null;
      this.pathElement = '';
      this.onChangeMetadata.emit();
      return;
    }
    
    // Aggiorna pathElement con l'URL completo per mantenerlo sincronizzato
    this.pathElement = url;
    
    this.metadata.width = this.widthElement;
    this.metadata.height = this.heightElement;
    const embedUrl = getEmbedUrl(url);
    this.metadata.src = embedUrl;
    this.metadata.type = 'frame'
    this.onChangeMetadata.emit();
  }
}
