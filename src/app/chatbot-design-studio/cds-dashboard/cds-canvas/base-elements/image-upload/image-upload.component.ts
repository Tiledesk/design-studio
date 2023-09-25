import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, SimpleChange, SimpleChanges } from '@angular/core';
import { UploadImageNativeService } from 'app/services/upload-image-native.service';
import { DomSanitizer} from '@angular/platform-browser';
import { LoggerService } from 'app/services/logger/logger.service';
import { Metadata } from 'app/models/intent-model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'cds-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss']
})
export class CDSImageUploadComponent implements OnInit {
  
  @ViewChild('imageUploaded', { static: false }) myIdentifier: ElementRef;
  
  @Input() metadata: Metadata;
  @Output() onChangeMetadata = new EventEmitter<Metadata>();

  isHovering: boolean = false;
  dropEvent: any;
  existAnAttacment: boolean = false;
  isImageSvg = false;

  uuid: string = uuidv4()
  
  constructor(
    private uploadImageNativeService: UploadImageNativeService,
    private sanitizer: DomSanitizer,
    private logger: LoggerService,
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.initializeApp();
  }

  initializeApp(){
    try {
      if(this.metadata.src){
        this.isImageSvg = this.imageUrlIsSvgFormat(this.metadata.src);
        // this.setImageSize(this.metadata.src);
      }
    } catch (error) {
      // this.logger.log("error: ", error);
    }
  }


  private imageUrlIsSvgFormat(url){
    try {
      if(url.endsWith(".svg")){
        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.logger.log("error: ", error);
      return true;
    }
  }

  sanitizerUrlImage(){
    return this.sanitizer.bypassSecurityTrustUrl(this.metadata.src);
  }

  // CUSTOM FUNCTIONS //
  selectFile(event: any): void {
    try {
      let selectedFiles = event.target.files[0];
      if (selectedFiles) {
        this.uploadAttachment_Native(selectedFiles);
      }
    } catch (error) {
      this.logger.log("error: ", error);
    }
  }


  private uploadAttachment_Native(uploadedFiles){
    if ((uploadedFiles.type.startsWith('image') || uploadedFiles.type.includes('gif')) && uploadedFiles.type.includes('svg')) {
      this.isImageSvg = true;
    } else if ((uploadedFiles.type.startsWith('image') || uploadedFiles.type.includes('gif')) && !uploadedFiles.type.includes('svg')) {
      this.isImageSvg = false;
    }
    this.uploadImageNativeService.uploadAttachment_Native(uploadedFiles).then(downloadURL => {
      if (downloadURL) {
        this.existAnAttacment = true
        uploadedFiles['downloadURL'] = downloadURL;
      }
      this.metadata.src = downloadURL;
      this.existAnAttacment = true
      this.setImageSize(uploadedFiles);
      // this.logger.log(`[WS-REQUESTS-MSGS] - upload native metadata `, this.metadata);
      // this.fileUpload.nativeElement.value = '';
    }).catch(error => {
      this.logger.log("error", error);
      // this.logger.error(`[WS-REQUESTS-MSGS] - upload native Failed to upload file and get link `, error);
    });
  }

  // EVENT FUNCTIONS //

  /** */
  private setImageSize(uploadedFiles){
    let fileReader = new FileReader();
    fileReader.readAsDataURL(uploadedFiles)
    fileReader.onload = () => { // when file has loaded
      var img = new Image();
      img.src = fileReader.result.toString()
      img.onload = () => {
          this.logger.log('imageeee', img.width, img.height)
          this.metadata.width = img.width;
          this.metadata.height = img.height;
          this.metadata.name = uploadedFiles.name
          this.metadata.type = uploadedFiles.type
          this.onChangeMetadata.emit(this.metadata)
      };
    };
    // setTimeout(() => {
    //   try {
    //     var width = this.myIdentifier.nativeElement.offsetWidth;
    //     var height = this.myIdentifier.nativeElement.offsetHeight;
    //     this.myIdentifier.nativeElement.setAttribute("width", width);
    //     this.myIdentifier.nativeElement.setAttribute("height", height);
    //     // this.metadata.width = width;
    //     // this.metadata.height = height;
    //   } catch (error) {
    //     this.logger.log('myIdentifier:' + error);
    //   }
    // }, 0);
  }


  /** */
  readAsDataURL(e: any) {
    let dataFiles = " "
    if (e.type === 'change') {
      dataFiles = e.target.files;
    } else if (e.type === 'drop') {
      dataFiles = e.dataTransfer.files
    } else {
      dataFiles = e.files
    }
    // const attributes = { files: dataFiles, enableBackdropDismiss: false };
    // ---------------------------------------------------------------------
    // USE CASE IMAGE
    // ---------------------------------------------------------------------
    let file:any = dataFiles[0];
    try {
      if (file) {
        this.uploadAttachment_Native(file);
      }
    } catch (error) {
      this.logger.log("error: ", error);
    }
    // if (file.type.startsWith('image') && !file.type.includes('svg')) {
    //   const reader = new FileReader();
    //   let that = this;
    //   reader.onload = (e: any) => {
    //     this.logger.log("CARICATA IMMAGINE::: ", e.target);
    //     // this.metadata.src = e.target.result;
    //     var img = new Image();
    //     img.src = this.metadata.src;
    //     img.onload = function() {
    //         that.setImageSize();
    //     };
    //     img.onerror = function(e) {
    //         this.logger.log("ERROR ::: ", e);
    //     };
    //   }
    //   reader.readAsDataURL(file);
    //   // ---------------------------------------------------------------------
    //   // USE CASE SVG
    //   // ---------------------------------------------------------------------
    // } else if (file.type.startsWith('image') && file.type.includes('svg')) {
    //   const preview = document.querySelector('#img-preview') as HTMLImageElement
    //   const reader = new FileReader();
    //   const that = this;
    //   reader.addEventListener('load',function () {
    //       const img = reader.result.toString();
    //       this.logger.log('FIREBASE-UPLOAD USE CASE SVG LoaderPreviewPage readAsDataURL img ',img)
    //       // that.arrayFiles.push(that.sanitizer.bypassSecurityTrustResourceUrl(img))
    //       // if (!that.fileSelected) {
    //       //   that.fileSelected = that.sanitizer.bypassSecurityTrustResourceUrl(img)
    //       // }
    //   },false);

    //   if (file) {
    //     reader.readAsDataURL(file);
    //   }
    //   // ---------------------------------------------------------------------
    //   // USE CASE FILE
    //   // ---------------------------------------------------------------------
    // } else {
    //   this.logger.log('[LOADER-PREVIEW-PAGE] - readAsDataURL - USE CASE FILE - FILE ',file)
    //   this.logger.log('[LOADER-PREVIEW-PAGE] - readAsDataURL - USE CASE FILE - FILE TYPE',file.type)
    //   let file_extension =  file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length) || file.name
    //   this.logger.log('[LOADER-PREVIEW-PAGE] - readAsDataURL - USE CASE FILE - FILE EXTENSION', file_extension)
    //   let file_name = file.name
    //   this.logger.log( '[LOADER-PREVIEW-PAGE] - readAsDataURL - USE CASE FILE - FILE NAME', file_name)
    //   // this.createFile()
    // }
  }


  // -------------------------------------------------------------
  // DRAG FILE
  // -------------------------------------------------------------
  // DROP (WHEN THE FILE IS RELEASED ON THE DROP ZONE)
  drop(ev: any) {
    ev.preventDefault();
    ev.stopPropagation();
    const fileList = ev.dataTransfer.files
    this.isHovering = false
    if (fileList.length > 0) {
      const file: File = fileList[0];
      var mimeType = fileList[0].type;
      const isAccepted = this.checkAcceptedFile(mimeType);
      if (isAccepted === true) {
        this.handleDropEvent(ev);
      } else {
        this.presentToastOnlyImageFilesAreAllowedToDrag()
      }
    }
  }

  handleDropEvent(ev) {
    this.dropEvent = ev;
    this.readAsDataURL(ev);
  }

  // DRAG OVER (WHEN HOVER OVER ON THE "DROP ZONE")
  allowDrop(ev: any) {
    ev.preventDefault()
    ev.stopPropagation()
    this.isHovering = true
  }

  // DRAG LEAVE (WHEN LEAVE FROM THE DROP ZONE)
  drag(ev: any) {
    ev.preventDefault()
    ev.stopPropagation()
    this.isHovering = false
  }

  async presentToastOnlyImageFilesAreAllowedToDrag() {
    // const toast = await this.toastController.create({
    //   message: this.translationMap.get('FAILED_TO_UPLOAD_THE_FORMAT_IS_NOT_SUPPORTED'),
    //   duration: 5000,
    //   color: 'danger',
    //   cssClass: 'toast-custom-class',
    // })
    // toast.present()
  }


  checkAcceptedFile(draggedFileMimeType) {
    let isAcceptFile = false;
    let accept_files_array = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG', 'gif', 'webp'];
    try {
      const accept_file_segment = draggedFileMimeType.split('/');
      let fileType = accept_file_segment[1];
      accept_files_array.forEach((accept_file) => {
        // this.logger.log('checkAcceptedFile:', fileType, '--->', accept_file);
        if (fileType.endsWith(accept_file)) {
          isAcceptFile = true;
          return isAcceptFile;
        }
      });
    } catch (error) {
      return isAcceptFile; 
    }
    return isAcceptFile; 

    let accept_files = '*/*';
    // this.logger.log('[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept: ',this.appConfigProvider.getConfig().fileUploadAccept)
    //this.appConfigProvider.getConfig().fileUploadAccept
    // this.logger.log('[CONVS-DETAIL] > checkAcceptedFile - mimeType: ',draggedFileMimeType)
    if (accept_files === '*/*') {
      isAcceptFile = true
      return isAcceptFile
    } else if (accept_files !== '*/*') {
      // this.logger.log( '[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept typeof accept_files ',typeof accept_files)
      const accept_files_array = accept_files.split(',')
      // this.logger.log('[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept accept_files_array ',accept_files_array)
      // this.logger.log('[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept accept_files_array typeof: ',typeof accept_files_array)
      accept_files_array.forEach((accept_file) => {
        // this.logger.log('[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept accept_file ',accept_file)
        const accept_file_segment = accept_file.split('/')
        // this.logger.log('[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept accept_file_segment ',accept_file_segment)
        if (accept_file_segment[1] === '*') {
          if (draggedFileMimeType.startsWith(accept_file_segment[0])) {
            isAcceptFile = true
            // this.logger.log(
            //   '[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept isAcceptFile',
            //   isAcceptFile,
            // )
            return isAcceptFile
          } else {
            isAcceptFile = false
            // this.logger.log(
            //   '[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept isAcceptFile',
            //   isAcceptFile,
            // )
            return isAcceptFile
          }
        } else if (accept_file_segment[1] !== '*') {
          if (draggedFileMimeType === accept_file) {
            isAcceptFile = true
            // this.logger.log(
            //   '[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept isAcceptFile',
            //   isAcceptFile,
            // )
            return isAcceptFile
          }
        }
        return isAcceptFile
      })
      return isAcceptFile
    }
  }
}
// END ALL //
