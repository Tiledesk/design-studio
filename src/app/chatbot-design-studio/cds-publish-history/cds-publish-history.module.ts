import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { CdsPublishHistoryComponent } from './cds-publish-history.component';
import { MaterialModule } from 'src/app/shared/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { BaseElementModule } from 'src/app/shared/base-element.module';
import { MomentModule } from 'ngx-moment';

const routes: Routes = [
  {
    path: '',
    component: CdsPublishHistoryComponent
  }
];

@NgModule({
  declarations: [
    CdsPublishHistoryComponent
  ],
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    SharedModule,
    CdsBaseElementModule,
    BaseElementModule,
    MomentModule,
    RouterModule.forChild(routes)
  ]
})
export class CdsPublishHistoryModule { }
