import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';


import { CdsDashboardComponent } from './cds-dashboard.component';
import { CdsSidebarComponent } from './cds-sidebar/cds-sidebar.component';
import { CdsHeaderComponent } from './cds-header/cds-header.component';




import { ChatbotDesignStudioModule } from '../chatbot-design-studio.module';
import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { CdsPopupComponent } from './utils/cds-popup/cds-popup.component';
import { ChangelogComponent } from 'src/app/modals/changelog/changelog.component';

const routes: Routes = [
  { path: '', 
    component: CdsDashboardComponent,
    title: 'CdsDashboard',
    children: [
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
        loadChildren: () => import('../cds-globals/cds-globals.module').then( m => m.CdsGlobalsModule),
      },
      {
        path: 'support',
        title: 'Design studio - Support',
        loadChildren: () => import('../cds-support/cds-support.module').then( m => m.CdsSupportModule),
      },

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
    ChangelogComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MaterialModule,
    TranslateModule,
    CdsBaseElementModule
  ]
})
export class CdsDashboardModule { }

