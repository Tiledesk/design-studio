import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, SimpleChange, SimpleChanges } from '@angular/core';
import { DomSanitizer} from '@angular/platform-browser';
import { Metadata } from 'src/app/models/action-model';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { UploadService } from 'src/chat21-core/providers/abstract/upload.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { UserModel } from 'src/chat21-core/models/user';
import { UploadModel } from 'src/chat21-core/models/upload';
import { checkAcceptedFile } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-audio-upload',
  templateUrl: './audio-upload.component.html',
  styleUrls: ['./audio-upload.component.scss']
})
export class CDSAudioUploadComponent implements OnInit {
  
  @ViewChild('audioInput', { static: false }) myIdentifier: ElementRef;
  
  @Input() metadata: Metadata;
  @Output() onChangeMetadata = new EventEmitter<Metadata>();
  @Output() onDeletedMetadata = new EventEmitter<any>();

  isHovering: boolean = false;
  dropEvent: any;
  existAnAttacment: boolean = false;
  isImageSvg = false;
  private user: UserModel

  uuid: string = uuidv4()
  
  selectedFiles: FileList;
  isFilePendingToUpload: Boolean = false;
  optionSelected: 'upload' | 'link' = 'upload'
  textTag: string = '';
  arrayFilesLoad: Array<any> = [];

  private logger: LoggerService = LoggerInstance.getInstance()
  
  constructor(
    private uploadService: UploadService,
    private tiledeskAuthService: TiledeskAuthService,
    private sanitizer: DomSanitizer,
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.initializeApp();
    this.user = this.tiledeskAuthService.getCurrentUser();
  }

  initializeApp(){
    try {
      if(this.metadata.src && !this.metadata.src.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g)) ){
        this.optionSelected = 'upload';
        this.isImageSvg = this.imageUrlIsSvgFormat(this.metadata.src);
        // this.setImageSize(this.metadata.src);
      }else if(this.metadata.src && this.metadata.src.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g))){
        this.textTag = this.metadata.src.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g))[0]
        this.optionSelected = 'link'
      }
    } catch (error) {
      // this.logger.log("error: ", error);
    }
  }

  onChangeTextarea(text: string){
    this.logger.log('onChangeTextarea eventtttt', text)
    this.metadata.src = text
    this.optionSelected = 'link'
    if(text && text.match(new RegExp(/{{[^{}]*}}/g))){
      this.metadata = {
        name: text,
        src: text,
        downloadURL: text,
        type: 'image/jpg'
      }
    }
  }

  onBlur(event){
    this.logger.log('eventtttt', event)
    // this.isFilePendingToUpload = true
    this.createFile(this.metadata.src);
    this.onChangeMetadata.emit(this.metadata)
  }


  onClearSelectedAttribute(){
    this.optionSelected = 'upload'
    this.metadata = {
      name: '',
      src: '',
      downloadURL: ''
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

  sanitizerUrl(){
    return this.sanitizer.bypassSecurityTrustUrl(this.metadata.src);
  }

  // CUSTOM FUNCTIONS //
  // selectFile(event: any): void {
  //   try {
  //     let selectedFiles = event.target.files[0];

  //     if (selectedFiles) {
  //       this.uploadAttachment(selectedFiles);
  //     }
  //   } catch (error) {
  //     this.logger.log("error: ", error);
  //   }
  // }


  detectFiles(event: any){
    this.logger.debug('[IMAGE-UPLOAD] detectFiles: ', event);

    if (event) {
      this.selectedFiles = event.target.files;
      this.logger.debug('[IMAGE-UPLOAD] AppComponent:detectFiles::selectedFiles', this.selectedFiles);
      // this.onAttachmentButtonClicked.emit(this.selectedFiles)
      if (this.selectedFiles == null) {
        this.isFilePendingToUpload = false;
      } else {
        this.isFilePendingToUpload = true;
      }
      this.logger.debug('[IMAGE-UPLOAD] AppComponent:detectFiles::selectedFiles::isFilePendingToUpload', this.isFilePendingToUpload);
      this.logger.debug('[IMAGE-UPLOAD] fileChange: ', event.target.files);
      if (event.target.files.length <= 0) {
        this.isFilePendingToUpload = false;
      } else {
        this.isFilePendingToUpload = true;
      }
      
      const that = this;
      if (event.target.files && event.target.files[0]) {

        const canUploadFile = checkAcceptedFile(event.target.files[0].type, '.wav')
        if(!canUploadFile){
          this.logger.error('[IMAGE-UPLOAD] detectFiles: can not upload current file type--> NOT ALLOWED', '.wav', event.target.files[0].type)
          this.isFilePendingToUpload = false;
          return;
        }

        const nameFile = event.target.files[0].name;
        const typeFile = event.target.files[0].type;
        const size = event.target.files[0].size
        const reader = new FileReader();
        that.logger.debug('[AUDIO-UPLOAD] OK preload: ', nameFile, typeFile, reader);
        reader.addEventListener('load', function () {
          that.logger.debug('[AUDIO-UPLOAD] addEventListener load', reader.result);
          // that.isFileSelected = true;
          // se inizia con image
          if (typeFile.startsWith('image') && !typeFile.includes('svg')) {
            const imageXLoad = new Image;
            that.logger.debug('[AUDIO-UPLOAD] onload ', imageXLoad);
            imageXLoad.src = reader.result.toString();
            imageXLoad.title = nameFile;
            imageXLoad.onload = function () {
              that.logger.debug('[AUDIO-UPLOAD] onload image');
              // that.arrayFilesLoad.push(imageXLoad);
              const uid = (new Date().getTime()).toString(36); // imageXLoad.src.substring(imageXLoad.src.length - 16);
              that.arrayFilesLoad[0] = { uid: uid, file: imageXLoad, type: typeFile, size: size };
              that.logger.debug('[AUDIO-UPLOAD] OK: ', that.arrayFilesLoad[0]);
              // SEND MESSAGE
              that.loadFile();
            };
          } else {
            that.logger.debug('[AUDIO-UPLOAD] onload file');
            const fileXLoad = {
              src: reader.result.toString(),
              title: nameFile
            };
            // that.arrayFilesLoad.push(imageXLoad);
            const uid = (new Date().getTime()).toString(36); // imageXLoad.src.substring(imageXLoad.src.length - 16);
            that.arrayFilesLoad[0] = { uid: uid, file: fileXLoad, type: typeFile, size: size };
            that.logger.debug('[AUDIO-UPLOAD] OK: ', that.arrayFilesLoad[0]);
            // SEND MESSAGE
            that.loadFile();
          }
        }, false);

        if (event.target.files[0]) {
          reader.readAsDataURL(event.target.files[0]);
          that.logger.debug('[AUDIO-UPLOAD] reader-result: ', event.target.files[0]);
        }
      }
    }
  }


  loadFile() {
    this.logger.debug('[AUDIO-UPLOAD] that.fileXLoad: ', this.arrayFilesLoad);
    // at the moment I only manage the upload of one image at a time
    if (this.arrayFilesLoad[0] && this.arrayFilesLoad[0].file) {
      const fileXLoad = this.arrayFilesLoad[0].file;
      const uid = this.arrayFilesLoad[0].uid;
      const type = this.arrayFilesLoad[0].type;
      const size = this.arrayFilesLoad[0].size
      this.logger.debug('[AUDIO-UPLOAD] that.fileXLoad: ', type);
      let metadata;
      if (type.startsWith('image') && !type.includes('svg')) {
          metadata = {
              'name': fileXLoad.title,
              'src': fileXLoad.src,
              'width': fileXLoad.width,
              'height': fileXLoad.height,
              'type': type,
              'uid': uid,
              'size': size
          };
      } else {
          metadata = {
              'name': fileXLoad.title,
              'src': fileXLoad.src,
              'type': type,
              'uid': uid,
              'size': size
          };
      }
      this.logger.debug('[AUDIO-UPLOAD] metadata -------> ', metadata);
      // this.scrollToBottom();
      // 1 - aggiungo messaggio localmente
      // this.addLocalMessageImage(metadata);
      // 2 - carico immagine
      const file = this.selectedFiles.item(0);
      this.uploadSingle(metadata, file, '') //GABBBBBBBB
      // this.uploadSingle(metadata, file); 
      // this.isSelected = false;
    }
  }

  uploadSingle(metadata, file, messageText?: string) {
    const that = this;
    // const send_order_btn = <HTMLInputElement>document.getElementById('chat21-start-upload-doc');
    // send_order_btn.disabled = true;
    that.logger.debug('[AUDIO-UPLOAD] AppComponent::uploadSingle::', metadata, file);
    // const file = this.selectedFiles.item(0);
    const currentUpload = new UploadModel(file);
 
    this.uploadService.upload(this.user.uid, currentUpload).then(data => {
      that.logger.debug(`[AUDIO-UPLOAD] Successfully uploaded file and got download link -`, data);

      metadata.src = data.src;
      metadata.downloadURL = data.downloadURL
      this.metadata = metadata
      this.onChangeMetadata.emit(this.metadata)
      that.isFilePendingToUpload = false;
      // return downloadURL;
    }).catch(error => {
      // Use to signal error if something goes wrong.
      that.logger.error(`[AUDIO-UPLOAD] uploadSingle:: Failed to upload file and get link - ${error}`);
      that.isFilePendingToUpload = false;
    });
    that.logger.debug('[AUDIO-UPLOAD] reader-result: ', file);
  }


  // private uploadAttachment(uploadedFiles){
  //   if ((uploadedFiles.type.startsWith('image') || uploadedFiles.type.includes('gif')) && uploadedFiles.type.includes('svg')) {
  //     this.isImageSvg = true;
  //   } else if ((uploadedFiles.type.startsWith('image') || uploadedFiles.type.includes('gif')) && !uploadedFiles.type.includes('svg')) {
  //     this.isImageSvg = false;
  //   }
  //   this.uploadService.upload(this.user.uid, uploadedFiles).then(downloadURL => {
  //     if (downloadURL) {
  //       this.existAnAttacment = true
  //       uploadedFiles['downloadURL'] = downloadURL;
  //     }
  //     this.metadata.src = downloadURL;
  //     this.existAnAttacment = true
  //     this.setImageSize(uploadedFiles);
  //     // this.logger.log(`[WS-REQUESTS-MSGS] - upload native metadata `, this.metadata);
  //     // this.fileUpload.nativeElement.value = '';
  //   }).catch(error => {
  //     this.logger.log("[IMAGE-UPLOAD] error", error);
  //     // this.logger.error(`[WS-REQUESTS-MSGS] - upload native Failed to upload file and get link `, error);
  //   });
  // }

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
    this.logger.log('eventtt', e)
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
    let event:any = { target: { files: dataFiles} }
    try {
      if (event) {
        this.detectFiles(event);
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


  onDeletePathElement(event){
    this.logger.log('[AUDIO-UPLOAD] onDeletePathElement', event)
    this.uploadService.delete(this.user.uid, this.metadata.src).then((result)=>{
      
      this.isFilePendingToUpload = false;
      this.onDeletedMetadata.emit();
    }).catch((error)=> {
      this.logger.error('[CDS-CHATBOT-DTLS] BOT PROFILE IMAGE (FAQ-COMP) deleteUserProfileImage ERORR:', error)
      this.isFilePendingToUpload = false;
    }) 

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
      const canUploadFile = checkAcceptedFile(mimeType, '.wav')
      if(!canUploadFile){
        this.presentToastOnlyImageFilesAreAllowedToDrag()
        this.logger.error('[IMAGE-UPLOAD] detectFiles: can not upload current file type--> NOT ALLOWED', '.wav', mimeType)
        return;
      }
      this.handleDropEvent(ev);
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
    ev.preventDefault();
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
    let accept_files_array = ['wav'];
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
    // this.logger.log('[CONVS-DETAIL] > checkAcceptedFile - fileUploadAccept: ',this.appConfigService.getConfig().fileUploadAccept)
    //this.appConfigService.getConfig().fileUploadAccept
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

  async createFile(url){
    const that = this
    let filename = url.substring(url.lastIndexOf('/')+1);
    let response = await fetch(url);
    let data = await response.blob();
    const dT = new DataTransfer();
    dT.items.add(new File([data], filename, { type: 'image/jpeg' }));
    this.selectedFiles = dT.files;
    const imageXLoad = new Image;
    this.logger.debug('[AUDIO-UPLOAD] onload ', imageXLoad);
    imageXLoad.src = url
    imageXLoad.title = filename;
    imageXLoad.onload = function () {
      that.logger.debug('[AUDIO-UPLOAD] onload image', imageXLoad);
      // that.arrayFilesLoad.push(imageXLoad);
      const uid = (new Date().getTime()).toString(36); // imageXLoad.src.substring(imageXLoad.src.length - 16);
      that.arrayFilesLoad[0] = { uid: uid, file: imageXLoad, type: 'image/jpeg', size: dT.files.item(0).size };
      that.logger.debug('[AUDIO-UPLOAD] OK: ', that.arrayFilesLoad[0]);
      // SEND MESSAGE
      that.loadFile();
    };
    imageXLoad.onerror = function(error) {
      that.logger.error('[AUDIO-UPLOAD] onerror image', error);
      setTimeout(()=> {
        that.isFilePendingToUpload = false
      }, 2000)
    }

  }
}
// END ALL //
