import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { ChangeBotLangModalComponent } from 'src/app/modals/change-bot-lang/change-bot-lang.component';
import { CdsCanvasComponent } from './cds-canvas.component';
import { ChatbotDesignStudioModule } from '../../chatbot-design-studio.module';
import { CdsPanelIntentListComponent } from './cds-panel-intent-list/cds-panel-intent-list.component';
import { CdsPanelWidgetComponent } from './cds-panel-widget/cds-panel-widget.component';
import { ContextMenuComponent } from './base-elements/context-menu/context-menu.component';

const routes: Routes = [
  {
    path: '',
    component: CdsCanvasComponent,
    title: 'Blocks',
    // children: [
    //   // {
    //   //   path: 'detail',
    //   //   title: 'Design studio - Chatbot detail',
    //   //   loadChildren: () => import('../cds-fulfillment/cds-fulfillment.module').then( m => m.CdsFulFillMentModule),
    //   // },
    //   // {
    //   //   path: 'import-export',
    //   //   title: 'Design studio - Chatbot Import/Export',
    //   //   loadChildren: () => import('../cds-fulfillment/cds-fulfillment.module').then( m => m.CdsFulFillMentModule),
    //   // },
    //   // {
    //   //   path: '',
    //   //   redirectTo: '.?active=bot_detail',
    //   //   pathMatch: 'full'
    //   // }
    // ]
  }
];

@NgModule({
  declarations: [
    CdsCanvasComponent,

    //CDS PANEL INTENT LIST
    CdsPanelIntentListComponent,

    //CDS PANEL WIDGET
    CdsPanelWidgetComponent,

    ContextMenuComponent,
    
  ],
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    SharedModule,
    CdsBaseElementModule,
    RouterModule.forChild(routes),
    // ChatbotDesignStudioModule
  ]
})
export class CdsCanvasModule { }

