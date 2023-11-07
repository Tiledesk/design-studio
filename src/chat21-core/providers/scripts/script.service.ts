import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({
  providedIn: 'root'
})
export class ScriptService {

  private scriptList: Array<{name: string, loaded: boolean, src: string}> = []
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public http: HttpClient,
  ) { }

  buildScriptArray(globalRemoteJSSrc: string){
    this.logger.log('[SCRIPT-SERVICE] buildScriptArray globalRemoteJSSrc ', globalRemoteJSSrc);
    if(!this.isEmpty(globalRemoteJSSrc)){
      var scriptArray = globalRemoteJSSrc.split(",")

      let count = 0;
      scriptArray.forEach(element => {
        count = count + 1;
        this.scriptList.push({name: element.split('/').pop(), loaded: false, src: element})
      });
      this.logger.log('[SCRIPT-SERVICE] buildScriptArray ', this.scriptList);
      this.load()
       
    }
  }

  load() {
    this.logger.log('[SCRIPT-SERV] load ...scripts ', this.scriptList)
    var promises: any[] = [];
    this.scriptList.forEach((script) => promises.push(this.loadScript(script)));
    return Promise.all(promises).catch((err) => {
        // log that I have an error, return the entire array;
        this.logger.error('A promise failed to resolve', err);

    });
  }


  loadScript(currentScript){
    this.logger.log('[SCRIPT-SERVICE] load script:', currentScript);
    return new Promise((resolve, reject) => {
      //resolve if already loaded
      if (currentScript.loaded) {
        resolve({ script: currentScript.name, loaded: true, status: 'Already Loaded' });
      }
      else {
        //load script
        let script = document.createElement('script')
        script.type = 'text/javascript';
        script.src = currentScript.src;
        script.onload = () => {
            currentScript.loaded = true;
            resolve({ script: name, loaded: true, status: 'Loaded' });
        }
        script.onerror = (error: any) => resolve({ script: currentScript.name, loaded: false, status: 'Loaded' });
        document.getElementsByTagName('head')[0].appendChild(script);
      }
    });
  }

  isEmpty(url: string) {
    return (url === undefined || url == null || url.length <= 0) ? true : false;
  }
}
