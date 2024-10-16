import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { ProjectService } from '../services/projects.service';
import { ProjectUser } from '../models/project-user';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

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
    private router: Router
  ){ }

  async canActivate( route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    
    const url = state.url;
    const _url = route['_routerState'].url

    this.roles = route.data[0].roles
    /** CHECK USER IS LOGGED IN */
    const queryParams = route.queryParams['jwt']
    
    const storedTiledeskoken = localStorage.getItem('tiledesk_token')
    if(!queryParams && !storedTiledeskoken){
      //goToSignIn Dashboard
      return false
    }
    var isAuthenticated = await this.tiledeskAuthService.isLoggedIn(); 
    if(!isAuthenticated){
      return false
    }


    /** CHECK USER IS IN CURRENT PROJET */
    const projectId= route.params.projectid
    const user = this.tiledeskAuthService.getCurrentUser()
    //step 1: check if user is in project as a projectUser
    const userIsInProject = await this.getProjectUserInProject(projectId, user.uid) 
    //step 2: check if projectUser has the correct enabled role for current path
    const roleEnabled = this.roles.includes(this.projectUser.role);
    if(!userIsInProject || !roleEnabled){
      this.router.navigate([`project/unauthorized`]);
      return false
    }
    return true;
  }



  getProjectUserInProject(projectId: string, userId: string): Promise<boolean>{
    return new Promise((resolve, reject)=> {
      this.projectsService.getProjectUserByUserId(projectId, userId).subscribe({ next: (projectUser: ProjectUser) => {
        this.projectUser = projectUser
        resolve(true)
      }, error: (error)=> {
          this.logger.error('[ROLE-GUARD] getProjectUserRole --> ERROR:', error)
          resolve(false)
      }})
    })
  }
  
}
