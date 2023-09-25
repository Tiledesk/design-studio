import { LogLevel } from './../../utils/constants';
import { Inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { LoggerService } from './../abstract/logger.service';
@Injectable()
export class CustomLogger implements LoggerService {
    // Error = 0,
    // Warn = 1,
    // Info = 2,
    // Debug = 3

    //private variables
    // private logger: NGXLogger 
    private logLevel: number = LogLevel.DEBUG;
    private isLogEnabled: boolean = true;

    constructor(private logger: NGXLogger) { }

    setLoggerConfig(isLogEnabled: boolean, logLevel: string) {
        this.isLogEnabled = isLogEnabled;
        if (logLevel) {
            this.logLevel = LogLevel[logLevel.toUpperCase()];
            // console.log('LoggerService this.logLevel  ', this.logLevel)
        }
    }

    getLoggerConfig(): {isLogEnabled: boolean, logLevel: number}{
        return {isLogEnabled: this.isLogEnabled, logLevel: this.logLevel}
    }

    error(...message: any[]) {
        if (this.isLogEnabled && this.logLevel >= LogLevel.ERROR) {
            this.logger.error(message)
            // console.log(message)
        }
    }

    warn(...message: any[]) {
        if (this.isLogEnabled && this.logLevel >= LogLevel.WARN) {
            this.logger.warn(message)
            // console.log(message)
        }
    }

    info(...message: any[]) {
        if (this.isLogEnabled && this.logLevel >= LogLevel.INFO) {
            this.logger.info(message)
            // console.log(message)
        }
    }

    debug(...message: any[]) {
        if (this.isLogEnabled && this.logLevel >= LogLevel.DEBUG) {
            this.logger.debug(message)
            // console.debug(message)
        }
    }

    log(...message: any[]) {
        if (this.isLogEnabled && this.logLevel >= LogLevel.DEBUG) {
            // console.log(message);
            this.logger.log(message)
        }
    }

}