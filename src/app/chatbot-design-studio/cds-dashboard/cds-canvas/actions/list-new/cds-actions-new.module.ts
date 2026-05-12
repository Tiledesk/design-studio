import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/shared/material.module';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { CdsBaseElementModule } from 'src/app/shared/cds-base-element.module';
import { CdsAnswerComponent } from './answer/answer-new.component';
import { CdsActionAgentHandoffNewComponent } from './cds-action-agent-handoff/cds-action-agent-handoff-new.component';
import { CdsActionAskgptV2Component } from './cds-action-askgpt-v2/cds-action-askgpt-v2-new.component';
import { AddkbDialogComponent } from './cds-action-askgpt/addkb-dialog/addkb-dialog-new.component';
import { CdsActionAskgptNewComponent } from './cds-action-askgpt/cds-action-askgpt-new.component';
import { CdsActionAssignVariableV2Component } from './cds-action-assign-variable-v2/cds-action-assign-variable-v2-new.component';
import { OperandV2Component } from './cds-action-assign-variable-v2/operand/operand-new.component';
import { OperationV2Component } from './cds-action-assign-variable-v2/operation/operation-new.component';
import { OperatorV2Component } from './cds-action-assign-variable-v2/operator/operator-new.component';
import { CdsActionAssignVariableNewComponent } from './cds-action-assign-variable/cds-action-assign-variable-new.component';
import { OperandComponent } from './cds-action-assign-variable/operand/operand-new.component';
import { OperationComponent } from './cds-action-assign-variable/operation/operation-new.component';
import { OperatorComponent } from './cds-action-assign-variable/operator/operator-new.component';
import { CdsActionCaptureUserReplyNewComponent } from './cds-action-capture-user-reply/cds-action-capture-user-reply-new.component';
import { CdsActionIterationNewComponent } from './cds-action-iteration/cds-action-iteration-new.component';
import { CdsActionChangeDepartmentNewComponent } from './cds-action-change-department/cds-action-change-department-new.component';
import { CdsActionCloseNewComponent } from './cds-action-close/cds-action-close-new.component';
import { CdsActionCodeNewComponent } from './cds-action-code/cds-action-code-new.component';
import { CdsActionCustomerioNewComponent } from './cds-action-customerio/cds-action-customerio-new.component';
import { CdsActionDeleteVariableNewComponent } from './cds-action-delete-variable/cds-action-delete-variable-new.component';
import { CdsActionDescriptionNewComponent } from './cds-action-description/cds-action-description-new.component';
import { CdsActionEmailNewComponent } from './cds-action-email/cds-action-email-new.component';
import { AttributesDialogComponent } from './cds-action-gpt-task/attributes-dialog/attributes-dialog-new.component';
import { CdsActionGPTTaskNewComponent } from './cds-action-gpt-task/cds-action-gpt-task-new.component';
import { CdsActionHideMessageNewComponent } from './cds-action-hide-message/cds-action-hide-message-new.component';
import { CdsActionHubspotNewComponent } from './cds-action-hubspot/cds-action-hubspot-new.component';
import { CdsActionIntentNewComponent } from './cds-action-intent/cds-action-intent-new.component';
import { BaseFilterComponent } from './cds-action-json-condition/base-filter/base-filter-new.component';
import { BaseConditionRowComponent } from './cds-action-json-condition/base-condition-row/base-condition-row-new.component';
import { VariableListComponent as VariableListNewComponent } from './cds-action-json-condition/variable-list/variable-list-new.component';
import { CdsActionJsonConditionNewComponent } from './cds-action-json-condition/cds-action-json-condition-new.component';
import { CdsActionMakeNewComponent } from './cds-action-make/cds-action-make-new.component';
import { CdsActionOnlineAgentsNewComponent } from './cds-action-online-agents/cds-action-online-agents-new.component';
import { CdsActionOpenHoursNewComponent } from './cds-action-open-hours/cds-action-open-hours-new.component';
import { CdsActionQaplaNewComponent } from './cds-action-qapla/cds-action-qapla-new.component';
import { CdsActionReplaceBotV2Component } from './cds-action-replace-bot/cds-action-replace-bot-v2/cds-action-replace-bot-v2-new.component';
import { CdsActionReplaceBotV3Component } from './cds-action-replace-bot/cds-action-replace-bot-v3/cds-action-replace-bot-v3-new.component';
import { CdsActionReplaceBotNewComponent } from './cds-action-replace-bot/cds-action-replace-bot-v1/cds-action-replace-bot-new.component';
import { CdsActionReplyNewComponent } from './cds-action-reply/cds-action-reply-v1/cds-action-reply-new.component';
import { CdsActionReplyButtonNewComponent } from './cds-action-reply/elements/cds-action-reply-button/cds-action-reply-button-new.component';
import { CdsActionReplyFrameNewComponent } from './cds-action-reply/elements/cds-action-reply-frame/cds-action-reply-frame-new.component';
import { CdsActionReplyGalleryNewComponent } from './cds-action-reply/elements/cds-action-reply-gallery/cds-action-reply-gallery-new.component';
import { CdsActionReplyImageNewComponent } from './cds-action-reply/elements/cds-action-reply-image/cds-action-reply-image-new.component';
import { CdsActionReplyRedirectNewComponent } from './cds-action-reply/elements/cds-action-reply-redirect/cds-action-reply-redirect-new.component';
import { CdsActionReplyTextNewComponent } from './cds-action-reply/elements/cds-action-reply-text/cds-action-reply-text-new.component';
import { CdsActionReplyToolsNewComponent } from './cds-action-reply/elements/cds-action-reply-tools/cds-action-reply-tools-new.component';
import { CdsActionWaitNewComponent } from './cds-action-wait/cds-action-wait-new.component';
import { CdsActionWebRequestNewComponent } from './cds-action-web-request/cds-action-web-request-new.component';
import { CdsActionWhatsappAttributeNewComponent } from './cds-action-whatsapp-attribute/cds-action-whatsapp-attribute-new.component';
import { CdsActionWhatsappStaticNewComponent } from './cds-action-whatsapp-static/cds-action-whatsapp-static-new.component';
import { CdsWhatsappReceiverComponent } from './cds-action-send-whatsapp/whatsapp-receiver/whatsapp-receiver-new.component';
import { FormEditAddComponent } from './form/form-edit-add/form-edit-add-new.component';
import { FormFieldNewComponent } from './form/form-field/form-field-new.component';
import { CdsFormComponent } from './form/form-new.component';
import { ModalWindowComponent } from './form/modal-window/modal-window-new.component';
import { CdsQuestionComponent } from './question/question-new.component';
import { BaseElementModule } from 'src/app/shared/base-element.module';
import { CdsActionBrevoNewComponent } from './cds-action-brevo/cds-action-brevo-new.component';
import { CdsActionN8nComponent } from './cds-action-n8n/cds-action-n8n-new.component';
import { CdsReplyControlsNewComponent } from './cds-action-reply/elements/cds-reply-controls/cds-reply-controls-new.component';
import { CdsActionReplySettingsNewComponent } from './cds-action-reply/elements/cds-action-reply-settings/cds-action-reply-settings-new.component';
import { CdsActionGptAssistantNewComponent } from './cds-action-gpt-assistant/cds-action-gpt-assistant-new.component';
import { FormDataComponent } from './cds-action-web-request-v2/form-data/form-data-new.component';
import { CdsActionWebRequestV2Component } from './cds-action-web-request-v2/cds-action-web-request-v2-new.component';
import { CdsActionReplyV2Component } from './cds-action-reply/cds-action-reply-v2/cds-action-reply-new.component';
import { CdsActionOnlineAgentsV2Component } from './cds-action-online-agents-v2/cds-action-online-agents-new.component';
import { CdsActionAddTagNewComponent } from './cds-action-add-tag/cds-action-add-tag-new.component';
import { CdsActionLeadUpdateNewComponent } from './cds-action-lead-update/cds-action-lead-update-new.component';
import { CdsActionClearTranscriptNewComponent } from './cds-action-clear-transcript/cds-action-clear-transcript-new.component';
import { CdsActionMoveUnassignedNewComponent } from './cds-action-move-unassigned/cds-action-move-unassigned-new.component';
import { CdsActionConnectBlockNewComponent } from './cds-action-connect-block/cds-action-connect-block-new.component';
import { CdsActionSendWhatsappNewComponent } from './cds-action-send-whatsapp/cds-action-send-whatsapp-new.component';
import { CdsActionAiPromptNewComponent } from './cds-action-ai-prompt/cds-action-ai-prompt-new.component';
import { AttributesDialogAiPromptComponent } from './cds-action-ai-prompt/attributes-dialog/attributes-dialog-new.component';
import { McpServersDialogComponent } from './cds-action-ai-prompt/mcp-servers-dialog/mcp-servers-dialog-new.component';
import { McpServerEditDialogComponent } from './cds-action-ai-prompt/mcp-server-edit-dialog/mcp-server-edit-dialog-new.component';
import { CdsActionWebResponseNewComponent } from './cds-action-web-response/cds-action-web-response-new.component';
import { CdsActionReplyJsonbuttonsNewComponent } from './cds-action-reply/elements/cds-action-reply-jsonbuttons/cds-action-reply-jsonbuttons-new.component';
import { CdsActionAddKbContentNewComponent } from './cds-action-add-kb-content/cds-action-add-kb-content-new.component';
import { CdsActionFlowLogNewComponent } from './cds-action-flow-log/cds-action-flow-log-new.component';
import { CdsActionAiConditionNewComponent } from './cds-action-ai-condition/cds-action-ai-condition-new.component';
import { AttributesDialogAiConditionComponent } from './cds-action-ai-condition/attributes-dialog/attributes-dialog-new.component';
import { AiConditionComponent } from './cds-action-ai-condition/ai-condition/ai-condition-new.component';
import { FindPipe } from 'src/app/pipe/find.pipe';

@NgModule({
  declarations: [
    //ACTIONS LIST
    CdsFormComponent,
      //FORM components
      FormFieldNewComponent,
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
    CdsReplyControlsNewComponent,
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
    BaseConditionRowComponent,
    BaseFilterComponent,
    VariableListNewComponent,
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
      FormFieldNewComponent,
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
    CdsReplyControlsNewComponent,
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
    BaseFilterComponent,
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

    CdsActionAddKbContentNewComponent,
    CdsActionFlowLogNewComponent
  ]
})
export class CdsActionsNewModule { }

