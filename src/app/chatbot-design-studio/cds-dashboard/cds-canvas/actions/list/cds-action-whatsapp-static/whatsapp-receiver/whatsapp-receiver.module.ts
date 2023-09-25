
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { WhatsappReceiverComponent } from './whatsapp-receiver.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateModule,
        deps: [HttpClient]
      }
    })
  ],
  declarations: [WhatsappReceiverComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SendWhatsappTemplateModalModule {}
