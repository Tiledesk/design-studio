import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser'
import { getEmbedUrl } from '../../../../utils';
import { Metadata } from 'src/app/models/action-model';

@Component({
  selector: 'cds-element-from-url',
  templateUrl: './element-from-url.component.html',
  styleUrls: ['./element-from-url.component.scss']
})
export class CDSElementFromUrlComponent implements OnInit {
  @ViewChild('imageUploaded', { static: false }) myIdentifier: ElementRef;
  
  @Input() metadata: Metadata;
  @Output() onChangeMetadata = new EventEmitter();
  @Output() onDeletedMetadata = new EventEmitter<any>();

  // showAddImage = false;
  pathElement: string;
  pathElementUrl: any;
  widthElement: string = '100%';
  heightElement: string;

  constructor(
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    if(this.metadata.src == ''){
      // this.showAddImage = true;
    }
    // this.pathElement = "https://www.youtube.com/embed/tgbNymZ7vqY?autoplay=1&mute=0";
    // this.sanitizer.bypassSecurityTrustResourceUrl(this.pathElement);
  }


  // private setElementSize(){
  //   setTimeout(() => {
  //     try {
  //       var width = this.myIdentifier.nativeElement.offsetWidth;
  //       var height = this.myIdentifier.nativeElement.offsetHeight;
  //       this.myIdentifier.nativeElement.setAttribute("width", width);
  //       this.myIdentifier.nativeElement.setAttribute("height", height);
  //       // this.metadata.src = this.previewImage;
  //       // this.metadata.width = width;
  //       // this.metadata.height = height;
  //     } catch (error) {
  //       console.log('myIdentifier:' + error);
  //     }
  //   }, 0);
  // }

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
  }

  onLoadPathElement(){
    this.metadata.width = this.widthElement;
    this.metadata.height = this.heightElement;
    this.metadata.src = getEmbedUrl(this.pathElement);
    this.metadata.type = 'frame'
    this.onChangeMetadata.emit();
  }
}
