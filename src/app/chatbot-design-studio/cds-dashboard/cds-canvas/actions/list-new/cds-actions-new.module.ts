import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { CdsAnswerComponent } from './answer/answer.component';
import { CdsActionAgentHandoffNewComponent } from './cds-action-agent-handoff/cds-action-agent-handoff.component';
import { CdsActionAskgptV2Component } from './cds-action-askgpt-v2/cds-action-askgpt-v2.component';
import { AddkbDialogComponent } from './cds-action-askgpt/addkb-dialog/addkb-dialog.component';
import { CdsActionAskgptNewComponent } from './cds-action-askgpt/cds-action-askgpt.component';
import { CdsActionAssignVariableV2Component } from './cds-action-assign-variable-v2/cds-action-assign-variable-v2.component';
import { OperandV2Component } from './cds-action-assign-variable-v2/operand/operand.component';
import { OperationV2Component } from './cds-action-assign-variable-v2/operation/operation.component';
import { OperatorV2Component } from './cds-action-assign-variable-v2/operator/operator.component';
import { CdsActionAssignVariableNewComponent } from './cds-action-assign-variable/cds-action-assign-variable.component';
import { OperandComponent } from './cds-action-assign-variable/operand/operand.component';
import { OperationComponent } from './cds-action-assign-variable/operation/operation.component';
import { OperatorComponent } from './cds-action-assign-variable/operator/operator.component';
import { CdsActionCaptureUserReplyNewComponent } from './cds-action-capture-user-reply/cds-action-capture-user-reply.component';
import { CdsActionIterationNewComponent } from './cds-action-iteration/cds-action-iteration.component';
import { CdsActionChangeDepartmentNewComponent } from './cds-action-change-department/cds-action-change-department.component';
import { CdsActionCloseNewComponent } from './cds-action-close/cds-action-close.component';
import { CdsActionCodeNewComponent } from './cds-action-code/cds-action-code.component';
import { CdsActionCustomerioNewComponent } from './cds-action-customerio/cds-action-customerio.component';
import { CdsActionDeleteVariableNewComponent } from './cds-action-delete-variable/cds-action-delete-variable.component';
import { CdsActionDescriptionNewComponent } from './cds-action-description/cds-action-description.component';
import { CdsActionEmailNewComponent } from './cds-action-email/cds-action-email.component';
import { AttributesDialogComponent } from './cds-action-gpt-task/attributes-dialog/attributes-dialog.component';
import { CdsActionGPTTaskNewComponent } from './cds-action-gpt-task/cds-action-gpt-task.component';
import { CdsActionHideMessageNewComponent } from './cds-action-hide-message/cds-action-hide-message.component';
import { CdsActionHubspotNewComponent } from './cds-action-hubspot/cds-action-hubspot.component';
import { CdsActionIntentNewComponent } from './cds-action-intent/cds-action-intent.component';
import { BaseConditionRowComponent } from './cds-action-json-condition/base-condition-row/base-condition-row.component';
import { BaseFilterComponent } from './cds-action-json-condition/base-filter/base-filter.component';
import { CdsActionJsonConditionNewComponent } from './cds-action-json-condition/cds-action-json-condition.component';
import { CdsActionMakeNewComponent } from './cds-action-make/cds-action-make.component';
import { CdsActionOnlineAgentsNewComponent } from './cds-action-online-agents/cds-action-online-agents.component';
import { CdsActionOpenHoursNewComponent } from './cds-action-open-hours/cds-action-open-hours.component';
import { CdsActionQaplaNewComponent } from './cds-action-qapla/cds-action-qapla.component';
import { CdsActionReplaceBotV2Component } from './cds-action-replace-bot/cds-action-replace-bot-v2/cds-action-replace-bot-v2.component';
import { CdsActionReplaceBotV3Component } from './cds-action-replace-bot/cds-action-replace-bot-v3/cds-action-replace-bot-v3.component';
import { CdsActionReplaceBotNewComponent } from './cds-action-replace-bot/cds-action-replace-bot-v1/cds-action-replace-bot.component';
import { CdsActionReplyNewComponent } from './cds-action-reply/cds-action-reply-v1/cds-action-reply.component';
import { CdsActionReplyButtonNewComponent } from './cds-action-reply/elements/cds-action-reply-button/cds-action-reply-button.component';
import { CdsActionReplyFrameNewComponent } from './cds-action-reply/elements/cds-action-reply-frame/cds-action-reply-frame.component';
import { CdsActionReplyGalleryNewComponent } from './cds-action-reply/elements/cds-action-reply-gallery/cds-action-reply-gallery.component';
import { CdsActionReplyImageNewComponent } from './cds-action-reply/elements/cds-action-reply-image/cds-action-reply-image.component';
import { CdsActionReplyRedirectNewComponent } from './cds-action-reply/elements/cds-action-reply-redirect/cds-action-reply-redirect.component';
import { CdsActionReplyTextNewComponent } from './cds-action-reply/elements/cds-action-reply-text/cds-action-reply-text.component';
import { CdsActionReplyToolsNewComponent } from './cds-action-reply/elements/cds-action-reply-tools/cds-action-reply-tools.component';
import { CdsActionWaitNewComponent } from './cds-action-wait/cds-action-wait.component';
import { CdsActionWebRequestNewComponent } from './cds-action-web-request/cds-action-web-request.component';
import { CdsActionWhatsappAttributeNewComponent } from './cds-action-whatsapp-attribute/cds-action-whatsapp-attribute.component';
import { CdsActionWhatsappStaticNewComponent } from './cds-action-whatsapp-static/cds-action-whatsapp-static.component';
import { CdsWhatsappReceiverComponent } from './cds-action-send-whatsapp/whatsapp-receiver/whatsapp-receiver.component';
import { FormEditAddComponent } from './form/form-edit-add/form-edit-add.component';
import { FormFieldComponent } from './form/form-field/form-field.component';
import { CdsFormComponent } from './form/form.component';
import { ModalWindowComponent } from './form/modal-window/modal-window.component';
import { CdsQuestionComponent } from './question/question.component';
import { BaseElementModule } from 'src/app/shared/base-element.module';
import { CdsActionBrevoNewComponent } from './cds-action-brevo/cds-action-brevo.component';
import { CdsActionN8nComponent } from './cds-action-n8n/cds-action-n8n.component';
import { CdsActionReplySettingsNewComponent } from './cds-action-reply/elements/cds-action-reply-settings/cds-action-reply-settings.component';
import { CdsActionGptAssistantNewComponent } from './cds-action-gpt-assistant/cds-action-gpt-assistant.component';
import { FormDataComponent } from './cds-action-web-request-v2/form-data/form-data.component';
import { CdsActionWebRequestV2Component } from './cds-action-web-request-v2/cds-action-web-request-v2.component';
import { CdsActionReplyV2Component } from './cds-action-reply/cds-action-reply-v2/cds-action-reply.component';
import { CdsActionOnlineAgentsV2Component } from './cds-action-online-agents-v2/cds-action-online-agents.component';
import { CdsActionAddTagNewComponent } from './cds-action-add-tag/cds-action-add-tag.component';
import { CdsActionLeadUpdateNewComponent } from './cds-action-lead-update/cds-action-lead-update.component';
import { CdsActionClearTranscriptNewComponent } from './cds-action-clear-transcript/cds-action-clear-transcript.component';
import { CdsActionMoveUnassignedNewComponent } from './cds-action-move-unassigned/cds-action-move-unassigned.component';
import { CdsActionConnectBlockNewComponent } from './cds-action-connect-block/cds-action-connect-block.component';
import { CdsActionSendWhatsappNewComponent } from './cds-action-send-whatsapp/cds-action-send-whatsapp.component';
import { VariableCssClassPipe } from 'src/app/pipe/variablecssClass.pipe';
import { GetVariableNamePipe } from 'src/app/pipe/get-variable-name.pipe';
import { CdsActionAiPromptNewComponent } from './cds-action-ai-prompt/cds-action-ai-prompt.component';
import { AttributesDialogAiPromptComponent } from './cds-action-ai-prompt/attributes-dialog/attributes-dialog.component';
import { McpServersDialogComponent } from './cds-action-ai-prompt/mcp-servers-dialog/mcp-servers-dialog.component';
import { McpServerEditDialogComponent } from './cds-action-ai-prompt/mcp-server-edit-dialog/mcp-server-edit-dialog.component';
import { CdsActionWebResponseNewComponent } from './cds-action-web-response/cds-action-web-response.component';
import { CdsActionReplyJsonbuttonsNewComponent } from './cds-action-reply/elements/cds-action-reply-jsonbuttons/cds-action-reply-jsonbuttons.component';
import { CdsActionAddKbContentNewComponent } from './cds-action-add-kb-content/cds-action-add-kb-content.component';
import { CdsActionFlowLogNewComponent } from './cds-action-flow-log/cds-action-flow-log.component';
import { CdsActionAiConditionNewComponent } from './cds-action-ai-condition/cds-action-ai-condition.component';
import { AttributesDialogAiConditionComponent } from './cds-action-ai-condition/attributes-dialog/attributes-dialog.component';
import { AiConditionComponent } from './cds-action-ai-condition/ai-condition/ai-condition.component';
import { FindPipe } from 'src/app/pipe/find.pipe';

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
    CdsActionDescriptionNewComponent,
    CdsActionReplyNewComponent,
    CdsActionReplyV2Component,
    CdsActionWaitNewComponent,
    CdsActionAgentHandoffNewComponent,
    CdsActionOnlineAgentsNewComponent,
    CdsActionOnlineAgentsV2Component,
    CdsActionEmailNewComponent,
    CdsActionIntentNewComponent,
    CdsActionChangeDepartmentNewComponent,
    CdsActionCloseNewComponent,
    CdsActionOpenHoursNewComponent,
    CdsActionJsonConditionNewComponent,
    CdsActionDeleteVariableNewComponent,
    CdsActionReplaceBotNewComponent,
    CdsActionReplaceBotV2Component,
    CdsActionReplaceBotV3Component,
    CdsActionAssignVariableNewComponent,
    CdsActionAssignVariableV2Component,
    CdsActionHideMessageNewComponent,
    CdsActionWebRequestNewComponent,
    CdsActionWebRequestV2Component,
      FormDataComponent,
    CdsActionMakeNewComponent,
    CdsActionHubspotNewComponent,
    CdsActionWhatsappAttributeNewComponent,
    CdsActionWhatsappStaticNewComponent,
    CdsWhatsappReceiverComponent,
    CdsActionAskgptNewComponent,
    CdsActionGPTTaskNewComponent,
    CdsActionCaptureUserReplyNewComponent,
    CdsActionIterationNewComponent,
    CdsActionGptAssistantNewComponent,
    CdsActionQaplaNewComponent,
    CdsActionCodeNewComponent,
    CdsActionAskgptV2Component,
    CdsActionCustomerioNewComponent,
    CdsActionBrevoNewComponent,
    CdsActionN8nComponent,
    CdsActionAddTagNewComponent,
    CdsActionLeadUpdateNewComponent,
    // action REPLY elements: start //
    CdsActionReplyToolsNewComponent,
    CdsActionReplyTextNewComponent,
    CdsActionReplyImageNewComponent,
    CdsActionReplyFrameNewComponent,
    CdsActionReplyRedirectNewComponent,
    CdsActionReplyGalleryNewComponent,
    CdsActionReplyButtonNewComponent,
    CdsActionReplySettingsNewComponent,
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
    CdsActionClearTranscriptNewComponent,
    CdsActionMoveUnassignedNewComponent,
    CdsActionConnectBlockNewComponent,
    CdsActionSendWhatsappNewComponent,
    CdsActionAiPromptNewComponent,
    AttributesDialogAiPromptComponent,
    McpServersDialogComponent,
    McpServerEditDialogComponent,
    CdsActionAiConditionNewComponent,
    AttributesDialogAiConditionComponent,
    AiConditionComponent,
    // action Ai Prompt elements: end //
    CdsActionWebResponseNewComponent,

    //PIPES
    GetVariableNamePipe,
    VariableCssClassPipe,
    CdsActionReplyJsonbuttonsNewComponent,
    CdsActionAddKbContentNewComponent,
    CdsActionFlowLogNewComponent
    
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
    CdsActionDescriptionNewComponent,
    CdsActionReplyNewComponent,
    CdsActionReplyV2Component,
    CdsActionWaitNewComponent,
    CdsActionAgentHandoffNewComponent,
    CdsActionOnlineAgentsNewComponent,
    CdsActionOnlineAgentsV2Component,
    CdsActionEmailNewComponent,
    CdsActionIntentNewComponent,
    CdsActionChangeDepartmentNewComponent,
    CdsActionCloseNewComponent,
    CdsActionOpenHoursNewComponent,
    CdsActionJsonConditionNewComponent,
    CdsActionDeleteVariableNewComponent,
    CdsActionReplaceBotNewComponent,
    CdsActionReplaceBotV2Component,
    CdsActionReplaceBotV3Component,
    CdsActionAssignVariableNewComponent,
    CdsActionAssignVariableV2Component,
    CdsActionHideMessageNewComponent,
    CdsActionWebRequestNewComponent,
    CdsActionWebRequestV2Component,
    CdsActionMakeNewComponent,
    CdsActionHubspotNewComponent,
    CdsActionWhatsappAttributeNewComponent,
    CdsActionWhatsappStaticNewComponent,
    CdsWhatsappReceiverComponent,
    CdsActionAskgptNewComponent,
    CdsActionGPTTaskNewComponent,
    CdsActionGptAssistantNewComponent,
    CdsActionCaptureUserReplyNewComponent,
    CdsActionIterationNewComponent,
    CdsActionQaplaNewComponent,
    CdsActionCodeNewComponent,
    CdsActionAskgptV2Component,
    CdsActionCustomerioNewComponent,
    CdsActionBrevoNewComponent,
    CdsActionN8nComponent,
    CdsActionAddTagNewComponent,
    CdsActionLeadUpdateNewComponent,
    // action REPLY elements: start //
    CdsActionReplyToolsNewComponent,
    CdsActionReplyTextNewComponent,
    CdsActionReplyImageNewComponent,
    CdsActionReplyFrameNewComponent,
    CdsActionReplyRedirectNewComponent,
    CdsActionReplyGalleryNewComponent,
    CdsActionReplyButtonNewComponent,
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
    CdsActionClearTranscriptNewComponent,
    CdsActionMoveUnassignedNewComponent,
    CdsActionConnectBlockNewComponent,
    CdsActionSendWhatsappNewComponent,
    CdsActionAiPromptNewComponent,
    AttributesDialogAiPromptComponent,
    McpServersDialogComponent,
    McpServerEditDialogComponent,
    CdsActionAiConditionNewComponent,
    AttributesDialogAiConditionComponent,
    AiConditionComponent,
    // action Ai Prompt elements: end //
    CdsActionWebResponseNewComponent,
    
    //PIPES
    GetVariableNamePipe,
    VariableCssClassPipe,
    CdsActionAddKbContentNewComponent,
    CdsActionFlowLogNewComponent
  ]
})
export class CdsActionsNewModule { }

