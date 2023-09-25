import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export abstract class ImageRepoService {

  //params
  private DEFAULT_URL: string = environment.baseImageUrl;
  private baseImageUrl;

  public setImageBaseUrl(baseUrl): void {
    this.baseImageUrl = baseUrl;
  }
  public getImageBaseUrl(): string {
    if (this.baseImageUrl) {
      return this.baseImageUrl;
    } else {
      return this.DEFAULT_URL;
    }
  }
  
  // functions
  abstract getImagePhotoUrl(uid: string): string;
}
