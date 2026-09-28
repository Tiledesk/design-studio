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
    canActivate:[AuthGuard, RoleGuard],
    data: [ { roles: ['owner', 'admin']}]
  },

  /** Sola lettura: lo stesso design studio, su un flusso che non si puo' modificare.
   *  Serve a guardare una release gia' pubblicata, che lato server e' un chatbot come
   *  gli altri, quindi `:faqkbid` qui e' l'id della release.
   *
   *  E' una rotta a se' e non un parametro di query sulla rotta dell'editor: il modo
   *  deve stare nell'identita' dell'URL. Un `?preview=1` si perde alla prima
   *  navigazione interna che non lo ripropaga, e si finirebbe a modificare un flusso
   *  pubblicato senza accorgersene. */
  { path: 'project/:projectid/preview/:faqkbid',
    loadChildren: () => import('./chatbot-design-studio/cds-dashboard/cds-dashboard.module').then( m => m.CdsDashboardModule),
    canActivate:[AuthGuard, RoleGuard],
    data: [ { roles: ['owner', 'admin'], readOnly: true }]
  },

    // Wildcard route for a 404 page
  { path: '**', component: NotFoundComponent },
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
