import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { Injectable } from '@angular/core'
import { CustomLogger } from './customLogger';

@Injectable()
export class LoggerInstance  {
    
    
    //private variables
    private static instance: LoggerService;
    
    static getInstance() {
        return LoggerInstance.instance;
    }

    static setInstance(loggerService: LoggerService) {
        LoggerInstance.instance = loggerService
    }

}