import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { CdsGlobalsComponent } from './cds-globals.component';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsGlobalPanelDetailComponent } from './cds-global-panel-detail/cds-global-panel-detail.component';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { BaseElementModule } from 'src/app/shared/base-element.module';

const routes: Routes = [
  {
    path: '',
    component: CdsGlobalsComponent
  }
];

@NgModule({
  declarations: [
    CdsGlobalsComponent,

    // ******* CDS GLOBALS:: start *******
    CdsGlobalPanelDetailComponent,
    // ******* CDS GLOBALS:: start *******
    
  ],
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    SharedModule,
    CdsBaseElementModule,
    BaseElementModule,
    RouterModule.forChild(routes)
  ]
})
export class CdsGlobalsModule { }

