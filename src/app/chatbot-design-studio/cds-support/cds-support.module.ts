import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/shared/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';

import { CdsSupportComponent } from './cds-support.component';

const routes: Routes = [
  {
    path: '',
    component: CdsSupportComponent
  }
];

@NgModule({
  declarations: [
    CdsSupportComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MaterialModule,
    TranslateModule
  ],
  exports: [
  ]
})
export class CdsSupportModule { }
