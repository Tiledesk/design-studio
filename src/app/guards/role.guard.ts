import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { ProjectService } from '../services/projects.service';
import { ProjectUser } from '../models/project-user';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppConfigService } from '../services/app-config';
import { DashboardService } from '../services/dashboard.service';
import { freePlanLimitDate } from '../utils/util';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  private logger: LoggerService = LoggerInstance.getInstance();
  private roles: Array<string> = [];
  private projectUser: ProjectUser;

  constructor(
    private appStorageService: AppStorageService,
    private tiledeskAuthService: TiledeskAuthService,
    private projectsService: ProjectService,
    private router: Router,
    public appConfigService: AppConfigService,
    private dashboardService: DashboardService,
  ) { }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {

    const url = state.url;
    const _url = route['_routerState'].url

    this.roles = route.data[0].roles
    /** CHECK USER IS LOGGED IN */
    const queryParams = route.queryParams['jwt']

    const storedTiledeskoken = localStorage.getItem('tiledesk_token')
    if (!queryParams && !storedTiledeskoken) {
      //goToSignIn Dashboard
      return false
    }
    var isAuthenticated = await this.tiledeskAuthService.isLoggedIn();
    if (!isAuthenticated) {
      return false
    }


    /** CHECK USER IS IN CURRENT PROJET */
    const projectId = route.params.projectid
    const user = this.tiledeskAuthService.getCurrentUser()
    //step 1: check if user is in project as a projectUser
    // const userIsInProject = await this.getProjectUserInProject(projectId, user.uid)
    // console.log('[ROLE-GUARD] userIsInProject:', userIsInProject)
    const projectUser = await this.getProjects(projectId)
    console.log('[ROLE-GUARD] --->  projects:', projectUser)
    console.log('[ROLE-GUARD] --->  projectUser role:', projectUser.role)
   
   

    if (projectUser) {
      const project = projectUser.id_project
      console.log('[ROLE-GUARD] --->  project:', project)
      if (project) {
        const projectCreationDate = new Date(project.createdAt);
        if (projectCreationDate >= freePlanLimitDate) {
          console.log('[ROLE-GUARD] --->  projectCreationDate > freePlanLimitDate ')
          console.log('[ROLE-GUARD] --->  project.profile.type ', project.profile.type)
          console.log('[ROLE-GUARD] --->  project.trialExpired  ', project.trialExpired)
          if (project.profile.type === 'free' && project.trialExpired === true) {
            // let dashbordBaseUrl = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/'+ projectId + '/unauthorized-to-upgrade'
            let dashbordBaseUrl = ''
            if (projectUser.role === 'owner') {
              // dashbordBaseUrl = 'https://support-pre.tiledesk.com/dashboard' + '#/project/' + projectId + '/pricing/te'; // for test purpose
              dashbordBaseUrl =  this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + projectId + '/pricing/te';
              // return false
            } else {
              // dashbordBaseUrl = 'https://support-pre.tiledesk.com/dashboard' + '#/project/' + projectId + '/unauthorized-to-upgrade' // for test purpose
              dashbordBaseUrl = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + projectId + '/unauthorized-to-upgrade'
              // return false
            }
            console.log('dashbordBaseUrl', dashbordBaseUrl)
            window.open(dashbordBaseUrl, '_self').focus();
          }
        } else {
          console.log('[ROLE-GUARD] --->  projectCreationDate < freePlanLimitDate ')
        }
      }
    }

    //step 2: check if projectUser has the correct enabled role for current path
    const roleEnabled = this.roles.includes(projectUser.role);
    console.log('[ROLE-GUARD] roleEnabled:', roleEnabled)
    if (!projectUser || !roleEnabled) {
      this.router.navigate([`project/unauthorized`]);
      return false
    }
    return true;

  }



  getProjects(projectId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const storedToken = localStorage.getItem('tiledesk_token');
      this.projectsService.getProjects(storedToken).subscribe({
        
        next: (projectUser) => {
         const filteredProjectUsers = projectUser.filter(projectUser => projectUser.id_project._id === projectId)
          console.log('[ROLE-GUARD] ----> filteredProjects 2 <---- :',  filteredProjectUsers)
          resolve(filteredProjectUsers[0])
        }, error: (error) => {
          this.logger.error('[ROLE-GUARD] getProjectUserRole --> ERROR:', error)
          resolve(error)
        }
      })
    })
  }

  // getProjectUserInProject(projectId: string, userId: string): Promise<boolean> {
  //   return new Promise((resolve, reject) => {
  //     this.projectsService.getProjectUserByUserId(projectId, userId).subscribe({
  //       next: (projectUser: ProjectUser) => {
  //         this.projectUser = projectUser
  //         console.log('[ROLE-GUARD]  this.projectUser:', this.projectUser)
  //         resolve(true)
  //       }, error: (error) => {
  //         this.logger.error('[ROLE-GUARD] getProjectUserRole --> ERROR:', error)
  //         resolve(false)
  //       }
  //     })
  //   })
  // }

}
