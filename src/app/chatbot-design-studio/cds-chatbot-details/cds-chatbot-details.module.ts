import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { CdsChatbotDetailsComponent } from './cds-chatbot-details.component';
import { CDSDetailBotDetailComponent } from './detail/detail.component';
import { CDSDetailImportExportComponent } from './import-export/import-export.component';
import { CDSDetailCommunityComponent } from './community/community.component';
import { CDSDetailDeveloperComponent } from './developer/developer.component';
import { CDSAdvancedComponent } from './advanced/advanced.component';
import { ChangeBotLangModalComponent } from 'src/app/modals/change-bot-lang/change-bot-lang.component';

const routes: Routes = [
  {
    path: '',
    component: CdsChatbotDetailsComponent,
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
    CdsChatbotDetailsComponent,

    // ******* CDS CHATBOT DETAIL:: start *******
    CDSDetailBotDetailComponent,
    CDSDetailImportExportComponent,
    CDSDetailCommunityComponent,
    CDSDetailDeveloperComponent,
    CDSAdvancedComponent,
    // ******* CDS CHATBOT DETAIL:: end *******


    //MODALS
    ChangeBotLangModalComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    SharedModule,
    CdsBaseElementModule,
    RouterModule.forChild(routes)
  ]
})
export class CdsChatbotDetailsModule { }

