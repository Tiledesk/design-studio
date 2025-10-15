import { Pipe, PipeTransform } from '@angular/core';
import { formatNumber } from '@angular/common';
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
    
    // Ottiene la lingua corrente dal browser tramite TranslateService
    const currentLang = this.translateService.currentLang || this.translateService.getBrowserLang() || 'en';
    const locale = this.mapLangToLocale(currentLang);
    
    // Se il numero è maggiore di 999, formatta in migliaia con "k" (arrotondato agli interi)
    if (value > 999) {
      const thousands = Math.round(value / 1000);
      const formattedThousands = formatNumber(thousands, locale, '1.0-0');
      return formattedThousands + 'K';
    }
    
    // Per numeri <= 999, mostra il numero normale
    return formatNumber(value, locale, '1.0-0');
  }

  /**
   * Mappa il codice lingua (es: 'it', 'en') al formato locale completo (es: 'it-IT', 'en-US')
   */
  private mapLangToLocale(lang: string): string {
    const localeMap: { [key: string]: string } = {
      'it': 'it-IT',
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'pt': 'pt-PT',
      'nl': 'nl-NL',
      'ru': 'ru-RU',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR'
    };
    
    return localeMap[lang.toLowerCase()] || 'en-US';
  }

}

