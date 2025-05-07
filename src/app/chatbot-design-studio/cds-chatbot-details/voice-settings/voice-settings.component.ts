import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { Project } from 'src/app/models/project-model';
import { voiceProviderList } from '../../utils-voice';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { variableList } from '../../utils-variables';
import { SelectComponent } from '../../cds-base-element/select/select.component';

@Component({
  selector: 'cds-voice-settings',
  templateUrl: './voice-settings.component.html',
  styleUrls: ['./voice-settings.component.scss']
})
export class CDSVoiceSettingsComponent implements OnInit {

  @ViewChild('voiceName') voiceNameSelect!: SelectComponent;
  
  @Input() selectedChatbot: Chatbot;
  @Input() project: Project;
  @Input() translationsMap: Map<string, string> = new Map();

  voiceProviderList = voiceProviderList;
  tts_model_list = [];
  stt_model_list = [];
  voice_name_list = [];
  voiceProvider: string
  tts_model: string;
  stt_model: string;
  voice_name: string;

  private logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    private faqKbService: FaqKbService,
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this.logger.log('[CDS-CHATBOT-VOICE-SETTINGS] (OnChanges) selectedChatbot ', this.selectedChatbot)
    this.initialize()
  }

  private initialize(){
    this.voiceProvider = this.selectedChatbot.attributes?.globals?.find(el => el.key === 'VOICE_PROVIDER')?.value
    this.tts_model = this.selectedChatbot.attributes?.globals?.find(el => el.key === 'TTS_MODEL')?.value
    this.stt_model = this.selectedChatbot.attributes?.globals?.find(el => el.key === 'STT_MODEL')?.value
    this.voice_name = this.selectedChatbot.attributes?.globals?.find(el => el.key === 'TTS_VOICE_NAME')?.value
    this.voice_name_list = voiceProviderList.find(el => el.key === this.voiceProvider)?.tts_voice.map(el => ({ ...el, description: `${el.type === 'neural' ? ' - neural' : ''} (${el.language_code})` }))
    
    if(this.voiceProvider === 'openai'){
      this.tts_model_list = voiceProviderList.find(el => el.key === this.voiceProvider)?.tts_model.map(el => ({ ...el, description: `${el.type === 'neural' ? ' - neural' : ''}` }))
      this.stt_model_list = voiceProviderList.find(el => el.key === this.voiceProvider)?.stt_model.map(el => ({ ...el, description: `${el.type === 'neural' ? ' - neural' : ''}` }))
      this.voice_name_list = voiceProviderList.find(el => el.key === this.voiceProvider)?.tts_voice.map(el => ({ ...el, description: `${el.type === 'neural' ? ' - neural' : ''}` }))
    }
  }

  onSelect(event, key){
    this.logger.log('[CDS-CHATBOT-VOICE-SETTINGS] onSelect ', event, key)
    switch(key){
      case 'VOICE_PROVIDER':{
        this.findAndUpdateProperty("VOICE_PROVIDER", event.key)
        this.findAndUpdateProperty("TTS_VOICE_NAME", null)
        this.voiceNameSelect.onResetValue(null)
        this.voiceProvider = event.key
        this.voice_name_list = voiceProviderList.find(el => el.key === event.key)?.tts_voice.map(el => ({ ...el, description: `${el.type === 'neural' ? ' - neural' : ''} (${el.language_code})` }))
        if(event && event.key === 'openai'){
          this.tts_model_list = voiceProviderList.find(el => el.key === event.key)?.tts_model.map(el => ({ ...el, description: `${el.type === 'neural' ? ' - neural' : ''}` }))
          this.stt_model_list = voiceProviderList.find(el => el.key === event.key)?.stt_model.map(el => ({ ...el, description: `${el.type === 'neural' ? ' - neural' : ''}` }))
          this.voice_name_list = voiceProviderList.find(el => el.key === event.key)?.tts_voice.map(el => ({ ...el, description: `${el.type === 'neural' ? ' - neural' : ''}` }))
        }
        break;
      };
      case 'TTS_VOICE_NAME':{
        this.findAndUpdateProperty("TTS_VOICE_NAME", event.voiceId)
        break;
      };
      case 'TTS_MODEL':{
        this.findAndUpdateProperty("TTS_MODEL", event.model)
        break;
      };
      case 'STT_MODEL':{
        this.findAndUpdateProperty("STT_MODEL", event.model)
        break;
      }
    }
    this.saveAttributes();
  }
  

  private findAndUpdateProperty(key: string, value: string){
    const existingKey = this.selectedChatbot.attributes.globals.find(
      (item: any) => item.key === key
    );
    
    if (existingKey) {
      // Se esiste, aggiorna il valore
      existingKey.value = value;
    } else {
      // Altrimenti, aggiungila
      this.selectedChatbot.attributes.globals.push({
        key: key,
        value: value
      });
    }
  }

  private saveAttributes() {
      
    let data = this.selectedChatbot.attributes.globals.map(({ visible, ...keepAttrs }) => keepAttrs);
    this.logger.log('[CDS-CHATBOT-VOICE-SETTINGS] saving globals ', data)

    this.faqKbService.addNodeToChatbotAttributes(this.selectedChatbot._id, 'globals', data).subscribe((resp) => {
      // this.newGlobal = {
      //   key: '',
      //   value: ''
      // }
      this.selectedChatbot.attributes= {
        globals: data
      }
        
      //Update local list (for variable-list component)
      variableList.find(el => el.key ==='globals').elements = this.selectedChatbot.attributes.globals.map(({
        key: name,
        ...rest
      }) => ({
        name,
        value: name
      }))
    }, (error) => {
      this.logger.error("[CDS-CHATBOT-VOICE-SETTINGS] saveAttributes error: ", error);
    }, () => {
      this.logger.debug("[CDS-CHATBOT-VOICE-SETTINGS]  saveAttributes *COMPLETE*");
    })
  }


}
