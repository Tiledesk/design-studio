import { Injectable } from '@angular/core';

@Injectable()
export abstract class AppStorageService {

  
  constructor() { }

  abstract initialize(storagePrefix: string, persistence: string, projectID?: string): void;
  abstract getItem(key: string): any;
  abstract setItem(key: string, value: any): void;
  // abstract getItemWithoutProjectID(key: string): any; // deprecated !Not tUsed
  // abstract setItemWithoutProjectID(key: string, value: any): void; // deprecated !Not tUsed
  abstract removeItem(key: string): void;
  abstract clear(): void;

}
