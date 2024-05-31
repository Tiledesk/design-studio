import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';


import { CdsDashboardComponent } from './cds-dashboard.component';
import { CdsSidebarComponent } from './cds-sidebar/cds-sidebar.component';
import { CdsHeaderComponent } from './cds-header/cds-header.component';




import { MaterialModule } from 'src/app/shared/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { CdsPopupComponent } from './utils/cds-popup/cds-popup.component';
import { ChangelogComponent } from 'src/app/modals/changelog/changelog.component';
import { CdsModalActivateBotComponent } from 'src/app/modals/cds-modal-activate-bot/cds-modal-activate-bot.component';
import { CdsPublishOnCommunityModalComponent } from 'src/app/modals/cds-publish-on-community-modal/cds-publish-on-community-modal.component';
import { WsChatbotService } from 'src/app/services/websocket/ws-chatbot.service';
import { FilterPipe } from 'src/app/pipe/filter.pipe';


const routes: Routes = [
  { path: '', 
    component: CdsDashboardComponent,
    title: 'Design studio',
    children: [
      {
        path: 'blocks',
        title: 'Design studio - Blocks',
        loadChildren: () => import('./cds-canvas/cds-canvas.module').then( m => m.CdsCanvasModule),
      },
      {
        path: 'fulfillment',
        title: 'Design studio - Fulfillment',
        loadChildren: () => import('../cds-fulfillment/cds-fulfillment.module').then( m => m.CdsFulFillMentModule),
      },
      {
        path: 'rules',
        title: 'Design studio - Rules',
        loadChildren: () => import('../cds-rules/cds-rules.module').then( m => m.CdsRulesModule),
      },
      {
        path: 'globals',
        title: 'Design studio - Globals',
        loadChildren: () => import('../cds-globals/cds-globals.module').then( m => m.CdsGlobalsModule),
      },
      {
        path: 'settings',
        title: 'Design studio - Detail',
        loadChildren: () => import('../cds-chatbot-details/cds-chatbot-details.module').then( m => m.CdsChatbotDetailsModule),
      },
      {
        path: 'support',
        title: 'Design studio - Support',
        loadChildren: () => import('../cds-support/cds-support.module').then( m => m.CdsSupportModule),
      },
      {
        path: '',
        redirectTo: 'blocks',
        pathMatch: 'full'
      }

    ]
  }
];


@NgModule({
  declarations: [
    CdsDashboardComponent,
    CdsSidebarComponent,
    CdsHeaderComponent,

    //UTILS
    CdsPopupComponent,
    ChangelogComponent,

    //MODALS
    CdsModalActivateBotComponent,
    CdsPublishOnCommunityModalComponent,

  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MaterialModule,
    TranslateModule,
    CdsBaseElementModule
  ],
  providers: [
    WsChatbotService
  ]
})
export class CdsDashboardModule { }

