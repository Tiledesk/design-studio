import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { LoadingSpinnerComponent } from '../ui/loading-spinner/loading-spinner.component';
import { NotificationMessageComponent } from '../ui/notification-message/notification-message.component';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { DirectivesModule } from '../_directives/directives';
// import { NavbarComponent } from '../components/navbar/navbar.component';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule
    // DirectivesModule
  ],
  declarations: [
    LoadingSpinnerComponent,
    NotificationMessageComponent
  ],
  exports: [
    LoadingSpinnerComponent,
    NotificationMessageComponent,
    // TranslateModule,
    // DirectivesModule
  ],
})
export class SharedModule { }
