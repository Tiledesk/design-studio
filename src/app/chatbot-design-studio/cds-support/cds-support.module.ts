import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { CDSMenuComponent } from '../cds-base-element/menu/menu.component';
import { ChatbotDesignStudioModule } from '../chatbot-design-studio.module';
import { CdsSupportComponent } from './cds-support.component';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: CdsSupportComponent
  }
];

@NgModule({
  declarations: [
    // CdsSupportComponent
    // CDSMenuComponent
  ],
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    ChatbotDesignStudioModule,
    RouterModule.forChild(routes)
  ]
})
export class CdsSupportModule { }

