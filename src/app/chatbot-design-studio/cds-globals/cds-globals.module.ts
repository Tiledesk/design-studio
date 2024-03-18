import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ChatbotDesignStudioModule } from '../chatbot-design-studio.module';
import { CdsGlobalsComponent } from './cds-globals.component';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: CdsGlobalsComponent
  }
];

@NgModule({
  declarations: [
    // CDSMenuComponent,
    // CdsGlobalsComponent,

    // ******* CDS GLOBALS:: start *******
    // CdsGlobalPanelDetailComponent,
    // ******* CDS GLOBALS:: start *******
    
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
export class CdsGlobalsModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
