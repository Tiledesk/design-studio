import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { RulesComponent } from './rules/rules.component';
import { RulesAddComponent } from './rules-add/rules-add.component';
import { RulesListComponent } from './rules-list/rules-list.component';
import { ConditionComponent } from './rules-add/condition/condition.component';
import { ActionComponent } from './rules-add/action/action.component';
import { BaseElementModule } from 'src/app/shared/base-element.module';

const routes: Routes = [
  {
    path: '',
    component: RulesComponent
  }
];

@NgModule({
  declarations: [
    RulesComponent,

    // ******* CDS RULES:: start *******
    RulesAddComponent,
    RulesListComponent,
    ConditionComponent,
    ActionComponent,
    // ******* CDS RULES:: end *******
    
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
export class CdsRulesModule { }

