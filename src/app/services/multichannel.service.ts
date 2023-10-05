import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserModel } from 'src/chat21-core/models/user';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({
  providedIn: 'root'
})
export class MultichannelService {

  // private persistence: string;
  public SERVER_BASE_URL: string;
  

  // private
  private tiledeskToken: string;

  user: UserModel;
  // project: any;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private http: HttpClient,
    private appStorageService: AppStorageService
  ) {
  }

  initialize(serverBaseUrl: string){
    this.SERVER_BASE_URL = serverBaseUrl,
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken')
  }

  getCodeForWhatsappTest(info) {
    let promise = new Promise((resolve, reject) => {
      let headers = new HttpHeaders({
        'Content-Type': 'application/json',
        //'Authorization': this.TOKEN
      })

      this.http.post(this.SERVER_BASE_URL + "modules/whatsapp/newtest", info, { headers: headers })
        .toPromise().then((res) => {
          resolve(res)
        }).catch((err) => {
          reject(err);
        })
    })
    return promise;
  }
}
