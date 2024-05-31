import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { CdsAnswerComponent } from './answer/answer.component';
import { CdsActionAgentHandoffComponent } from './cds-action-agent-handoff/cds-action-agent-handoff.component';
import { CdsActionAskgptV2Component } from './cds-action-askgpt-v2/cds-action-askgpt-v2.component';
import { AddkbDialogComponent } from './cds-action-askgpt/addkb-dialog/addkb-dialog.component';
import { CdsActionAskgptComponent } from './cds-action-askgpt/cds-action-askgpt.component';
import { CdsActionAssignVariableV2Component } from './cds-action-assign-variable-v2/cds-action-assign-variable-v2.component';
import { OperandV2Component } from './cds-action-assign-variable-v2/operand/operand.component';
import { OperationV2Component } from './cds-action-assign-variable-v2/operation/operation.component';
import { OperatorV2Component } from './cds-action-assign-variable-v2/operator/operator.component';
import { CdsActionAssignVariableComponent } from './cds-action-assign-variable/cds-action-assign-variable.component';
import { OperandComponent } from './cds-action-assign-variable/operand/operand.component';
import { OperationComponent } from './cds-action-assign-variable/operation/operation.component';
import { OperatorComponent } from './cds-action-assign-variable/operator/operator.component';
import { CdsActionCaptureUserReplyComponent } from './cds-action-capture-user-reply/cds-action-capture-user-reply.component';
import { CdsActionChangeDepartmentComponent } from './cds-action-change-department/cds-action-change-department.component';
import { CdsActionCloseComponent } from './cds-action-close/cds-action-close.component';
import { CdsActionCodeComponent } from './cds-action-code/cds-action-code.component';
import { CdsActionCustomerioComponent } from './cds-action-customerio/cds-action-customerio.component';
import { CdsActionDeleteVariableComponent } from './cds-action-delete-variable/cds-action-delete-variable.component';
import { CdsActionDescriptionComponent } from './cds-action-description/cds-action-description.component';
import { CdsActionEmailComponent } from './cds-action-email/cds-action-email.component';
import { AttributesDialogComponent } from './cds-action-gpt-task/attributes-dialog/attributes-dialog.component';
import { CdsActionGPTTaskComponent } from './cds-action-gpt-task/cds-action-gpt-task.component';
import { CdsActionHideMessageComponent } from './cds-action-hide-message/cds-action-hide-message.component';
import { CdsActionHubspotComponent } from './cds-action-hubspot/cds-action-hubspot.component';
import { CdsActionIntentComponent } from './cds-action-intent/cds-action-intent.component';
import { BaseConditionRowComponent } from './cds-action-json-condition/base-condition-row/base-condition-row.component';
import { BaseFilterComponent } from './cds-action-json-condition/base-filter/base-filter.component';
import { CdsActionJsonConditionComponent } from './cds-action-json-condition/cds-action-json-condition.component';
import { CdsActionMakeComponent } from './cds-action-make/cds-action-make.component';
import { CdsActionOnlineAgentsComponent } from './cds-action-online-agents/cds-action-online-agents.component';
import { CdsActionOpenHoursComponent } from './cds-action-open-hours/cds-action-open-hours.component';
import { CdsActionQaplaComponent } from './cds-action-qapla/cds-action-qapla.component';
import { CdsActionReplaceBotV2Component } from './cds-action-replace-bot-v2/cds-action-replace-bot-v2.component';
import { CdsActionReplaceBotComponent } from './cds-action-replace-bot/cds-action-replace-bot.component';
import { CdsActionReplyComponent } from './cds-action-reply/cds-action-reply-v1/cds-action-reply.component';
import { CdsActionReplyButtonComponent } from './cds-action-reply/elements/cds-action-reply-button/cds-action-reply-button.component';
import { CdsActionReplyFrameComponent } from './cds-action-reply/elements/cds-action-reply-frame/cds-action-reply-frame.component';
import { CdsActionReplyGalleryComponent } from './cds-action-reply/elements/cds-action-reply-gallery/cds-action-reply-gallery.component';
import { CdsActionReplyImageComponent } from './cds-action-reply/elements/cds-action-reply-image/cds-action-reply-image.component';
import { CdsActionReplyRedirectComponent } from './cds-action-reply/elements/cds-action-reply-redirect/cds-action-reply-redirect.component';
import { CdsActionReplyTextComponent } from './cds-action-reply/elements/cds-action-reply-text/cds-action-reply-text.component';
import { CdsActionReplyToolsComponent } from './cds-action-reply/elements/cds-action-reply-tools/cds-action-reply-tools.component';
import { CdsActionWaitComponent } from './cds-action-wait/cds-action-wait.component';
import { CdsActionWebRequestComponent } from './cds-action-web-request/cds-action-web-request.component';
import { CdsActionWhatsappAttributeComponent } from './cds-action-whatsapp-attribute/cds-action-whatsapp-attribute.component';
import { CdsActionWhatsappStaticComponent } from './cds-action-whatsapp-static/cds-action-whatsapp-static.component';
import { CdsWhatsappReceiverComponent } from './cds-action-whatsapp-static/whatsapp-receiver/whatsapp-receiver.component';
import { FormEditAddComponent } from './form/form-edit-add/form-edit-add.component';
import { FormFieldComponent } from './form/form-field/form-field.component';
import { CdsFormComponent } from './form/form.component';
import { ModalWindowComponent } from './form/modal-window/modal-window.component';
import { CdsQuestionComponent } from './question/question.component';
import { BaseElementModule } from 'src/app/shared/base-element.module';
import { CdsActionBrevoComponent } from './cds-action-brevo/cds-action-brevo.component';
import { CdsActionN8nComponent } from './cds-action-n8n/cds-action-n8n.component';
import { CdsActionReplySettingsComponent } from './cds-action-reply/elements/cds-action-reply-settings/cds-action-reply-settings.component';
import { CdsActionGptAssistantComponent } from './cds-action-gpt-assistant/cds-action-gpt-assistant.component';
import { FormDataComponent } from './cds-action-web-request-v2/form-data/form-data.component';
import { CdsActionWebRequestV2Component } from './cds-action-web-request-v2/cds-action-web-request-v2.component';
import { CdsActionReplyV2Component } from './cds-action-reply/cds-action-reply-v2/cds-action-reply.component';
import { CdsActionOnlineAgentsV2Component } from './cds-action-online-agents-v2/cds-action-online-agents.component';
import { FilterPipe } from 'src/app/pipe/filter.pipe';

@NgModule({
  declarations: [
    //ACTIONS LIST
    CdsFormComponent,
      //FORM components
      FormFieldComponent,
      FormEditAddComponent,
      ModalWindowComponent,
    CdsQuestionComponent,
    CdsAnswerComponent,
    CdsActionDescriptionComponent,
    CdsActionReplyComponent,
    CdsActionReplyV2Component,
    CdsActionWaitComponent,
    CdsActionAgentHandoffComponent,
    CdsActionOnlineAgentsComponent,
    CdsActionOnlineAgentsV2Component,
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
      FormDataComponent,
    CdsActionMakeComponent,
    CdsActionHubspotComponent,
    CdsActionWhatsappAttributeComponent,
    CdsActionWhatsappStaticComponent,
    CdsWhatsappReceiverComponent,
    CdsActionAskgptComponent,
    CdsActionGPTTaskComponent,
    CdsActionCaptureUserReplyComponent,
    CdsActionGptAssistantComponent,
    CdsActionQaplaComponent,
    CdsActionCodeComponent,
    CdsActionAskgptV2Component,
    CdsActionCustomerioComponent,
    CdsActionBrevoComponent,
    CdsActionN8nComponent,
    // action REPLY elements: start //
    CdsActionReplyToolsComponent,
    CdsActionReplyTextComponent,
    CdsActionReplyImageComponent,
    CdsActionReplyFrameComponent,
    CdsActionReplyRedirectComponent,
    CdsActionReplyGalleryComponent,
    CdsActionReplyButtonComponent,
    CdsActionReplySettingsComponent,
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
    // BaseConditionRowComponent,
    BaseFilterComponent,
    // VariableListComponent,
    // action JSON-CONDITION elements: end //
    // action ASKGPT elements: start //
    AddkbDialogComponent,
    // action ASKGPT elements: end //
    // action GptTask elements: start //
    AttributesDialogComponent,
    FormDataComponent,
    // action GptTask elements: end //

    //PIPES
    FilterPipe
  ],
  imports: [
    CommonModule,
    TranslateModule,
    MaterialModule,
    SharedModule,
    CdsBaseElementModule,
    BaseElementModule
  ],
  exports:[
    //ACTIONS LIST
    CdsFormComponent,
      //FORM components
      FormFieldComponent,
      FormEditAddComponent,
      ModalWindowComponent,
    CdsQuestionComponent,
    CdsAnswerComponent,
    CdsActionDescriptionComponent,
    CdsActionReplyComponent,
    CdsActionReplyV2Component,
    CdsActionWaitComponent,
    CdsActionAgentHandoffComponent,
    CdsActionOnlineAgentsComponent,
    CdsActionOnlineAgentsV2Component,
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
    CdsActionGptAssistantComponent,
    CdsActionCaptureUserReplyComponent,
    CdsActionQaplaComponent,
    CdsActionCodeComponent,
    CdsActionAskgptV2Component,
    CdsActionCustomerioComponent,
    CdsActionBrevoComponent,
    CdsActionN8nComponent,
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
    // VariableListComponent,
    // action JSON-CONDITION elements: end //
    // action ASKGPT elements: start //
    AddkbDialogComponent,
    // action ASKGPT elements: end //
    // action GptTask elements: start //
    AttributesDialogComponent,
    // action GptTask elements: end //

    //PIPES
    FilterPipe
  ]
})
export class CdsActionsModule { }

