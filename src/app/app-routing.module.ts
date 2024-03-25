import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CdsDashboardComponent } from './chatbot-design-studio/cds-dashboard/cds-dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { AppComponent } from './app.component';
import { RoleGuard } from './guards/role.guard';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { HomeComponent } from './components/home/home.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

const routes: Routes = [

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  // { path: 'project/', component: CdsDashboardComponent, canActivate:[AuthGuard] },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard]},

  // { path: 'project/:projectid/chatbot/:faqkbid', component: CdsDashboardComponent, canActivate:[AuthGuard, RoleGuard] },
  // { path: 'project/:projectid/chatbot/:faqkbid/intent/:intent_id', component: CdsDashboardComponent, canActivate:[AuthGuard, RoleGuard] },

  { path: 'project/unauthorized', component: UnauthorizedComponent },


  { path: 'project/:projectid/chatbot/:faqkbid', 
    loadChildren: () => import('./chatbot-design-studio/cds-dashboard/cds-dashboard.module').then( m => m.CdsDashboardModule),
    canActivate:[AuthGuard, RoleGuard]
  },

    // Wildcard route for a 404 page
  { path: '**', component: NotFoundComponent },
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
