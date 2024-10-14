import { Injectable } from '@angular/core';
import {
  Router, Resolve,
  RouterStateSnapshot,
  ActivatedRouteSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImagePreloaderResolver implements Resolve<boolean> {

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    
    const DOC_BASE_URL = 'assets/images/doc/'
    
    const imageUrls = [
      DOC_BASE_URL+'AGENT.png',
      DOC_BASE_URL+'ASKGPT.png',
      DOC_BASE_URL+'ASSIGN_VARIABLE.png',
      DOC_BASE_URL+'BREVO.png',
      DOC_BASE_URL+'CAPTURE_USER_REPLY.png',
      DOC_BASE_URL+'CHANGE_DEPARTMENT.png',
      DOC_BASE_URL+'CLEAR_TRANSCRIPT.png',
      DOC_BASE_URL+'CLOSE.png',
      DOC_BASE_URL+'CODE.png',
      DOC_BASE_URL+'CONDITION.png',
      DOC_BASE_URL+'CUSTOMERIO.png',
      DOC_BASE_URL+'DELETE_VARIABLE.png',
      DOC_BASE_URL+'EMAIL.png',
      DOC_BASE_URL+'GPT_ASSISTANT.png',
      DOC_BASE_URL+'GPT_TASK.png',
      DOC_BASE_URL+'HIDE_MESSAGE.png',
      DOC_BASE_URL+'HUBSPOT.png',
      DOC_BASE_URL+'JSON_CONDITION.png',
      DOC_BASE_URL+'LEAD_UPDATE.png',
      DOC_BASE_URL+'MAKE.png',
      DOC_BASE_URL+'MOVE_TO_UNASSIGNED.png',
      DOC_BASE_URL+'N8N.png',
      DOC_BASE_URL+'ONLINE_AGENTS.png',
      DOC_BASE_URL+'OPEN_HOURS.png',
      DOC_BASE_URL+'QAPLA.png',
      DOC_BASE_URL+'RANDOM_REPLY.png',
      DOC_BASE_URL+'REPLACE_BOT.png',
      DOC_BASE_URL+'REPLY.png',
      DOC_BASE_URL+'WAIT.png',
      DOC_BASE_URL+'WEB_REQUESTV2.png',
      DOC_BASE_URL+'WHATSAPP_ATTRIBUTE.png',
      DOC_BASE_URL+'WHATSAPP_STATIC.png',

      
    ];
    
    return Promise.all(
      imageUrls.map(url => this.preloadImage(url))
    ).then(() => { return true});
  }

  private preloadImage(url: string): Promise<true> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      
      img.onload = () => resolve(true);
      img.onerror = () => resolve(true);
    });
  }

}
