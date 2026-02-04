import { Pipe, PipeTransform } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'formatNumber'
})
export class FormatNumberPipe implements PipeTransform {

  constructor(private translateService: TranslateService) {}

  transform(value: number): string {
    if (!value && value !== 0) {
      return '';
    }
    
    // Use BROWSER language to decide formatting:
    // - en => 1,000
    // - it => 1.000
    const browserLang = this.translateService.getBrowserLang() || 'en';
    const locale = this.mapLangToLocale(browserLang);
    const numberPipe = new DecimalPipe(locale);
    
    // Se il numero è maggiore di 999, formatta in migliaia con "k" (arrotondato agli interi)
    if (value > 999) {
      const thousands = Math.round(value / 1000);
      // Equivalent to: {{ thousands | number:'':locale }}
      const formattedThousands = numberPipe.transform(thousands, '', locale);
      return (formattedThousands || thousands.toString()) + 'k';
    }
    
    // Per numeri <= 999, mostra il numero normale
    // Equivalent to: {{ value | number:'':locale }}
    return numberPipe.transform(value, '', locale) || value.toString();
  }

  /**
   * Mappa il codice lingua (es: 'it', 'en') al formato locale completo (es: 'it-IT', 'en-US')
   */
  private mapLangToLocale(lang: string): string {
    const localeMap: { [key: string]: string } = {
      // NOTE: In this project we explicitly register locale data for 'it' (see app.module.ts).
      // Angular always has the default 'en' locale built-in.
      'it': 'it',
      'en': 'en'
    };
    
    const normalized = (lang || '').toLowerCase();
    if (normalized.startsWith('it')) return 'it';
    if (normalized.startsWith('en')) return 'en';
    return 'en';
  }

}

