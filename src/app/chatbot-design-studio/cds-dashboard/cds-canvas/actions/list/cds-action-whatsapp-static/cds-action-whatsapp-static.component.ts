import { v4 as uuidv4 } from 'uuid';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionWhatsappStatic } from 'src/app/models/action-model';
import { WhatsappService } from 'src/app/services/whatsapp.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-whatsapp-static',
  templateUrl: './cds-action-whatsapp-static.component.html',
  styleUrls: ['./cds-action-whatsapp-static.component.scss']
})
export class CdsActionWhatsappStaticComponent implements OnInit {

  @Input() action: ActionWhatsappStatic;
  @Input() project_id: string;
  @Input() intentName: string;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  // project_id: "123457";
  templates_list = [];
  // receiver_list = [];

  phone_number_id: string;
  showLoader: Boolean = false;
  selected_template: any;
  payload: any;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private whatsapp: WhatsappService,
    public el: ElementRef
  ) { }

  ngOnInit(): void {
    // this.logger.log("[ACTION WHATSAPP STATIC] action: ", this.action);
    // this.getTemplates();
    //this.initialize();
    if (this.previewMode == false) {
      this.logger.log("Whatsapp static project_id: ", this.project_id);
      this.showLoader = true;
      this.getTemplates();
    }
  }



  getTemplates() {
    this.whatsapp.getAllTemplates().subscribe((templates: any[]) => {

      this.templates_list = templates.map(t => {
        if (t.category === 'MARKETING') {
          t.icon = "campaign"
        }
        else {
          t.icon = "notifications_active"
        }
        t.description = t.components.find(c => c.type === 'BODY').text;
        return t;
      })

    }, (error) => {
      this.showLoader = false;
      this.logger.log("[ACTION WHATSAPP STATIC] error get templates: ", error);
    }, () => {
      this.logger.log("[ACTION WHATSAPP STATIC] get templates completed: ");
      this.updateJsonPreview();
      if (this.action.templateName) {
        this.selected_template = this.templates_list.find(t => t.name === this.action.templateName);
      }
      this.showLoader = false;
      let preview = document.getElementById('json-preview-container');
      if(preview){
        preview.style.display = 'block';
      }
      this.initialize();
    })
  }

  initialize() {
    if (this.action.payload) {
      this.logger.debug("[ACTION WHATSAPP STATIC] initialize with payload: ", this.action.payload);
      if (this.action.payload.phone_number_id) {
        this.phone_number_id = this.action.payload.phone_number_id;
      }
      //this.updateJsonPreview();
      // if (this.action.payload.receiver_list) {
      //   this.receiver_list = this.action.payload.receiver_list;
      // }
      // this.logger.log("[ACTION WHATSAPP STATIC] payload: ", this.action.payload);
    } else {
      this.logger.log("action payload non esiste: ", this.action.payload);
      this.logger.debug("[ACTION WHATSAPP STATIC] Payload empty --> create payload")
      this.action.payload = {
        id_project: this.project_id,
        phone_number_id: null,
        template: {
          name: null,
          language: null
        },
        receiver_list: []
      }
      this.updateJsonPreview();
      this.logger.log("[ACTION WHATSAPP STATIC] payload: ", this.action.payload)
    }
  }

  onChangeSelect(event) {
    this.logger.debug("[ACTION WHATSAPP STATIC] onChangeSelect event", event);
    this.selected_template = event;
    this.action.templateName = this.selected_template.name;
    this.action.payload.template.name = this.selected_template.name;
    this.action.payload.template.language = this.selected_template.language;
    this.action.payload.receiver_list = [];
    this.updateJsonPreview();
    this.addReceiver();
    this.updateAndSaveAction.emit()
  }

  addReceiver() {
    this.action.payload.receiver_list.push({ phone_number: null });
  }

  onReceiverEmitted(event, index) {
    // update receiver
    this.action.payload.receiver_list[index] = event;
    this.logger.log("[ACTION WHATSAPP] Action updated ", this.action.payload);
    this.updateAndSaveAction.emit()
    this.updateJsonPreview();

    // if (this.action.payload.receiver_list.find(r => r.phone_number === event.phone_number)) {
    //   this.logger.log("[ACTION WHATSAPP STATIC] Receiver already exists with number: onReceiverEmitted event: ", event.phone_number);
    // } else {

    //   // this.message.receiver_list.push(event);
    //   // this.logger.log("payload.receiver_list (before) ", this.action.payload.receiver_list);
    //   this.action.payload.receiver_list[index] = event;
    //   // this.action.payload = this.message;
    //   // this.logger.log("[ACTION WHATSAPP] Action updated ", this.action.payload);
    //   this.logger.log("[ACTION WHATSAPP] Action updated ", this.action.payload);
    // }
  }

  onReceiverDeleteEmitted(event, index) {
    this.logger.debug("delete event: ", event);
    this.action.payload.receiver_list.splice(index, 1);
    this.updateAndSaveAction.emit()
    this.updateJsonPreview();
  }


  onChangeTextarea(event){
    if(event){
      this.phone_number_id = event
      let element = document.getElementById('phone-number-id');
      element.classList.remove('is-invalid');
      var reg = new RegExp('^[0-9]+$');
      if (!reg.test(this.phone_number_id)) {
        element.classList.add('is-invalid');
      } else {
        this.action.payload.phone_number_id = this.phone_number_id;
        this.updateAndSaveAction.emit();
      }

      this.logger.debug("[ACTION WHATSAPP] Action updated ", this.action.payload);
      this.updateJsonPreview();
    }
  }

  updateJsonPreview() {
    // var str = JSON.stringify(this.action.payload, undefined, 4);

    let json = {
      payload: {
        text: "/" + this.intentName,
        id_project: this.project_id,
        request: {
          request_id: uuidv4()
        },
        attributes: {
          payload: {
            whatsapp_attribute: this.action.payload
          }
        }
      },
      token: "YOUR_CHATBOT_TOKEN_HERE"
    }
    var str = JSON.stringify(json, undefined, 2);
    let element = document.getElementById('json');
    if (element) {
      element.innerHTML = this.syntaxHighlight(str);
      //element.innerHTML = str;
    }
  }

  syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      var cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  }

  copyToClipboard() {
    let json = {
      payload: {
        text: "/" + this.intentName,
        id_project: this.project_id,
        request: {
          request_id: uuidv4()
        },
        attributes: {
          payload: {
            whatsapp_attribute: this.action.payload
          }
        }
      },
      token: "YOUR_CHATBOT_TOKEN_HERE"
    }
    var str = JSON.stringify(json, undefined, 2);
    navigator.clipboard.writeText(str);
  }

}
