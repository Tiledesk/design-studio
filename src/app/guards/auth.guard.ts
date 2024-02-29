import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { UserModel } from 'src/chat21-core/models/user';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  user: UserModel;

  constructor(
    private appStorageService: AppStorageService,
    private tiledeskAuthService: TiledeskAuthService,
  ){ }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    
    const url = state.url;
    const _url = route['_routerState'].url

    const queryParams = route.queryParams['jwt']
    // if(!queryParams){
    //   return false
    // }
    const storedTiledeskoken = localStorage.getItem('tiledesk_token')
    if(!queryParams && !storedTiledeskoken){
      //goToSignIn Dashboard
      // localStorage.setItem('dshbrd----'+'wannago', state.url)
      return false
    }    

    var isAuthenticated = await this.tiledeskAuthService.isLoggedIn(); 
    if (!isAuthenticated) { 
      //goToSignIn Dashboard
      return false
    } 
    return isAuthenticated; 

  }
  
}
