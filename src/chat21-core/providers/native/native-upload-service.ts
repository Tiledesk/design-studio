import { UploadService } from '../abstract/upload.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, first } from 'rxjs';
import { UploadModel } from '../../models/upload';
import { AppStorageService } from '../abstract/app-storage.service';
import { LoggerService } from '../abstract/logger.service';
import { LoggerInstance } from '../logger/loggerInstance';

// @Injectable({ providedIn: 'root' })
@Injectable()
export class NativeUploadService extends UploadService {

    BSStateUpload: BehaviorSubject<any> = new BehaviorSubject<any>(null)

    private tiledeskToken: string;
    private URL_TILEDESK_FILE: string;
    private URL_TILEDESK_UPLOAD: string;
    private logger: LoggerService = LoggerInstance.getInstance()

    constructor(
        public http: HttpClient,
        public appStorage: AppStorageService
    ) {
        super();
    }

    initialize(projectId?: string): void {
        this.logger.info('[NATIVE UPLOAD] initialize', this.getBaseUrl())
        if (projectId) {
            this.URL_TILEDESK_FILE = this.getBaseUrl() + projectId + '/files'
        }
        this.URL_TILEDESK_UPLOAD = this.getBaseUrl();
        this.tiledeskToken = this.appStorage.getItem('tiledeskToken')
    }

    upload(userId: string, upload: UploadModel): Promise<{downloadURL: string, src: string}>  {
        this.logger.log('[NATIVE UPLOAD] - upload new image/file ... upload', upload)
        const headers = new HttpHeaders({
            Authorization: this.tiledeskToken,
            //'Content-Type': 'multipart/form-data',
        });
        const requestOptions = { headers: headers };
        const formData = new FormData();
        formData.append('file', upload.file);

        const that = this;
        if ((upload.file.type.startsWith('image') && (!upload.file.type.includes('svg')))) {
            //USE IMAGE API
            const url = this.URL_TILEDESK_UPLOAD + 'images/users'
            return new Promise((resolve, reject) => {
                that.http.post(url, formData, requestOptions).pipe(first()).subscribe({
                    next: (data) => {
                        const downloadURL = this.URL_TILEDESK_UPLOAD + 'images?path=' + encodeURIComponent(data?.['filename']);
                        resolve({downloadURL : downloadURL, src: downloadURL})
                        // that.BSStateUpload.next({upload: upload});
                    },
                    error: (error) => {
                        reject(error)
                    }
                });
            });
        } else {
            //USE FILE API
            const url = this.URL_TILEDESK_UPLOAD + 'files/users'
            return new Promise((resolve, reject) => {
                that.http.post(url, formData, requestOptions).pipe(first()).subscribe({
                    next: (data) => {
                        const src = this.URL_TILEDESK_UPLOAD + 'files?path=' + encodeURIComponent(data['filename']);
                        const downloadURL = this.URL_TILEDESK_UPLOAD + 'files/download' + '?path=' + encodeURIComponent(data['filename']);
                        resolve({downloadURL : downloadURL, src: src})
                        // that.BSStateUpload.next({upload: upload});
                    }, 
                    error: (error) => {
                        this.logger.error('[NATIVE UPLOAD] - ERROR upload new file ', error)
                        reject(error)
                    }
                });
            });
        }
        
    }

    uploadFile(userId: string, upload: UploadModel): Promise<{downloadURL: string, src: string}>  {
        this.logger.log('[NATIVE UPLOAD] - upload new image/file ... upload', upload)
        const headers = new HttpHeaders({
            Authorization: this.tiledeskToken,
            //'Content-Type': 'multipart/form-data',
        });
        const requestOptions = { headers: headers };
        const formData = new FormData();
        formData.append('file', upload.file);

        const that = this;
        const url = this.URL_TILEDESK_FILE + '/chat'
        return new Promise((resolve, reject) => {
            that.http.post(url, formData, requestOptions).pipe(first()).subscribe({
                next: (data) => {
                    const src = this.URL_TILEDESK_UPLOAD + 'files?path=' + encodeURIComponent(data['filename']);
                    const downloadURL = this.URL_TILEDESK_UPLOAD + 'files/download?path=' + encodeURIComponent(data['filename']);
                    resolve({downloadURL : downloadURL, src: src})
                },
                error: (error) => {
                    reject(error)
                }
            });
        });    
    }

    uploadAsset(userId: string, upload: UploadModel, expiration?: number): Promise<{downloadURL: string, src: string}> {
        this.logger.log('[NATIVE UPLOAD] - upload new asset ... upload', upload, 'expiration:', expiration)
        const headers = new HttpHeaders({
            Authorization: this.tiledeskToken,
        });
        const requestOptions = { headers: headers };
        const formData = new FormData();
        formData.append('file', upload.file);

        const that = this;
        const queryString = expiration !== undefined ? `?expiration=${encodeURIComponent(String(expiration))}` : ''
        const url = this.URL_TILEDESK_FILE + `/assets${queryString}`
        return new Promise((resolve, reject) => {
            that.http.post(url, formData, requestOptions).pipe(first()).subscribe({
                next: (data) => {
                    const src = this.URL_TILEDESK_UPLOAD + 'files?path=' + data['filename'];
                    const downloadURL = this.URL_TILEDESK_UPLOAD + 'files/download?path=' + encodeURIComponent(data['filename']);
                    resolve({downloadURL : downloadURL, src: src})
                },
                error: (error) => {
                    reject(error)
                }
            });
        });
    }

    uploadProfile(userId: string, upload: UploadModel): Promise<any> {
        this.logger.log('[NATIVE UPLOAD] - upload new photo profile  ... upload', upload)
        const headers = new HttpHeaders({
          Authorization: this.tiledeskToken,
          // 'Content-Type': 'multipart/form-data',
        });
        const requestOptions = { headers: headers };
        const formData = new FormData();
        formData.append('file', upload.file);

        // USE IMAGE API
        const that = this;
        const queryString = userId?.startsWith('bot_') ? `?bot_id=${encodeURIComponent(userId.substring('bot_'.length))}` : ''
        const url = this.URL_TILEDESK_FILE + `/users/photo${queryString}`
        return new Promise((resolve, reject) => {
            that.http.post(url, formData, requestOptions).pipe(first()).subscribe({
                next: (data) => {
                    const downloadURL = this.getBaseUrl() + 'files?path=' + data['thumbnail'];
                    resolve(downloadURL)
                    // that.BSStateUpload.next({upload: upload});
                },
                error: (error) => {
                    reject(error)
                }
            });
        });
    }

    delete(userId: string, path: string): Promise<any>{
        this.logger.log('[NATIVE UPLOAD] - delete image ... upload', userId)
        const headers = new HttpHeaders({
            Authorization: this.tiledeskToken,
            //'Content-Type': 'multipart/form-data',
        });
        const requestOptions = { headers: headers };

        //USE IMAGE API
        const that = this;
        const url = this.URL_TILEDESK_UPLOAD + 'images/users' + '?path=' + path.split('path=')[1]
        return new Promise((resolve, reject) => {
            that.http.delete(url, requestOptions).pipe(first()).subscribe({
                next: (data) => {
                    // const downloadURL = this.URL_TILEDESK_IMAGES + '?path=' + data['filename'];
                    resolve(true)
                    // that.BSStateUpload.next({upload: upload});
                }, 
                error: (error) => {
                    reject(error)
                }
            });
        });
    }

    deleteFile(userId: string, path: string): Promise<any>{
        this.logger.log('[NATIVE UPLOAD] - delete image ... upload', path)
        const headers = new HttpHeaders({
            Authorization: this.tiledeskToken,
            //'Content-Type': 'multipart/form-data',
        });
        const requestOptions = { headers: headers };

        //USE IMAGE API
        const that = this;
        const url = this.URL_TILEDESK_FILE + '?path=' + path.split('path=')[1]
        return new Promise((resolve, reject) => {
            that.http.delete(url, requestOptions).pipe(first()).subscribe({
                next: (data) => {
                    // const downloadURL = this.URL_TILEDESK_IMAGES + '?path=' + data['filename'];
                    resolve(true)
                    // that.BSStateUpload.next({upload: upload});
                },
                error: (error) => {
                    reject(error)
                }
            });
        });
    }

    deleteAsset(userId: string, path: string): Promise<any>{
        return this.deleteFile(userId, path);
    }

    deleteProfile(userId: string, path: string): Promise<any>{
        this.logger.log('[NATIVE UPLOAD] - delete image ... upload', userId)
        const headers = new HttpHeaders({
            Authorization: this.tiledeskToken,
            //'Content-Type': 'multipart/form-data',
        });
        const requestOptions = { headers: headers };

        //USE IMAGE API
        const that = this;
        const url = this.URL_TILEDESK_FILE + '?path=' + "uploads/users/"+ userId + "/images/photo.jpg"
        return new Promise((resolve, reject) => {
            that.http.delete(url, requestOptions).pipe(first()).subscribe({
                next: (data) => {
                    // const downloadURL = this.URL_TILEDESK_IMAGES + '?path=' + data['filename'];
                    resolve(true)
                    // that.BSStateUpload.next({upload: upload});
                },
                error: (error) => {
                    reject(error)
                }
            });
        });
    }

    
}