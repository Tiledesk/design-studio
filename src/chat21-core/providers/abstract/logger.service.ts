import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export abstract class LoggerService {

  constructor() { }
  
  abstract setLoggerConfig(isLogEnabled: boolean, logLevel: string): void;
  abstract getLoggerConfig(): {isLogEnabled: boolean, logLevel: number};
  abstract debug(...message: any[]): void;
  abstract log(...message: any[]): void;
  abstract warn(...message: any[]): void;
  abstract info(...message: any[]): void;
  abstract error(...message: any[]): void;
}
