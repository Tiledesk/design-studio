import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CdsDashboardComponent } from './chatbot-design-studio/cds-dashboard/cds-dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { AppComponent } from './app.component';

const routes: Routes = [
  // -----------------------------------------
  // NEW  replace the path ...createfaq and ...editfaq
  // -----------------------------------------

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  // { path: 'project/', component: CdsDashboardComponent, canActivate:[AuthGuard] },
  { path: 'home', component: AppComponent },

  { path: 'project/:projectid/cds/:faqkbid', component: CdsDashboardComponent, canActivate:[AuthGuard] },
  { path: 'project/:projectid/cds/:faqkbid/intent/:intent_id', component: CdsDashboardComponent, canActivate:[AuthGuard] },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
