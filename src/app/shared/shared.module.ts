import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { LoadingSpinnerComponent } from '../ui/loading-spinner/loading-spinner.component';
import { NotificationMessageComponent } from '../ui/notification-message/notification-message.component';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CdsSplashScreenComponent } from '../chatbot-design-studio/cds-dashboard/utils/cds-splash-screen/cds-splash-screen.component';
import { SatPopoverModule } from '@ncstate/sat-popover';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { NgSelectModule } from '@ng-select/ng-select';
// import { DirectivesModule } from '../_directives/directives';
// import { NavbarComponent } from '../components/navbar/navbar.component';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    // SatPopoverModule,
    // PickerModule
    // DirectivesModule
  ],
  declarations: [
    LoadingSpinnerComponent,
    NotificationMessageComponent,
    CdsSplashScreenComponent
  ],
  exports: [
    LoadingSpinnerComponent,
    NotificationMessageComponent,
    CdsSplashScreenComponent,

    FormsModule,
    ReactiveFormsModule,
    SatPopoverModule,
    PickerModule,
    NgSelectModule
    // DirectivesModule
  ],
})
export class SharedModule { }
