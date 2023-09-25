import { Injectable } from '@angular/core';
// https://enappd.com/blog/how-to-translate-in-ionic-internationalization-and-localization/143/
// https://phrase.com/blog/posts/localizing-ionic-applications-with-ngx-translate/
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class CustomTranslateService {


  public language: string;

  constructor(
    private translateService: TranslateService
  ) {
    // this.translateService.setDefaultLang('en');
  }

  /** */
  public translateLanguage(keys: any, lang?: string): Map<string, string> {
    // if (!lang || lang === '') {
    //     this.language = this.translateService.currentLang;
    // } else {
    //   this.language = lang;
    // }
    // this.translateService.use(this.language);
    return this.initialiseTranslation(keys);
  }

  /** */
  private initialiseTranslation(keys): Map<string, string> {
    const mapTranslate = new Map();
    keys.forEach((key: string) => {
      this.translateService.get(key).subscribe((res: string) => {
        mapTranslate.set(key, res);
      });
    });
    return mapTranslate;
  }

}
