import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UploadModel } from 'src/chat21-core/models/upload';
import { UserModel } from 'src/chat21-core/models/user';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { UploadService } from 'src/chat21-core/providers/abstract/upload.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';

@Component({
  selector: 'cds-whatsapp-receiver',
  templateUrl: './whatsapp-receiver.component.html',
  styleUrls: ['./whatsapp-receiver.component.scss']
})
export class CdsWhatsappReceiverComponent implements OnInit {

  @Input() template: any;
  @Input() receiver: any;
  @Input() index: any;
  @Output() deleteReceiver = new EventEmitter();
  @Output() receiverValue = new EventEmitter();

  header_component: any;
  body_component: any;
  footer_component: any;
  buttons_component: any;
  url_button_component: any;
  url_button_component_temp: any;
  header_component_temp: any;
  body_component_temp: any;
  body_params = [];
  header_params = [];
  buttons_params = [];
  previsioning_url: string;
  sanitizedUrl: any;
  fileUploadAccept: string = "image/*";
  invalidUrl: Boolean = false;
  src: any;
  isFilePendingToUpload = false;
  fileUploadedName: string;
  displayPreview: Boolean = false;
  phone_number: string;
  user: UserModel

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    public sanitizer: DomSanitizer,
    public elementRef: ElementRef,
    private uploadService: UploadService,
    private tiledeskAuthService: TiledeskAuthService
  ) {

  }

  ngOnInit(): void {
    this.logger.log("onInit receiver: ", this.receiver);
    this.user = this.tiledeskAuthService.getCurrentUser();
    this.onInputTemplate();
  }

  initialize() {

    if (this.receiver.phone_number) {
      this.phone_number = this.receiver.phone_number;
    }
    if (this.receiver.header_params) {
      this.header_params.forEach((hp, i) => {

        if (this.receiver.header_params[i].type === 'TEXT') {
          hp.text = this.receiver.header_params[i].text;
        }
        if (this.receiver.header_params[i].type === 'IMAGE') {
          hp.image.link = this.receiver.header_params[i].image.link;

          let decoded_url = decodeURIComponent(this.receiver.header_params[i].image.link);
          this.fileUploadedName = decoded_url.substring(decoded_url.lastIndexOf('/') + 1);
        }
        if (this.receiver.header_params[i].type === 'DOCUMENT') {
          hp.document.link = this.receiver.header_params[i].document.link;
        }
        // hp.text = this.receiver.header_params[i].text;
        //this.logger.log("this.receiver.header_params", this.receiver.header_params);
        //this.logger.log("this.header_params", this.header_params);
      })
    }

    if (this.receiver.body_params) {
      this.body_params.forEach((bp, i) => {
        bp.text = this.receiver.body_params[i].text
      })
    }

    if (this.receiver.buttons_params) {
      this.buttons_params.forEach((ubp, i) => {
        ubp.text = this.receiver.buttons_params[i].text
      })

    }

    this.setUpPreview();

  }

  setUpPreview() {

    // this.body_params.forEach((param, i) => {
    //   let index = i + 1;
    //   let regex = '{{' + index + '}}';
    //   if (param.text) {
    //     this.body_component.text = this.body_component.text.replace(regex, param.text);
    //   }
    // })

    this.body_params.forEach((param, i) => {
      let index = i + 1;
      let regex = '{{' + index + '}}';
      if (param.text) {
        this.body_component.text = this.body_component.text.replace(regex, param.text);
      }
    })

    this.header_params.forEach((param, i) => {
      let index = i + 1;
      let regex = '{{' + index + '}}';
      if (param.text) {
        this.header_component.text = this.header_component.text.replace(regex, param.text);
      }
    })

    this.buttons_params.forEach((param, i) => {
      //this.logger.log("buttons_params - param: ", param);
      let index = i + 1;
      let regex = '{{' + index + '}}';
      if (param.text) {
        this.url_button_component.url = this.url_button_component.url.replace(regex, param.text);
      }
      let button_index = this.buttons_component.buttons.findIndex(b => b.type === 'URL');
      this.buttons_component.buttons[button_index] = this.url_button_component;
      this.previsioning_url = this.url_button_component.url;
    })

  }

  onInputTemplate() {
    let temp_template = JSON.parse(JSON.stringify(this.template));
    this.header_component = temp_template.components.find(c => c.type === 'HEADER');
    this.body_component = temp_template.components.find(c => c.type === 'BODY');
    this.footer_component = temp_template.components.find(c => c.type === 'FOOTER');
    this.buttons_component = temp_template.components.find(c => c.type === 'BUTTONS');
    if (this.buttons_component) {
      this.url_button_component = this.buttons_component.buttons.find(c => c.type === 'URL')
    }

    if (this.header_component) {
      this.header_component_temp = JSON.parse(JSON.stringify(this.header_component));
      if (this.header_component.format === 'TEXT') {
        if (this.header_component.example &&
          this.header_component.example.header_text) {
          this.header_component.example.header_text.forEach((p, i) => {
            this.header_params.push({ index: i + 1, type: "text", text: null })
          })
        }
      }
      else if (this.header_component.format === 'IMAGE') {
        if (this.header_component.example &&
          this.header_component.example.header_handle) {
          this.header_component.example.header_handle.forEach((p, i) => {
            this.header_params.push({ index: i + 1, type: this.header_component.format, image: { link: null } })
          })
        }
      }
      else if (this.header_component.format === 'DOCUMENT') {
        if (this.header_component.example &&
          this.header_component.example.header_handle) {
          this.fileUploadAccept = ".pdf"
          this.src = this.header_component.example.header_handle[0];
          this.sanitizeUrl(this.header_component.example.header_handle[0]);
          this.header_component.example.header_handle.forEach((p, i) => {
            this.header_params.push({ index: i + 1, type: this.header_component.format, document: { link: null } })
          })
        }
      }
      else if (this.header_component.format === 'LOCATION') {
        this.header_params.push({ index: 1, type: this.header_component.format, location: { latitude: null, longitude: null, name: null, address: null } })
      }
      else {
        this.logger.log("[WHATSAPP RECEIVER] Check unrecognized Header: ", this.header_component)
      }
    }

    if (this.body_component) {
      this.body_component_temp = JSON.parse(JSON.stringify(this.body_component));
      if (this.body_component.example) {
        this.body_component.example.body_text[0].forEach((p, i) => {
          this.body_params.push({ index: i + 1, type: "text", text: null })
        })
      }
    }

    if (this.url_button_component) {
      this.url_button_component_temp = JSON.parse(JSON.stringify(this.url_button_component));
      if (this.url_button_component.example) {
        this.url_button_component.example.forEach((p, i) => {
          this.buttons_params.push({ index: i + 1, type: "text", text: null })
          this.previsioning_url = this.url_button_component.url;
        })
      }
    }

    this.initialize();
  }

  sanitizeUrl(url) {
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onPhoneNumberChange(event) {
    // TODO - Aggiungere regex per controllare il numero inserito
    this.phone_number = event;

  }

  onParamBodyChange(event, param_num) {
    this.body_component = JSON.parse(JSON.stringify(this.body_component_temp));
    this.body_params[param_num - 1].text = event;
    this.body_params.forEach((param, i) => {
      let index = i + 1;
      let regex = '{{' + index + '}}';
      if (param.text) {
        this.body_component.text = this.body_component.text.replace(regex, param.text);
      }
    })
  }

  onParamHeaderChange(event, param_num) {
    this.header_component = JSON.parse(JSON.stringify(this.header_component_temp));
    if (this.header_params[param_num - 1].type === 'TEXT') {
      this.header_params[param_num - 1].text = event;
    }
    if (this.header_params[param_num - 1].type === 'IMAGE') {
      this.header_params[param_num - 1].image.link = event;
      this.invalidUrl = false;
    }
    if (this.header_params[param_num - 1].type === 'DOCUMENT') {
      this.header_params[param_num - 1].document.link = event;
      this.sanitizeUrl(event);
      this.invalidUrl = false;
    }

    this.header_params.forEach((param, i) => {
      let index = i + 1;
      let regex = '{{' + index + '}}';
      if (param.text) {
        this.header_component.text = this.header_component.text.replace(regex, param.text);
      }
    })
  }

  onParamButtonChange(event, param_num) {
    this.url_button_component = JSON.parse(JSON.stringify(this.url_button_component_temp));
    this.buttons_params[param_num - 1].text = event;
    this.buttons_params.forEach((param, i) => {
      let index = i + 1;
      let regex = '{{' + index + '}}';
      if (param.text) {
        this.url_button_component.url = this.url_button_component.url.replace(regex, param.text);
      }
      let button_index = this.buttons_component.buttons.findIndex(b => b.type === 'URL');
      this.buttons_component.buttons[button_index] = this.url_button_component;
      this.previsioning_url = this.url_button_component.url;
    })
  }

  // evaluate saving partial objects
  checkParameters() {
    let text_header_result = this.header_params.find(p => !p.text || p.text == '');
    let media_header_result = this.header_params.find(p => (p.image && (!p.image.link || p.image.link == '')) || (p.document && (!p.document.link || p.document.link == '')) || (p.location && (!p.location.name || !p.location.address || !p.location.latitude || !p.location.longitude)));
    let body_result = this.body_params.find(p => !p.text || p.text == '');
    let url_buttton_result = this.buttons_params.find(p => !p.text || p.text == '');

    if ((!text_header_result || !media_header_result) && !body_result && !url_buttton_result) {
      if (this.invalidUrl === false) {
        //this.logger.log(" ** PARAMETRI COMPLETI **")
        this.emitParams();
        let preview_container = this.elementRef.nativeElement.querySelector('#parameters-container');
        preview_container.classList.remove('highlighted');
      } else {
        let preview_container = this.elementRef.nativeElement.querySelector('#parameters-container');
        preview_container.classList.add('highlighted');
      }
    } else {
      let preview_container = this.elementRef.nativeElement.querySelector('#parameters-container');
      preview_container.classList.add('highlighted');
    }
  }

  emitParams() {
    const new_header_params = this.header_params.map(({ index, ...keepAttrs }) => keepAttrs)
    const new_body_params = this.body_params.map(({ index, ...keepAttrs }) => keepAttrs)
    const new_buttons_param = this.buttons_params.map(({ index, ...keepAttrs }) => keepAttrs)

    this.body_params.forEach(param => {
      this.logger.log("param: ", param);
    });


    let receiver_out: any = {
      phone_number: this.phone_number,
      // header_params: new_header_params,
      // body_params: new_body_params,
      // buttons_params: new_buttons_param
    }

    if (new_header_params.length > 0) {
      receiver_out.header_params = new_header_params;
    }
    if (new_body_params.length > 0) {
      receiver_out.body_params = new_body_params;
    }
    if (new_buttons_param.length > 0) {
      receiver_out.buttons_params = new_buttons_param;
    }
    this.logger.log("receiver_out: ", receiver_out);
    this.receiverValue.emit(receiver_out);
  }

  onBlur() {
    this.checkParameters();
  }

  onFocus() {
    let parameters_container = this.elementRef.nativeElement.querySelector('#parameters-container');
    parameters_container.classList.remove('highlighted');
  }

  onHeaderImageError(event) {
    this.invalidUrl = true;
    event.target.src = this.header_component.example.header_handle[0];
  }

  onDeleteReceiver() {
    this.deleteReceiver.emit(this.index);
  }

  showPreview() {
    this.displayPreview = true;
    let preview_container = this.elementRef.nativeElement.querySelector('#preview-container');
    preview_container.classList.add('preview-container-active')
  }

  hidePreview() {
    this.displayPreview = false;
    let preview_container = this.elementRef.nativeElement.querySelector('#preview-container');
    preview_container.classList.remove('preview-container-active')
  }


  onFileSelected(event: any): void {
    this.logger.log('[WHATSAPP-RECEIVER] onFileSelected IMAGE  upload')
    if (event) {
      let selectedFiles = event.target.files;
      this.logger.debug('[WHATSAPP-RECEIVER] AppComponent:detectFiles::selectedFiles', selectedFiles);
      // this.onAttachmentButtonClicked.emit(this.selectedFiles)
      if (selectedFiles == null) {
        this.isFilePendingToUpload = false;
      } else {
        this.isFilePendingToUpload = true;
      }
      this.logger.debug('[WHATSAPP-RECEIVER] AppComponent:detectFiles::selectedFiles::isFilePendingToUpload', this.isFilePendingToUpload);
      this.logger.debug('[WHATSAPP-RECEIVER] fileChange: ', event.target.files);
      if (event.target.files.length <= 0) {
        this.isFilePendingToUpload = false;
      } else {
        this.isFilePendingToUpload = true;
      }

      const that = this;
      if (event.target.files && event.target.files[0]) {
        const nameFile = event.target.files[0].name;
        const typeFile = event.target.files[0].type;
        const reader = new FileReader();
        that.logger.debug('[WHATSAPP-RECEIVER] OK preload: ', nameFile, typeFile, reader);
        reader.addEventListener('load', function () {
          that.logger.debug('[WHATSAPP-RECEIVER] addEventListener load', reader.result);
          // that.isFileSelected = true;
          // se inizia con image
          if (typeFile.startsWith('image') && !typeFile.includes('svg')) {
            const imageXLoad = new Image;
            that.logger.debug('[WHATSAPP-RECEIVER] onload ', imageXLoad);
            imageXLoad.src = reader.result.toString();
            imageXLoad.title = nameFile;
            imageXLoad.onload = function () {
              that.logger.debug('[WHATSAPP-RECEIVER] onload image');
              // that.arrayFilesLoad.push(imageXLoad);
              const uid = (new Date().getTime()).toString(36); // imageXLoad.src.substring(imageXLoad.src.length - 16);
              that.uploadSingle(selectedFiles.item(0)) //GABBBBBBBB
            };
          }
        }, false);

        if (event.target.files[0]) {
          reader.readAsDataURL(event.target.files[0]);
          that.logger.debug('[WHATSAPP-RECEIVER] reader-result: ', event.target.files[0]);
        }
      }


    }
    
  }

  private uploadSingle(file) {
    const that = this;
    // const send_order_btn = <HTMLInputElement>document.getElementById('chat21-start-upload-doc');
    // send_order_btn.disabled = true;
    that.logger.debug('[IMAGE-UPLOAD] AppComponent::uploadSingle::', file);
    // const file = this.selectedFiles.item(0);
    const currentUpload = new UploadModel(file);
 
    this.uploadService.upload(this.user.uid, currentUpload).then(data => {
      that.logger.debug(`[IMAGE-UPLOAD] Successfully uploaded file and got download link - ${data}`);

      this.fileUploadedName = file.name;
      if (this.header_params[0].image) {
        this.header_params[0].image.link = data.downloadURL;
      }
      if (this.header_params[0].document) {
        this.header_params[0].document.link = data.downloadURL;
        this.sanitizeUrl(data.downloadURL);
      }
      this.invalidUrl = false;
      this.isFilePendingToUpload = false
      // return downloadURL;
    }).catch(error => {
      // Use to signal error if something goes wrong.
      that.logger.error(`[IMAGE-UPLOAD] uploadSingle:: Failed to upload file and get link - ${error}`);
      that.isFilePendingToUpload = false;
    });
    that.logger.debug('[IMAGE-UPLOAD] reader-result: ', file);
  }

  removeHeaderFile() {
    this.isFilePendingToUpload = true;
    this.uploadService.delete(this.user.uid, this.header_params[0].image.link).then((result)=>{
      
      this.isFilePendingToUpload = false;
      this.fileUploadedName = "";

      if (this.header_params[0].image) {
        this.header_params[0].image.link = "";
      }
      if (this.header_params[0].document) {
        this.header_params[0].document.link = "";
      }

    }).catch((error)=> {
      this.logger.error('[CDS-CHATBOT-DTLS] BOT PROFILE IMAGE (FAQ-COMP) deleteUserProfileImage ERORR:', error)
      this.isFilePendingToUpload = false;
    })     
  }

}
