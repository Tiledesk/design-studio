import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { CdsActionReplySettingsComponent } from './elements/cds-action-reply-settings/cds-action-reply-settings.component';
import { CdsActionReplyToolsVoiceComponent } from './elements/cds-action-reply-tools-voice/cds-action-reply-tools-voice.component';
import { BaseElementModule } from 'src/app/shared/base-element.module';
import { CdsActionVoiceComponent } from '../list-voice/cds-action-dtmf-form/cds-action-voice.component';
import { CdsActionReplyVoiceTextComponent } from './elements/cds-action-reply-voice-text/cds-action-reply-voice-text.component';
import { CdsActionReplyVoiceButtonComponent } from './elements/cds-action-reply-button/cds-action-reply-button.component';
import { CdsActionDtmfMenuComponent } from './cds-action-dtmf-menu/cds-action-dtmf-menu.component';
import { CdsActionBlindTransferComponent } from './cds-action-blind-transfer/cds-action-blind-transfer.component';
import { CdsActionPlayPromptComponent } from './cds-action-play-prompt/cds-action-play-prompt.component';

@NgModule({
  declarations: [
    //VXML ACTIONS //
    CdsActionVoiceComponent,
    CdsActionDtmfMenuComponent,
    CdsActionBlindTransferComponent,
    CdsActionPlayPromptComponent,
      // action DTMFForm elements: start //
      CdsActionReplyToolsVoiceComponent,
      CdsActionReplySettingsComponent,
      CdsActionReplyVoiceTextComponent,
      CdsActionReplyVoiceButtonComponent,
      
      // action DTMFForm elements: end //
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
    CdsActionVoiceComponent,
    CdsActionDtmfMenuComponent,
    CdsActionBlindTransferComponent,
    CdsActionPlayPromptComponent,
      // action DTMFForm elements: start //
      CdsActionReplyToolsVoiceComponent,
      CdsActionReplySettingsComponent,
      CdsActionReplyVoiceTextComponent,
      CdsActionReplyVoiceButtonComponent
      // action DTMFForm elements: end //
  ]
})
export class CdsVoiceActionsModule { }

