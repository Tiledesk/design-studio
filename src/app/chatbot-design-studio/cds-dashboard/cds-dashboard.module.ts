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

const routes: Routes = [
  { path: '', 
    component: CdsDashboardComponent,
    title: 'CdsDashboard',
    children: [
      {
        path: 'globals',
        title: 'Design studio - Globals',
        loadChildren: () => import('../cds-globals/cds-globals.module').then( m => m.CdsGlobalsModule),
      },
      {
        path: 'support',
        title: 'Design studio - Support',
        loadChildren: () => import('../cds-support/cds-support.module').then( m => m.CdsSupportModule),
      }
    ]
  }
];


@NgModule({
  declarations: [
    CdsDashboardComponent,
    CdsSidebarComponent,
    CdsHeaderComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ChatbotDesignStudioModule,
    MaterialModule,
    TranslateModule
  ]
})
export class CdsDashboardModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
