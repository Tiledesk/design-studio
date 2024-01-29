import { SatPopoverModule } from '@ncstate/sat-popover';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { A11yModule } from '@angular/cdk/a11y';
import { RouterModule } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


//MATERIAL ELEMENTS
import { MatInputModule } from '@angular/material/input';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';



import { CdsDashboardComponent } from './cds-dashboard/cds-dashboard.component';
import { CdsSidebarComponent } from './cds-dashboard/cds-sidebar/cds-sidebar.component';
import { CdsHeaderComponent } from './cds-dashboard/cds-header/cds-header.component';
import { CdsSplashScreenComponent } from './cds-dashboard/utils/cds-splash-screen/cds-splash-screen.component';

//FULLFILLMENT 
import { CdsFulfillmentComponent } from './cds-fulfillment/cds-fulfillment.component';

//RULES COMPONENT
import { RulesComponent } from './cds-rules/rules/rules.component';
import { RulesAddComponent } from './cds-rules/rules-add/rules-add.component';
import { RulesListComponent } from './cds-rules/rules-list/rules-list.component';
import { ConditionComponent } from './cds-rules/rules-add/condition/condition.component';
import { ActionComponent } from './cds-rules/rules-add/action/action.component';

//SETTINGS COMPONENT
import { CdsChatbotDetailsComponent } from './cds-chatbot-details/cds-chatbot-details.component';
import { CDSDetailCommunityComponent } from './cds-chatbot-details/community/community.component';
import { CDSDetailDeveloperComponent } from './cds-chatbot-details/developer/developer.component';

//CDS CANVAS
import { CdsCanvasComponent } from './cds-dashboard/cds-canvas/cds-canvas.component';

//CDS-SECRETS
import { CdsGlobalsComponent } from './cds-globals/cds-globals.component';

//CDS-SUPPORT
import { CdsSupportComponent } from './cds-support/cds-support.component';



//BASE-ELEMENT
import { CDSTextComponent } from './cds-dashboard/cds-canvas/base-elements/text/text.component';
import { CDSTextareaComponent } from './cds-dashboard/cds-canvas/base-elements/textarea/textarea.component';
import { CDSDelaySliderComponent } from './cds-dashboard/cds-canvas/base-elements/delay-slider/delay-slider.component';
import { CDSImageUploadComponent } from './cds-dashboard/cds-canvas/base-elements/image-upload/image-upload.component';
import { CDSElementFromUrlComponent } from './cds-dashboard/cds-canvas/base-elements/element-from-url/element-from-url.component';



//INTENT
import { CdsIntentComponent } from './cds-dashboard/cds-canvas/cds-intent/cds-intent.component';
import { PanelIntentHeaderComponent } from './cds-dashboard/cds-canvas/cds-intent/panel-intent-header/panel-intent-header.component';
import { PanelIntentControlsComponent } from './cds-dashboard/cds-canvas/cds-intent/panel-intent-controls/panel-intent-controls.component';


//CDS-BASE-ELEMENT
import { SelectComponent } from './cds-base-element/select/select.component';
import { TextEditableDivComponent } from './cds-base-element/text-editable-div/text-editable-div.component';
import { AttributesComponent } from './cds-base-element/attributes/attributes.component';
import { DialogComponent } from './cds-base-element/dialog/dialog.component';
import { DialogYesNoComponent } from './cds-base-element/dialog-yes-no/dialog-yes-no.component';
import { CDSFilterComponent } from './cds-base-element/filter/filter.component';
import { CDSMenuComponent } from './cds-base-element/menu/menu.component';
import { CDSRadioButtonComponent } from './cds-base-element/radio-button/radio-button.component';
import { CDSDetailBotDetailComponent } from './cds-chatbot-details/detail/detail.component';
import { CDSDetailImportExportComponent } from './cds-chatbot-details/import-export/import-export.component';
import { WsChatbotService } from 'src/app/services/websocket/ws-chatbot.service';



import { CdsPopupComponent } from './cds-dashboard/utils/cds-popup/cds-popup.component';
import { CdsPanelElementsComponent } from './cds-dashboard/cds-canvas/cds-panel-elements/cds-panel-elements.component';
import { CdsPanelActionsComponent } from './cds-dashboard/cds-canvas/cds-panel-elements/cds-panel-actions/cds-panel-actions.component';
import { CdsPanelIntentListComponent } from './cds-dashboard/cds-canvas/cds-panel-intent-list/cds-panel-intent-list.component';

import { CdsConnectorComponent } from './cds-dashboard/cds-canvas/base-elements/cds-connector/cds-connector.component';

//ACTION REPLY: elements
import { CdsActionReplyToolsComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-reply/elements/cds-action-reply-tools/cds-action-reply-tools.component';
import { CdsActionReplyTextComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-reply/elements/cds-action-reply-text/cds-action-reply-text.component';
import { CdsActionReplyImageComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-reply/elements/cds-action-reply-image/cds-action-reply-image.component';
import { CdsActionReplyFrameComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-reply/elements/cds-action-reply-frame/cds-action-reply-frame.component';
import { CdsActionReplyRedirectComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-reply/elements/cds-action-reply-redirect/cds-action-reply-redirect.component';
import { CdsActionReplyGalleryComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-reply/elements/cds-action-reply-gallery/cds-action-reply-gallery.component';
import { CdsActionReplyButtonComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-reply/elements/cds-action-reply-button/cds-action-reply-button.component';

//ACTION ASSIGN-VARIABLE: elements
import { OperatorComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-assign-variable/operator/operator.component';
import { OperationComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-assign-variable/operation/operation.component';
import { OperandComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-assign-variable/operand/operand.component';

//ACTION ASSIGN-VARIABLE: elements
import { OperatorV2Component } from './cds-dashboard/cds-canvas/actions/list/cds-action-assign-variable-v2/operator/operator.component';
import { OperationV2Component } from './cds-dashboard/cds-canvas/actions/list/cds-action-assign-variable-v2/operation/operation.component';
import { OperandV2Component } from './cds-dashboard/cds-canvas/actions/list/cds-action-assign-variable-v2/operand/operand.component';

//ACTION JSON-CONDITION: elements
import { BaseConditionRowComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-json-condition/base-condition-row/base-condition-row.component';
import { VariableListComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-json-condition/variable-list/variable-list.component';
import { BaseFilterComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-json-condition/base-filter/base-filter.component';

//ACTION ASK-GPT: elements
import { AddkbDialogComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-askgpt/addkb-dialog/addkb-dialog.component';

//ACTION GPT-TASK: elements
import { AttributesDialogComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-gpt-task/attributes-dialog/attributes-dialog.component';

//CDS- ACTIONS
import { CdsActionDescriptionComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-description/cds-action-description.component';
import { CdsActionIntentComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-intent/cds-action-intent.component';
import { CdsActionReplyComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-reply/cds-action-reply.component';
import { CdsActionOnlineAgentsComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-online-agents/cds-action-online-agents.component';
import { CdsActionEmailComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-email/cds-action-email.component';
import { CdsActionWaitComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-wait/cds-action-wait.component';
import { CdsActionAgentHandoffComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-agent-handoff/cds-action-agent-handoff.component';
import { CdsActionChangeDepartmentComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-change-department/cds-action-change-department.component';
import { CdsActionCloseComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-close/cds-action-close.component';
import { CdsActionOpenHoursComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-open-hours/cds-action-open-hours.component';
import { CdsActionJsonConditionComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-json-condition/cds-action-json-condition.component';
import { CdsActionDeleteVariableComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-delete-variable/cds-action-delete-variable.component';
import { CdsActionReplaceBotComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-replace-bot/cds-action-replace-bot.component';
import { CdsActionReplaceBotV2Component } from './cds-dashboard/cds-canvas/actions/list/cds-action-replace-bot-v2/cds-action-replace-bot-v2.component';
import { CdsActionAssignVariableComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-assign-variable/cds-action-assign-variable.component';
import { CdsActionAssignVariableV2Component } from './cds-dashboard/cds-canvas/actions/list/cds-action-assign-variable-v2/cds-action-assign-variable-v2.component';
import { CdsActionHideMessageComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-hide-message/cds-action-hide-message.component';
import { CdsActionWebRequestComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-web-request/cds-action-web-request.component';
import { CdsActionWebRequestV2Component } from './cds-dashboard/cds-canvas/actions/list/cds-action-web-request-v2/cds-action-web-request-v2.component';
import { CdsActionAskgptComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-askgpt/cds-action-askgpt.component';
import { CdsActionWhatsappAttributeComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-whatsapp-attribute/cds-action-whatsapp-attribute.component';
import { CdsWhatsappReceiverComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-whatsapp-static/whatsapp-receiver/whatsapp-receiver.component';
import { CdsActionWhatsappStaticComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-whatsapp-static/cds-action-whatsapp-static.component';
import { CdsActionGPTTaskComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-gpt-task/cds-action-gpt-task.component';
import { CdsActionCaptureUserReplyComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-capture-user-reply/cds-action-capture-user-reply.component';
import { CdsActionQaplaComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-qapla/cds-action-qapla.component';
import { CdsActionMakeComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-make/cds-action-make.component';
import { CdsActionHubspotComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-hubspot/cds-action-hubspot.component';
import { CdsActionCodeComponent } from './cds-dashboard/cds-canvas/actions/list/cds-action-code/cds-action-code.component';

//CDS PANELS
import { CdsActionDetailPanelComponent } from './cds-dashboard/cds-canvas/cds-panel-action-detail/cds-panel-action-detail.component';
import { CdsPanelWidgetComponent } from './cds-dashboard/cds-canvas/cds-panel-widget/cds-panel-widget.component';
import { CdsPanelButtonConfigurationComponent } from './cds-dashboard/cds-canvas/cds-panel-button-configuration/cds-panel-button-configuration.component';
import { CdsGlobalPanelDetailComponent } from './cds-globals/cds-global-panel-detail/cds-global-panel-detail.component';

//FORM
import { CdsFormComponent } from './cds-dashboard/cds-canvas/actions/list/form/form.component';
import { FormFieldComponent } from './cds-dashboard/cds-canvas/actions/list/form/form-field/form-field.component';
import { FormEditAddComponent } from './cds-dashboard/cds-canvas/actions/list/form/form-edit-add/form-edit-add.component';
import { ModalWindowComponent } from './cds-dashboard/cds-canvas/actions/list/form/modal-window/modal-window.component';

//MODALS
import { CdsPublishOnCommunityModalComponent } from '../modals/cds-publish-on-community-modal/cds-publish-on-community-modal.component';
import { ChangeBotLangModalComponent } from 'src/app/modals/change-bot-lang/change-bot-lang.component';
import { CdsModalActivateBotComponent } from '../modals/cds-modal-activate-bot/cds-modal-activate-bot.component';


import { CdsActionArrowComponent } from './cds-dashboard/cds-canvas/actions/shared/cds-action-controls/cds-action-arrow/cds-action-arrow.component';
import { CdsActionControlsComponent } from './cds-dashboard/cds-canvas/actions/shared/cds-action-controls/cds-action-controls/cds-action-controls.component';
import { CdsAddActionMenuComponent } from './cds-dashboard/cds-canvas/actions/shared/cds-add-action-menu/cds-add-action-menu.component';
import { CdsQuestionComponent } from './cds-dashboard/cds-canvas/actions/list/question/question.component';
import { CdsAnswerComponent } from './cds-dashboard/cds-canvas/actions/list/answer/answer.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsEventComponent } from './cds-dashboard/cds-event/cds-event.component';
import { CdsRuleComponent } from './cds-dashboard/cds-rule/cds-rule.component';

import { CdsOptionsComponent } from './cds-dashboard/cds-canvas/cds-options/cds-options.component';
import { CdsPanelConnectorMenuComponent } from './cds-dashboard/cds-canvas/cds-panel-connector-menu/cds-panel-connector-menu.component';
import { MouseTipsComponent } from '../modals/mouse-tips/mouse-tips.component';
import { ChangelogComponent } from '../modals/changelog/changelog.component';
import { GetVariableNamePipe } from '../pipe/get-variable-name.pipe';
import { MaterialModule } from '../shared/material.module';

@NgModule({
  declarations: [
    CdsDashboardComponent,
    CdsSidebarComponent,
    CdsHeaderComponent,
    //CDS-ROOT-ELEMENTS: init
    CdsCanvasComponent,
    RulesComponent,
    CdsFulfillmentComponent,
    CdsChatbotDetailsComponent,
    CdsGlobalsComponent,
    //CDS-ROOT-ELEMENTS: end

    AttributesComponent,
    DialogComponent,
    DialogYesNoComponent,
    CDSFilterComponent,
    CDSMenuComponent,
    CDSRadioButtonComponent,
    SelectComponent,
    TextEditableDivComponent,

    // ******* CDS CANVAS:: start *******
      //BASE-ELEMENT
      CdsConnectorComponent,
      CDSDelaySliderComponent,
      CDSElementFromUrlComponent,
      CDSImageUploadComponent,
      CDSTextComponent,
      CDSTextareaComponent,

      //CDS INTENT
      CdsIntentComponent,
      PanelIntentHeaderComponent,
      PanelIntentControlsComponent,
      
      //CDS PANEL ELEMENTS
      CdsPanelElementsComponent,
      CdsPanelActionsComponent,

      //CDS PANEL ACTION DETAIL
      CdsActionDetailPanelComponent,

      //CDS PANEL BUTTON CONFIGURATION
      CdsPanelButtonConfigurationComponent,
      
      //CDS PANEL WIDGET
      CdsPanelWidgetComponent,

      CdsPanelIntentListComponent,

      //ACTIONS
        //SHARED
        CdsActionControlsComponent,
        CdsActionArrowComponent,
        CdsAddActionMenuComponent,
        //LIST
        CdsFormComponent,
          //FORM components
          FormFieldComponent,
          FormEditAddComponent,
          ModalWindowComponent,
        CdsQuestionComponent,
        CdsAnswerComponent,
        CdsActionDescriptionComponent,
        CdsActionReplyComponent,
        CdsActionWaitComponent,
        CdsActionAgentHandoffComponent,
        CdsActionOnlineAgentsComponent,
        CdsActionEmailComponent,
        CdsActionIntentComponent,
        CdsActionChangeDepartmentComponent,
        CdsActionCloseComponent,
        CdsActionOpenHoursComponent,
        CdsActionJsonConditionComponent,
        CdsActionDeleteVariableComponent,
        CdsActionReplaceBotComponent,
        CdsActionReplaceBotV2Component,
        CdsActionAssignVariableComponent,
        CdsActionAssignVariableV2Component,
        CdsActionHideMessageComponent,
        CdsActionWebRequestComponent,
        CdsActionWebRequestV2Component,
        CdsActionMakeComponent,
        CdsActionHubspotComponent,
        CdsActionWhatsappAttributeComponent,
        CdsActionWhatsappStaticComponent,
        CdsWhatsappReceiverComponent,
        CdsActionAskgptComponent,
        CdsActionGPTTaskComponent,
        CdsActionCaptureUserReplyComponent,
        CdsActionQaplaComponent,
        CdsActionCodeComponent,
        // action REPLY elements: start //
        CdsActionReplyToolsComponent,
        CdsActionReplyTextComponent,
        CdsActionReplyImageComponent,
        CdsActionReplyFrameComponent,
        CdsActionReplyRedirectComponent,
        CdsActionReplyGalleryComponent,
        CdsActionReplyButtonComponent,
        // action REPLY elements: end //
        // action ASSIGN-VARIABLE elements: start //
        OperationComponent,
        OperatorComponent,
        OperandComponent,
        // action ASSIGN-VARIABLE elements: end //
         // action ASSIGN-VARIABLE-V2 elements: start //
         OperationV2Component,
         OperatorV2Component,
         OperandV2Component,
         // action ASSIGN-VARIABLE-V2 elements: end //
        // action JSON-CONDITION elements: start //
        BaseConditionRowComponent,
        BaseFilterComponent,
        VariableListComponent,
        // action JSON-CONDITION elements: end //
        // action ASKGPT elements: start //
        AddkbDialogComponent,
        // action ASKGPT elements: end //
        // action GptTask elements: start //
        AttributesDialogComponent,
        // action GptTask elements: end //

    // ******* CDS CANVAS:: end *******

    // ******* CDS RULES:: start *******
    RulesAddComponent,
    RulesListComponent,
    ConditionComponent,
    ActionComponent,
    // ******* CDS RULES:: end *******

    // ******* CDS FULLFILLMENT:: start *******
    // ******* CDS FULLFILLMENT:: end *******

    // ******* CDS CHATBOT DETAIL:: start *******
    CDSDetailBotDetailComponent,
    CDSDetailImportExportComponent,
    CDSDetailCommunityComponent,
    CDSDetailDeveloperComponent,
    // ******* CDS CHATBOT DETAIL:: end *******

    // ******* CDS GLOBALS:: start *******
    CdsGlobalPanelDetailComponent,
    // ******* CDS GLOBALS:: start *******

    //UTILS
    CdsPopupComponent,
    CdsSplashScreenComponent,
    
    //MODALS
    CdsModalActivateBotComponent,
    CdsPublishOnCommunityModalComponent,
    ChangeBotLangModalComponent,
    // NetworkOfflineComponent,
    MouseTipsComponent,
    ChangelogComponent,
    
    //EVENT BASE COMPONENT
    CdsEventComponent,
    CdsRuleComponent,
    CdsOptionsComponent,
    CdsPanelConnectorMenuComponent,
    
    GetVariableNamePipe,
    CdsSupportComponent
  ],
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    NgSelectModule,
    // DragDropModule,
    // A11yModule,
    PickerModule,
    // TextFieldModule,
    // MatSliderModule,
    // MatSidenavModule,
    // MatSelectModule,
    // MatTooltipModule,
    // MatRadioModule,
    // MatCheckboxModule,
    // MatChipsModule,
    // MatGridListModule,
    // MatAutocompleteModule,
    // MatSlideToggleModule,
    // MatButtonToggleModule,
    // MatListModule,
    // MatButtonModule,
    // MatIconModule,
    // MatButtonToggleModule,
    // MatDialogModule,
    // MatInputModule,
    // MatExpansionModule,
    // MatTabsModule,
    // MatMenuModule,
    RouterModule,
    // TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    SatPopoverModule,
    // SharedModule,
    MaterialModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    })
  ],
  providers: [
    WsChatbotService,
    // DragDropService
  ],
  entryComponents: [
    ChangeBotLangModalComponent,
  ]
})
export class ChatbotDesignStudioModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}