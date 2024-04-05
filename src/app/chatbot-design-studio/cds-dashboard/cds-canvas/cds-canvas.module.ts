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
import { CdsPanelIntentListComponent } from './cds-panel-intent-list/cds-panel-intent-list.component';
import { CdsPanelWidgetComponent } from './cds-panel-widget/cds-panel-widget.component';
import { ContextMenuComponent } from './base-elements/context-menu/context-menu.component';
import { CdsActionArrowComponent } from './actions/shared/cds-action-controls/cds-action-arrow/cds-action-arrow.component';
import { CdsActionControlsComponent } from './actions/shared/cds-action-controls/cds-action-controls/cds-action-controls.component';
import { CdsAddActionMenuComponent } from './actions/shared/cds-add-action-menu/cds-add-action-menu.component';
import { CdsPanelActionsComponent } from './cds-panel-elements/cds-panel-actions/cds-panel-actions.component';
import { CdsPanelElementsComponent } from './cds-panel-elements/cds-panel-elements.component';
import { MouseTipsComponent } from 'src/app/modals/mouse-tips/mouse-tips.component';
import { CdsOptionsComponent } from './cds-options/cds-options.component';
import { CdsPanelButtonConfigurationComponent } from './cds-panel-button-configuration/cds-panel-button-configuration.component';
import { CdsEventComponent } from '../cds-event/cds-event.component';
import { CdsRuleComponent } from '../cds-rule/cds-rule.component';
import { CdsPanelConnectorMenuComponent } from './cds-panel-connector-menu/cds-panel-connector-menu.component';
import { CdsActionsModule } from './actions/list/cds-actions.module';
import { CdsActionDetailPanelComponent } from './cds-panel-action-detail/cds-panel-action-detail.component';
import { BaseElementModule } from 'src/app/shared/base-element.module';
import { CdsIntentComponent } from './cds-intent/cds-intent.component';
import { PanelIntentControlsComponent } from './cds-intent/panel-intent-controls/panel-intent-controls.component';
import { PanelIntentHeaderComponent } from './cds-intent/panel-intent-header/panel-intent-header.component';
import { CdsVoiceActionsModule } from './actions/list-voice/cds-voice-actions.module';

const routes: Routes = [
  {
    path: '',
    component: CdsCanvasComponent,
  }
];

@NgModule({
  declarations: [
    CdsCanvasComponent,

    //CDS INTENT
    CdsIntentComponent,
    PanelIntentHeaderComponent,
    PanelIntentControlsComponent,
    
    //CDS PANEL INTENT LIST
    CdsPanelIntentListComponent,

    //CDS PANEL ACTION DETAIL
    CdsActionDetailPanelComponent,

    //CDS PANEL WIDGET
    CdsPanelWidgetComponent,

    //CDS PANEL ELEMENTS
    CdsPanelElementsComponent,
    CdsPanelActionsComponent,

    //CDS PANEL BUTTON CONFIGURATION
    CdsPanelButtonConfigurationComponent,
    
    //CDS PANEL CONNECTOR MENU
    CdsPanelConnectorMenuComponent,
    
    //CDS OPTIONS
    CdsOptionsComponent,
   

    ContextMenuComponent,

    //ACTIONS
      //SHARED
      CdsActionControlsComponent,
      CdsActionArrowComponent,
      CdsAddActionMenuComponent,


    //MODALS
    MouseTipsComponent,

    //EVENT BASE COMPONENT
    CdsEventComponent,
    CdsRuleComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    SharedModule,
    CdsBaseElementModule,
    BaseElementModule,
    CdsActionsModule,
    CdsVoiceActionsModule,
    RouterModule.forChild(routes),
    // ChatbotDesignStudioModule
  ]
})
export class CdsCanvasModule { }

