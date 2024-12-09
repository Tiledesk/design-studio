import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { CdsActionReplySettingsComponent } from './elements/cds-action-reply-settings/cds-action-reply-settings.component';
import { CdsActionReplyToolsVoiceComponent } from './elements/cds-action-reply-tools-voice/cds-action-reply-tools-voice.component';
import { BaseElementModule } from 'src/app/shared/base-element.module';
import { CdsActionDTMFFormComponent } from './cds-action-dtmf-form/cds-action-dtmf-form.component';
import { CdsActionReplyVoiceTextComponent } from './elements/cds-action-reply-voice-text/cds-action-reply-voice-text.component';
import { CdsActionReplyVoiceButtonComponent } from './elements/cds-action-reply-button/cds-action-reply-button.component';
import { CdsActionDtmfMenuComponent } from './cds-action-dtmf-menu/cds-action-dtmf-menu.component';
import { CdsActionBlindTransferComponent } from './cds-action-blind-transfer/cds-action-blind-transfer.component';
import { CdsActionPlayPromptComponent } from './cds-action-play-prompt/cds-action-play-prompt.component';
import { CdsActionVoiceComponent } from './cds-action-voice-base/cds-action-voice.component';
import { CdsActionReplyAudioComponent } from './elements/cds-action-reply-audio/cds-action-reply-audio.component';
import { CdsActionSpeechFormComponent } from './cds-action-speech-form/cds-action-speech-form.component';
import { CdsActionAudioRecordComponent } from './cds-action-audio-record/cds-action-audio-record.component';

@NgModule({
  declarations: [
    //VXML ACTIONS //
    CdsActionDTMFFormComponent,
    CdsActionDtmfMenuComponent,
    CdsActionBlindTransferComponent,
    CdsActionPlayPromptComponent,
    CdsActionSpeechFormComponent,
      // action DTMFForm elements: start //
      CdsActionReplyToolsVoiceComponent,
      CdsActionReplySettingsComponent,
      CdsActionReplyVoiceTextComponent,
      CdsActionReplyVoiceButtonComponent,
      CdsActionReplyAudioComponent,
      
      // action DTMFForm elements: end //
    CdsActionVoiceComponent,
    CdsActionAudioRecordComponent
  ],
  imports: [
    CommonModule,
    TranslateModule,
    MaterialModule,
    SharedModule,
    CdsBaseElementModule,
    BaseElementModule
  ],
  exports:[
    //VXML ACTIONS //
    CdsActionDTMFFormComponent,
    CdsActionDtmfMenuComponent,
    CdsActionBlindTransferComponent,
    CdsActionPlayPromptComponent,
    CdsActionSpeechFormComponent,
      // action DTMFForm elements: start //
      CdsActionReplyToolsVoiceComponent,
      CdsActionReplySettingsComponent,
      CdsActionReplyVoiceTextComponent,
      CdsActionReplyVoiceButtonComponent,
      CdsActionReplyAudioComponent,
      // action DTMFForm elements: end //
    CdsActionVoiceComponent,
    CdsActionAudioRecordComponent
  ]
})
export class CdsVoiceActionsModule { }

