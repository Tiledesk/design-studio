import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { CdsActionReplySettingsComponent } from '../list-voice/cds-action-dtmf-form/elements/cds-action-reply-settings/cds-action-reply-settings.component';
import { CdsActionReplyToolsVoiceComponent } from '../list-voice/cds-action-dtmf-form/elements/cds-action-reply-tools-voice/cds-action-reply-tools-voice.component';
import { BaseElementModule } from 'src/app/shared/base-element.module';
import { CdsActionVoiceComponent } from '../list-voice/cds-action-dtmf-form/cds-action-voice.component';

@NgModule({
  declarations: [
    //VXML ACTIONS //
    CdsActionVoiceComponent,
      // action DTMFForm elements: start //
      CdsActionReplyToolsVoiceComponent,
      CdsActionReplySettingsComponent,
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
      // action DTMFForm elements: start //
      CdsActionReplyToolsVoiceComponent,
      CdsActionReplySettingsComponent,
      // action DTMFForm elements: end //
  ]
})
export class CdsVoiceActionsModule { }

