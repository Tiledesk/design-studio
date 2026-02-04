import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';


// models
import { UploadModel } from '../../models/upload';

@Injectable({
  providedIn: 'root'
})

export abstract class UploadService {

  //params
  private DEFAULT_URL: string = environment.apiUrl;
  private baseUrl: string = '';

  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }
  public getBaseUrl(): string {
    if (this.baseUrl) {
      return this.baseUrl;
    } else {
      return this.DEFAULT_URL;
    }
  }

  //BehaviorSubject
  abstract BSStateUpload: BehaviorSubject<any>;

  // params
  // abstract tenant = environment.tenant;

  // functions
  abstract initialize(projectId?: string): void;
  abstract upload(userId: string, upload: UploadModel): Promise<{downloadURL: string, src: string}>;
  abstract uploadFile(userId: string, upload: UploadModel): Promise<{downloadURL: string, src: string}>;
  abstract uploadAsset(userId: string, upload: UploadModel, expiration?: number): Promise<{downloadURL: string, src: string}>;
  abstract uploadProfile(userId: string, upload: UploadModel): Promise<any>;
  abstract delete(userId: string, path: string): Promise<any>;
  abstract deleteFile(userId: string, path: string): Promise<any>;
  abstract deleteAsset(userId: string, path: string): Promise<any>
  abstract deleteProfile(userId: string, path: string): Promise<any>
}