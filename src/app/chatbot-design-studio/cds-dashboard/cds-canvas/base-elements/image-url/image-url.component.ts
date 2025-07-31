import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Metadata } from 'src/app/models/action-model';

@Component({
  selector: 'cds-image-url',
  templateUrl: './image-url.component.html',
  styleUrls: ['./image-url.component.scss']
})
export class CDSImageUrlComponent {
  @Input() metadata: Metadata;
  @Output() onChangeMetadata = new EventEmitter<Metadata>();
  @Output() onDeletedMetadata = new EventEmitter<any>();

  constructor(private sanitizer: DomSanitizer) {}

  onChangeUrl(url: string) {
    this.metadata.src = url;
    // this.onChangeMetadata.emit(this.metadata);
  }

  onBlurUrl(url: string){
    this.metadata.src = url;
    this.onChangeMetadata.emit(this.metadata);
  }

  sanitizerUrl() {
    return this.sanitizer.bypassSecurityTrustUrl(this.metadata.src);
  }
} 