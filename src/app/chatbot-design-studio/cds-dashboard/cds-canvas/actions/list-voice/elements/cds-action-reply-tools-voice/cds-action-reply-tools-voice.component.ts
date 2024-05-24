import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { TYPE_MESSAGE, TYPE_COMMAND, generateShortUID, TYPE_BUTTON, TYPE_URL } from '../../../../../../utils';
import { Message, Command, Button } from 'src/app/models/action-model';

@Component({
  selector: 'cds-action-reply-tools-voice',
  templateUrl: './cds-action-reply-tools-voice.component.html',
  styleUrls: ['./cds-action-reply-tools-voice.component.scss']
})
export class CdsActionReplyToolsVoiceComponent implements OnInit {

  @Input() idAction: string;
  @Output() addNewActionReply = new EventEmitter();

  TypeMessage = TYPE_MESSAGE;

  constructor() { }

  ngOnInit(): void {
  }


  addElement(type: TYPE_MESSAGE){
    var newElement:Command;
    switch (type) {
      case TYPE_MESSAGE.TEXT:
        newElement = {
          type: TYPE_COMMAND.MESSAGE,
          message: {
            text: '',
            type: TYPE_MESSAGE.TEXT
          },
        } 
        break;
      case TYPE_MESSAGE.IMAGE:
        newElement = {
          type: TYPE_COMMAND.MESSAGE,
          message: {
            text: '',
            type: TYPE_MESSAGE.IMAGE,
            metadata: {
              src: '',
              downloadURL: ''
              // width: MESSAGE_METADTA_WIDTH,
              // height: MESSAGE_METADTA_HEIGHT
            }
          },
        } 
        break;
      case TYPE_MESSAGE.FRAME:
      case TYPE_MESSAGE.AUDIO:
        newElement = {
          type: TYPE_COMMAND.MESSAGE,
          message: {
            text: '',
            type: TYPE_MESSAGE.FRAME,
            metadata: {
              src: '',
              downloadURL: ''
              // width: MESSAGE_METADTA_WIDTH,
              // height: MESSAGE_METADTA_HEIGHT
            }
          },
        } 
        break;
      case TYPE_MESSAGE.GALLERY:
        const idButton = generateShortUID();
        const idActionConnector = this.idAction+'/'+idButton;
        newElement = {
          type: TYPE_COMMAND.MESSAGE,
          message: {
            text: '',
            type: TYPE_MESSAGE.GALLERY,
            attributes: {
              attachment: {
                  type: 'gallery',
                  gallery: [
                    {
                      preview: { src: '', downloadURL: ''},
                      title: 'Type title',
                      description: 'Type description',
                      buttons: [

                        new Button(
                          idButton,
                          idActionConnector,
                          false,
                          TYPE_BUTTON.TEXT,
                          'Button',
                          '',
                          TYPE_URL.BLANK,
                          '',
                          '',
                          true
                        )
                        // {
                        //   'uid': idButton,
                        //   'idConnector': idActionConnector,
                        //   'isConnected': false,
                        //   'value': 'Button',
                        //   'type': TYPE_BUTTON.TEXT,
                        //   'target': TYPE_URL.BLANK,
                        //   'link': '',
                        //   'action': '',
                        //   'show_echo': true
                        // }
                      ]
                    }
                  ]
              }
            }
          },
        } 
        break;
      case TYPE_MESSAGE.REDIRECT:
        newElement = {
          type: TYPE_COMMAND.MESSAGE,
          message: {
            text: '',
            type: TYPE_MESSAGE.REDIRECT,
            metadata: {
              src : '',
              downloadURL: '',
              target: TYPE_URL.BLANK,
              type: TYPE_MESSAGE.REDIRECT
            }
          },
        } 
        break;
      default:
        break;
    }
    this.addNewActionReply.emit(newElement);
  }

}
