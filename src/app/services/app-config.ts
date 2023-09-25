import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

// Logger
// import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
// import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({ providedIn: 'root' })
export class AppConfigProvider {
  private appConfig: any;
  // private logger: LoggerService = LoggerInstance.getInstance()

  constructor(public http: HttpClient) {
    this.appConfig = environment;
    // console.log('AppConfigProvider constructor environment:: ', environment);
  }

  /** */
  loadAppConfig() {
    // const that = this;
    // return this.http.get(this.appConfig.remoteConfigUrl).toPromise().then(data => {
    //     that.appConfig = data;
    //   }).catch(err => {
    //     console.log('error loadAppConfig' + err);
    //   });

    // ---- new


    return this.http.get(this.appConfig.remoteConfigUrl)
      .toPromise().then((data: any) => {
        // console.log('AppConfigService loadAppConfig data: ', data);

        const allconfig = data
        // console.log('[APP-CONFIG-SERVICE] - loadAppConfig allconfig: ', allconfig);

        if (allconfig.hasOwnProperty('wsUrlRel')) {

          // console.log('[APP-CONFIG-SERVICE] - loadAppConfig allconfig !!!! exist wsUrlRel ->: ', allconfig.wsUrlRel);
          var wsUrlRelIsEmpty = this.isEmpty(allconfig.wsUrlRel)
          // console.log('[APP-CONFIG-SERVICE] - loadAppConfig allconfig !!!! exist wsUrlRel -> wsUrlRelIsEmpty ?', wsUrlRelIsEmpty);

          if (wsUrlRelIsEmpty === false) {
            // console.log('[APP-CONFIG-SERVICE]- loadAppConfig allconfig !!!! exist - SERVER_BASE_URL', data.apiUrl);

            // if (allconfig.apiUrl.indexOf("http://") !== -1) {

            //   const ws_url = allconfig.apiUrl.replace("http://", "ws://").slice(0, -1) + allconfig.wsUrlRel;
            //   // console.log('AppConfigService loadAppConfig allconfig !!!! exist - SERVER_BASE_URL protocol is HTTP - wsUrl', ws_url);

            //   allconfig.wsUrl = ws_url

            // } else if (allconfig.apiUrl.indexOf("https://") !== -1) {

            //   const ws_url = allconfig.apiUrl.replace("https://", "wss://").slice(0, -1) + allconfig.wsUrlRel;

            //   allconfig.wsUrl = ws_url

            //   // console.log('AppConfigService loadAppConfig allconfig !!!! exist - SERVER_BASE_URL protocol is HTTPS - wsUrl', ws_url);
            // } else {


            // console.log('AppConfigService loadAppConfig allconfig !!!! exist - SERVER_BASE_URL !!! IS RELATIVE - window.location ', window.location);

            // console.log(window.location)

            if (window.location.protocol === 'http:') {
              allconfig.wsUrl = 'ws://' + window.location.hostname + ':' + window.location.port + allconfig.wsUrlRel

            } else if (window.location.protocol === 'https:') {

              allconfig.wsUrl = 'wss://' + window.location.hostname + ':' + window.location.port + allconfig.wsUrlRel
            } else {

              allconfig.wsUrl = 'ws://' + window.location.hostname + ':' + window.location.port + allconfig.wsUrlRel
            }
            // }

          } else {
            // console.log('[APP-CONFIG-SERVICE] loadAppConfig allconfig !!!! exist wsUrlRel but IS EMPTY');
          }

        } else {

          // console.log('[APP-CONFIG-SERVICE] loadAppConfig allconfig !!!! does not exist wsUrlRel');
        }

        this.appConfig = allconfig;


      }).catch(err => {
        console.error('error loadAppConfig' + err);
      });
  }

  isEmpty(wsUrlRel: string) {
    return (wsUrlRel === undefined || wsUrlRel == null || wsUrlRel.length <= 0) ? true : false;
  }

  /** */
  getConfig() {
    return this.appConfig;
  }


}
