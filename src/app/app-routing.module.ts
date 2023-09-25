import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CdsDashboardComponent } from './chatbot-design-studio/cds-dashboard/cds-dashboard.component';

const routes: Routes = [
  // -----------------------------------------
  // NEW  replace the path ...createfaq and ...editfaq
  // -----------------------------------------

  { path: '', redirectTo: 'project/:projectid/cds/:faqkbid', pathMatch: 'full' },

  { path: 'project/:projectid/cds/:faqkbid', component: CdsDashboardComponent },
  { path: 'project/:projectid/cds/:faqkbid/intent/:intent_id', component: CdsDashboardComponent },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
