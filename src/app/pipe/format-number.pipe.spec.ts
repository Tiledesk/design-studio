import { FormatNumberPipe } from './format-number.pipe';
import { TranslateService } from '@ngx-translate/core';

describe('FormatNumberPipe', () => {
  let pipe: FormatNumberPipe;
  let translateServiceMock: any;

  beforeEach(() => {
    // Mock di TranslateService per lingua inglese
    translateServiceMock = {
      currentLang: 'en',
      getBrowserLang: () => 'en'
    };
    pipe = new FormatNumberPipe(translateServiceMock as TranslateService);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format 1000 as "1k"', () => {
    expect(pipe.transform(1000)).toBe('1k');
  });

  it('should format 100000 as "100k"', () => {
    expect(pipe.transform(100000)).toBe('100k');
  });

  it('should format 8000 as "8k"', () => {
    expect(pipe.transform(8000)).toBe('8k');
  });

  it('should format 8192 as "8k"', () => {
    expect(pipe.transform(8192)).toBe('8k'); // 8192/1000 = 8.192 -> rounded to 8k
  });

  it('should format 1500 as "2k"', () => {
    expect(pipe.transform(1500)).toBe('2k'); // 1500/1000 = 1.5 -> rounded to 2k
  });

  it('should format 0 as "0"', () => {
    expect(pipe.transform(0)).toBe('0');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should format large numbers as "128k"', () => {
    expect(pipe.transform(128192)).toBe('128k'); // 128192/1000 = 128.192 -> rounded to 128k
  });

  it('should format millions ending with 000 as "1,000k"', () => {
    expect(pipe.transform(1000000)).toBe('1,000k'); // 1000000/1000 = 1000 -> 1,000k con separatore
  });

  it('should format numbers <= 999 without "k"', () => {
    expect(pipe.transform(999)).toBe('999');
    expect(pipe.transform(500)).toBe('500');
    expect(pipe.transform(1)).toBe('1');
  });
});

describe('FormatNumberPipe with Italian locale', () => {
  let pipe: FormatNumberPipe;
  let translateServiceMock: any;

  beforeEach(() => {
    // Mock di TranslateService per lingua italiana
    translateServiceMock = {
      currentLang: 'it',
      getBrowserLang: () => 'it'
    };
    pipe = new FormatNumberPipe(translateServiceMock as TranslateService);
  });

  it('should format 8192 as "8k" with Italian locale', () => {
    expect(pipe.transform(8192)).toBe('8k'); // 8192/1000 = 8.192 -> rounded to 8k
  });

  it('should format 1500 as "2k" with Italian locale', () => {
    expect(pipe.transform(1500)).toBe('2k'); // 1500/1000 = 1.5 -> rounded to 2k
  });
});

describe('FormatNumberPipe with browser language fallback', () => {
  let pipe: FormatNumberPipe;
  let translateServiceMock: any;

  beforeEach(() => {
    // Mock di TranslateService senza currentLang (usa getBrowserLang)
    translateServiceMock = {
      currentLang: null,
      getBrowserLang: () => 'it'
    };
    pipe = new FormatNumberPipe(translateServiceMock as TranslateService);
  });

  it('should use browser language when currentLang is null', () => {
    expect(pipe.transform(8192)).toBe('8k'); // 8192/1000 = 8.192 -> rounded to 8k
  });
});

