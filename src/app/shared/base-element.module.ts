import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from './material.module';
import { CDSTextComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/text/text.component';
import { CDSTextareaComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/textarea/textarea.component';
import { SharedModule } from './shared.module';
import { VariableListComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/actions/list/cds-action-json-condition/variable-list/variable-list.component';
import { CdsConnectorComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/cds-connector/cds-connector.component';
import { CDSDelaySliderComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/delay-slider/delay-slider.component';
import { CDSElementFromUrlComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/element-from-url/element-from-url.component';
import { HeightSliderComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/height-slider/height-slider.component';
import { CDSImageUploadComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/image-upload/image-upload.component';
import { CDSAudioUploadComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/audio-upload/audio-upload.component';
import { CDSDelayTextComponent } from '../chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/delay-text/delay-text.component';



@NgModule({
  declarations: [
    //BASE-ELEMENT
    CdsConnectorComponent,
    CDSDelaySliderComponent,
    CDSDelayTextComponent,
    CDSElementFromUrlComponent,
    CDSImageUploadComponent,
    CDSAudioUploadComponent,
    CDSTextComponent,
    CDSTextareaComponent,
    HeightSliderComponent,
    
    VariableListComponent,

  ],
  imports: [
    CommonModule,
    TranslateModule,
    MaterialModule,
    SharedModule
  ],
  exports:[
    //BASE-ELEMENT
    CdsConnectorComponent,
    CDSDelaySliderComponent,
    CDSDelayTextComponent,
    CDSElementFromUrlComponent,
    CDSImageUploadComponent,
    CDSAudioUploadComponent,
    CDSTextComponent,
    CDSTextareaComponent,
    HeightSliderComponent,
    
    VariableListComponent,

  ],
})
export class BaseElementModule { }
