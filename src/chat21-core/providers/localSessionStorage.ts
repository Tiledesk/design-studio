import { Injectable } from '@angular/core';
import { AppStorageService } from './abstract/app-storage.service';
import { STORAGE_PREFIX } from '../utils/constants';
import { supports_html5_session, supports_html5_storage } from '../utils/utils';
import { LoggerService } from './abstract/logger.service';
import { LoggerInstance } from './logger/loggerInstance';

@Injectable()
export class LocalSessionStorage extends AppStorageService {

  private storagePrefix: string = STORAGE_PREFIX;
  private projectID: string;
  private persistence: string;
  private logger: LoggerService = LoggerInstance.getInstance();

  initialize(storagePrefix: string, persistence: string, projectID: string): void {
    this.storagePrefix = storagePrefix;
    this.projectID = projectID;
    this.persistence = persistence;
    // this.persistence = 'LOCAL';
    // this.logger.info('[LocalSessionStorage] - initialize ', this.storagePrefix, this.persistence, this.projectID)
  }

  /** GET item in local/session storage from key value
   *  @param key
   */
  getItem(key: string) {
    let prefix;
    try {
      // const sv = 'sv' + environment.shemaVersion + '_';
      // prefix = prefix + sv;
      prefix = this.storagePrefix + '_';
    } catch (e) {
      this.logger.error('[LocalSessionStorage] getItem - Error :' + e);
    }
    const newKey = prefix + this.projectID + '_' + key;
    return this.getValueForKey(newKey);
  }

  /** SET new item in local/session storage
   *  @param key
   *  @param value
   */
  setItem(key: string, value: any): void {
    // this.removeItem(key);
    let prefix;
    try {
      // const sv = 'sv' + environment.shemaVersion + '_';
      // prefix = prefix + sv;
      prefix = this.storagePrefix + '_';
    } catch (e) {
      this.logger.error('[LocalSessionStorage] setItem > Error :' + e);
    }
    const newKey = prefix + this.projectID + '_' + key;
    this.saveValueForKey(newKey, value);
  }

  /** GET item in local/session storage from key value without project id SUFFIX
   * @param key
   * @deprecated
   */
  // getItemWithoutProjectID(key: string) {
  //     let prefix;
  //     try {
  //         // const sv = 'sv' + environment.shemaVersion + '_';
  //         // prefix = prefix + sv;
  //         prefix = this.storagePrefix + '_';
  //     } catch (e) {
  //         this.logger.error('[LocalSessionStorage] getItemWithoutProjectID > Error :' + e);
  //     }
  //     const newKey = prefix + key;
  //     return this.getValueForKey(newKey);
  // }

  /** SET new item in local/session storage without project id SUFFIX
   *  @param key
   *  @param value
   */
  // setItemWithoutProjectID(key: string, value: any): void {
  //   this.removeItem(key);
  //   let prefix = STORAGE_PREFIX;
  //   try {
  //     // const sv = 'sv' + environment.shemaVersion + '_';
  //     // prefix = prefix + sv;
  //     prefix = this.storagePrefix + '_';
  //   } catch (e) {
  //     this.logger.error('[LocalSessionStorage] setItemWithoutProjectID > Error :' + e);
  //   }
  //   const newKey = prefix + key;
  //   this.saveValueForKey(newKey, value);
  // }

  removeItem(key: string): void {
    let prefix;
    try {
      // const sv = 'sv' + environment.shemaVersion + '_';
      // prefix = prefix + sv;
      prefix = this.storagePrefix + '_';
    } catch (e) {
      this.logger.error('[LocalSessionStorage] removeItem > Error :' + e);
    }
    const newKey = prefix + this.projectID + '_' + key;
    return this.removeItemForKey(newKey);
  }

  clear(): void {
    let prefix;
    try {
      // const sv = 'sv' + environment.shemaVersion + '_';
      // prefix = prefix + sv;
      prefix = this.storagePrefix + '_';
    } catch (e) {
      this.logger.error('[LocalSessionStorage] clear > Error :' + e);
    }
    const prefixKey = prefix + this.projectID
    const arrayKey: Array<string> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.indexOf(prefixKey) !== -1) {
        arrayKey.push(key);
      }
    }

    for (let i = 0; i < arrayKey.length; i++) {
      // localStorage.removeItem(arrayKey[i]);
      this.removeItemForKey(arrayKey[i]);
    }

  }


  // ---------- PRIVATE METHODS start --------------- //

  private getValueForKey(key) {
    if (this.persistence === 'local' || this.persistence === 'LOCAL') {
      if (supports_html5_storage()) {
        return localStorage.getItem(key);
      } else {
        this.logger.warn('localStorage is not defind. Storage disabled');
        return null;
      }
    } else if (this.persistence === 'session' || this.persistence === 'SESSION') {
      if (supports_html5_session()) {
        return sessionStorage.getItem(key);
      } else {
        this.logger.warn('sessionStorage is not defind. Storage disabled');
        return null;
      }
    } else if (this.persistence === 'none' || this.persistence === 'NONE') {
      return null;
    } else {
      if (supports_html5_storage()) {
        return localStorage.getItem(key);
      } else {
        this.logger.warn('localStorage is not defind. Storage disabled');
        return null;
      }
    }
  }

  private saveValueForKey(key, value) {
    if (this.persistence === 'local' || this.persistence === 'LOCAL') {
      if (supports_html5_storage()) {
        return localStorage.setItem(key, value);
      } else {
        this.logger.warn('localStorage is not defined. Storage disabled');
        return null;
      }
    } else if (this.persistence === 'session' || this.persistence === 'SESSION') {
      if (supports_html5_session()) {
        return sessionStorage.setItem(key, value);
      } else {
        this.logger.warn('sessionStorage is not defined. Storage disabled');
        return null;
      }
    } else if (this.persistence === 'none' || this.persistence === 'NONE') {
      return null;
    } else {
      if (supports_html5_storage()) {
        return localStorage.setItem(key, value);
      } else {
        this.logger.warn('localStorage is not defined. Storage disabled');
        return null;
      }
    }
  }

  private removeItemForKey(key: string) {
    if (this.persistence === 'local' || this.persistence === 'LOCAL') {
      if (supports_html5_storage()) {
        return localStorage.removeItem(key);
      } else {
        this.logger.warn('localStorage is not defind. Storage disabled');
        return null;
      }
    } else if (this.persistence === 'session' || this.persistence === 'SESSION') {
      if (supports_html5_session()) {
        return sessionStorage.removeItem(key);
      } else {
        this.logger.warn('sessionStorage is not defind. Storage disabled');
        return null;
      }
    } else if (this.persistence === 'none' || this.persistence === 'NONE') {
      return null;
    } else {
      if (supports_html5_storage()) {
        return localStorage.removeItem(key);
      } else {
        this.logger.warn('localStorage is not defind. Storage disabled');
        return null;
      }
    }
  }

}