import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { Project } from 'src/app/models/project-model';
import { voiceProviderList } from '../../utils-voice';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { variableList } from '../../utils-variables';
import { SelectComponent } from '../../cds-base-element/select/select.component';
import { DOCS_LINK } from '../../utils';
import { AiService } from 'src/app/services/ai.service';

@Component({
  selector: 'cds-voice-settings',
  templateUrl: './voice-settings.component.html',
  styleUrls: ['./voice-settings.component.scss']
})
export class CDSVoiceSettingsComponent implements OnInit {

  @ViewChild('voiceName') voiceNameSelect!: SelectComponent;
  @ViewChild('voiceLanguage') voiceLanguageSelect!: SelectComponent;
  
  @Input() selectedChatbot: Chatbot;
  @Input() project: Project;

  //const
  voiceProviderList = voiceProviderList;
  DOCS_LINK = DOCS_LINK;

  list = [];

  tts_model_list = [];
  stt_model_list = [];
  voice_name_list = [];
  voice_language_list = [];
  voiceProvider: string
  tts_model: string;
  stt_model: string;
  voice_name: string;
  voice_language: string

  
  private logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    private faqKbService: FaqKbService,
    private aiService: AiService
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
    this.voice_language_list = Array.from( new Map( voiceProviderList.find(el => el.key === this.voiceProvider)?.tts_voice.map(v => [v.language_code, { language_code: v.language_code, language: v.language }])).values() );
    this.voice_name_list = voiceProviderList.find(el => el.key === this.voiceProvider)?.tts_voice.map(el => ({ ...el, description: `${el.type !== 'standard' ?  ' - ' + el.type : ''}` }))
    this.voice_language = voiceProviderList.find(el => el.key === this.voiceProvider)?.tts_voice.find(el => el.voiceId === this.voice_name)?.language_code

    if(this.voiceProvider === 'openai'){
      this.tts_model_list = voiceProviderList.find(el => el.key === this.voiceProvider)?.tts_model.map(el => ({ ...el, description: `${el.type !== 'standard' ?  ' - ' + el.type : ''}` }))
      this.stt_model_list = voiceProviderList.find(el => el.key === this.voiceProvider)?.stt_model.map(el => ({ ...el, description: `${el.type !== 'standard' ? ' - ' + el.type : ''}` }))
      this.voice_name_list = voiceProviderList.find(el => el.key === this.voiceProvider)?.tts_voice.map(el => ({ ...el, description: `${el.type !== 'standard' ? ' - ' + el.type : ''}` }))
    }

    if(this.selectedChatbot && this.selectedChatbot.attributes && this.selectedChatbot.attributes.globals){
      this.list = this.selectedChatbot.attributes.globals.map(s => ({ ...s, visible: false }));
    }
  }

  onSelect(event, key){
    this.logger.log('[CDS-CHATBOT-VOICE-SETTINGS] onSelect ', event, key)
    switch(key){
      case 'VOICE_PROVIDER':{
        this.findAndUpdateProperty("VOICE_PROVIDER", event.key)
        this.findAndUpdateProperty("TTS_VOICE_NAME", null)
        this.findAndUpdateProperty("TTS_VOICE_LANGUAGE", null)
        this.findAndUpdateProperty("TTS_MODEL", null)
        this.findAndUpdateProperty("STT_MODEL", null)
        this.voiceNameSelect.onResetValue(null)
        this.voiceProvider = event.key
        // this.voiceLanguageSelect.onResetValue(null)
        this.voice_language_list = Array.from( new Map( voiceProviderList.find(el => el.key === event.key)?.tts_voice.map(v => [v.language_code, { language_code: v.language_code, language: v.language }])).values() );
        this.voice_name_list = [];
        // this.voice_name_list = voiceProviderList.find(el => el.key === event.key)?.tts_voice.map(el => ({ ...el, description: `${el.type !== 'standard' ?  ' - ' + el.type : ''} (${el.language_code})` }))
        if(event && event.key === 'openai'){
          this.tts_model_list = voiceProviderList.find(el => el.key === event.key)?.tts_model.map(el => ({ ...el, description: `${el.type !== 'standard' ?  ' - ' + el.type : ''}` }))
          this.stt_model_list = voiceProviderList.find(el => el.key === event.key)?.stt_model.map(el => ({ ...el, description: `${el.type !== 'standard' ?  ' - ' + el.type : ''}` }))
          this.voice_name_list = voiceProviderList.find(el => el.key === event.key)?.tts_voice.map(el => ({ ...el, description: `${el.type !== 'standard' ?  ' - ' + el.type : ''}` }))

          this.findAndUpdateProperty("TTS_VOICE_LANGUAGE", null)
          this.voiceLanguageSelect.onResetValue(null)
          this.voice_language = null;
        }
        break;
      };
      case 'TTS_VOICE_LANGUAGE':{
        this.findAndUpdateProperty("TTS_VOICE_LANGUAGE", event.language_code)
        this.voice_language = event.language_code;
        this.voice_name_list = this.voiceProvider === 'twilio'? voiceProviderList.find(el => el.key === this.voiceProvider).tts_voice.filter(el => el.language_code === event.language_code).map(el => ({ ...el, description: `${el.type !== 'standard' ?  ' - ' + el.type : ''}` })) : voiceProviderList.find(el => el.key === this.voiceProvider).tts_voice
        
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


  onResetSelect(event: any, key: string){
    this.logger.log('[CDS-CHATBOT-VOICE-SETTINGS] onResetSelect ', event, key)
    switch(key){
      case 'VOICE_PROVIDER':{
        this.findAndUpdateProperty("VOICE_PROVIDER", null)
        this.findAndUpdateProperty("TTS_VOICE_NAME", null)
        this.findAndUpdateProperty("TTS_VOICE_LANGUAGE", null)
        this.voice_name = null;
        this.voice_language = null
        if(this.voiceProvider === 'openai'){
          this.findAndUpdateProperty("TTS_MODEL", null)
          this.findAndUpdateProperty("STT_MODEL", null)
          this.tts_model = null;
          this.stt_model = null;
        }
        this.voiceProvider = null;
        break;
      };
      case 'TTS_VOICE_LANGUAGE':{
        this.findAndUpdateProperty("TTS_VOICE_LANGUAGE", null)
        this.findAndUpdateProperty("TTS_VOICE_NAME", null)
        this.voice_name = null;
        this.voice_language = null
        break;
      };
      case 'TTS_VOICE_NAME':{
        this.findAndUpdateProperty("TTS_VOICE_NAME", null)
        this.voice_name = null;
        this.voice_language = null
        break;
      };
      case 'TTS_MODEL':{
        this.findAndUpdateProperty("TTS_MODEL", null)
        this.tts_model = null;
        break;
      };
      case 'STT_MODEL':{
        this.findAndUpdateProperty("STT_MODEL", null)
        this.stt_model = null;
        break;
      }
    }
    this.saveAttributes();
  }
  

  private findAndUpdateProperty(key: string, value: string){
    const existingKey = this.list.findIndex( (item: any) => item.key === key );
    if (existingKey > -1 ) {
      this.list[existingKey].value = value
    } else {
      this.list.push({ key: key, value: value });
    }
  }

  private saveAttributes() {
      
    let data = this.list.map(({ visible, ...keepAttrs }) => keepAttrs);
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
