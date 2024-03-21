import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CDSMenuComponent } from '../chatbot-design-studio/cds-base-element/menu/menu.component';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from './material.module';
import { CDSTextComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/text/text.component';
import { CDSTextareaComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/textarea/textarea.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { SatPopoverModule } from '@ncstate/sat-popover';
import { SharedModule } from './shared.module';
import { VariableListComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/actions/list/cds-action-json-condition/variable-list/variable-list.component';
import { DialogComponent } from '../chatbot-design-studio/cds-base-element/dialog/dialog.component';



@NgModule({
  declarations: [
    CDSMenuComponent,

    CDSTextComponent,
    CDSTextareaComponent,
    DialogComponent,
    
    VariableListComponent
  ],
  imports: [
    CommonModule,
    TranslateModule,
    MaterialModule,
    SharedModule
  ],
  exports:[
    CDSMenuComponent,

    CDSTextComponent,
    CDSTextareaComponent,
    DialogComponent,
    
    VariableListComponent
  ],
})
export class CdsBaseElementModule { }
