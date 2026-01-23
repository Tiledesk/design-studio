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
    private logger: LoggerService = LoggerInstance.getInstance()

    constructor(
        public http: HttpClient,
        public appStorage: AppStorageService
    ) {
        super();
    }

    initialize(projectId: string): void {
        this.logger.info('[NATIVE UPLOAD] initialize', this.getBaseUrl())
        this.URL_TILEDESK_FILE = this.getBaseUrl() + projectId + '/files'
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
        const url = this.URL_TILEDESK_FILE + '/chat'
        return new Promise((resolve, reject) => {
            that.http.post(url, formData, requestOptions).pipe(first()).subscribe({
                next: (data) => {
                    const downloadURL = this.getBaseUrl() + 'files' + '?path=' + data['filename'];
                    resolve({downloadURL : downloadURL, src: downloadURL})
                },
                error: (error) => {
                    reject(error)
                }
            });
        });

        //old_implemenation
        // if ((upload.file.type.startsWith('image') && (!upload.file.type.includes('svg')))) {
        //     this.logger.log('[NATIVE UPLOAD] - upload new image', this.URL_TILEDESK_IMAGES)
        //     //USE IMAGE API
        //     const url = this.URL_TILEDESK_IMAGES + '/users'
        //     return new Promise((resolve, reject) => {
        //         that.http.post(url, formData, requestOptions).subscribe(data => {
        //             const downloadURL = this.URL_TILEDESK_IMAGES + '?path=' + data['filename'];
        //             resolve({downloadURL : downloadURL, src: downloadURL})
        //             // that.BSStateUpload.next({upload: upload});
        //         }, (error) => {
        //             reject(error)
        //         });
        //     });
        // } else {
        //     this.logger.log('[NATIVE UPLOAD] - upload new file', this.URL_TILEDESK_FILE)
        //     //USE FILE API
        //     const url = this.URL_TILEDESK_FILE + '/users'
        //     return new Promise((resolve, reject) => {
        //         that.http.post(url, formData, requestOptions).subscribe(data => {
        //             const src = this.URL_TILEDESK_FILE + '?path=' + encodeURI(data['filename']);
        //             const downloadURL = this.URL_TILEDESK_FILE + '/download' + '?path=' + encodeURI(data['filename']);
        //             resolve({downloadURL : downloadURL, src: src})
        //             // that.BSStateUpload.next({upload: upload});
        //         }, (error) => {
        //             this.logger.error('[NATIVE UPLOAD] - ERROR upload new file ', error)
        //             reject(error)
        //         });
        //     });
        // }
        
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
        const botId = userId?.startsWith('bot_') ? userId.substring('bot_'.length) : userId
        const url = this.URL_TILEDESK_FILE + `/users/photo?bot_id=${botId}`
        return new Promise((resolve, reject) => {
            that.http.put(url, formData, requestOptions).pipe(first()).subscribe({
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