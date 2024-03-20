import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { CdsFulfillmentComponent } from './cds-fulfillment.component';

const routes: Routes = [
  {
    path: '',
    component: CdsFulfillmentComponent
  }
];

@NgModule({
  declarations: [
    CdsFulfillmentComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule.forChild(routes)
  ]
})
export class CdsFulFillMentModule { }

