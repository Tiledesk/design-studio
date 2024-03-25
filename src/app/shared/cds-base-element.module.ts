import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CDSMenuComponent } from '../chatbot-design-studio/cds-base-element/menu/menu.component';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from './material.module';
import { SharedModule } from './shared.module';
import { DialogComponent } from '../chatbot-design-studio/cds-base-element/dialog/dialog.component';
import { AttributesComponent } from '../chatbot-design-studio/cds-base-element/attributes/attributes.component';
import { SelectComponent } from '../chatbot-design-studio/cds-base-element/select/select.component';
import { DialogYesNoComponent } from '../chatbot-design-studio/cds-base-element/dialog-yes-no/dialog-yes-no.component';
import { CDSFilterComponent } from '../chatbot-design-studio/cds-base-element/filter/filter.component';
import { CDSRadioButtonComponent } from '../chatbot-design-studio/cds-base-element/radio-button/radio-button.component';
import { CDSToogleComponent } from '../chatbot-design-studio/cds-base-element/toogle/toogle.component';
import { TextEditableDivComponent } from '../chatbot-design-studio/cds-base-element/text-editable-div/text-editable-div.component';
import { BaseElementModule } from './base-element.module';
import { BaseConditionRowComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/actions/list/cds-action-json-condition/base-condition-row/base-condition-row.component';



@NgModule({
  declarations: [
    AttributesComponent,
    DialogComponent,
    DialogYesNoComponent,
    CDSFilterComponent,
    BaseConditionRowComponent,
    CDSMenuComponent,
    CDSRadioButtonComponent,
    CDSToogleComponent,
    SelectComponent,
    TextEditableDivComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    MaterialModule,
    SharedModule,
    BaseElementModule,
  ],
  exports:[
    AttributesComponent,
    DialogComponent,
    DialogYesNoComponent,
    CDSFilterComponent,
    BaseConditionRowComponent,
    CDSMenuComponent,
    CDSRadioButtonComponent,
    CDSToogleComponent,
    SelectComponent,
    TextEditableDivComponent,
  ],
})
export class CdsBaseElementModule { }
