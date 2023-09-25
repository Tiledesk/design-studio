import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// firebase
// import * as firebase from 'firebase/app';
import firebase from "firebase/app";
import 'firebase/messaging';
import 'firebase/database';
import 'firebase/storage';
import 'firebase/firestore';

// services
import { UploadService } from '../abstract/upload.service';
import { LoggerInstance } from '../logger/loggerInstance';
import { LoggerService } from '../abstract/logger.service';

// models
import { UploadModel } from '../../models/upload';

// @Injectable({
//   providedIn: 'root'
// })
@Injectable()
export class FirebaseUploadService extends UploadService {

  // BehaviorSubject
  BSStateUpload: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  //private
  private url: string;
  private logger: LoggerService = LoggerInstance.getInstance()

  constructor() {
    super();
  }

  private createGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      // tslint:disable-next-line:no-bitwise
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public initialize() {
    this.logger.log('[FIREBASEUploadSERVICE] initialize');
  }
  
  public upload(userId: string, upload: UploadModel): Promise<any> {
    const that = this;
    const uid = this.createGuid();
    const urlImagesNodeFirebase = '/public/images/' + userId + '/' + uid + '/' + upload.file.name;
    this.logger.debug('[FIREBASEUploadSERVICE] pushUpload ', urlImagesNodeFirebase, upload.file);

    // Create a root reference
    const storageRef = firebase.storage().ref();
    this.logger.debug('[FIREBASEUploadSERVICE] storageRef', storageRef);
    
    // Create a reference to 'mountains.jpg'
    const mountainsRef = storageRef.child(urlImagesNodeFirebase);
    this.logger.debug('[FIREBASEUploadSERVICE] mountainsRef ', mountainsRef);
 
    // const metadata = {};
    const metadata = { name: upload.file.name, contentType: upload.file.type, contentDisposition: 'attachment; filename=' + upload.file.name };

    let uploadTask = mountainsRef.put(upload.file, metadata);
   
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', function progress(snapshot) {
        // Observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        that.logger.debug('[FIREBASEUploadSERVICE] Upload is ' + progress + '% done');
        
        // ----------------------------------------------------------------------------------------------------------------------------------------------
        // BehaviorSubject publish the upload progress state - the subscriber is in ion-conversastion-detail.component.ts > listenToUploadFileProgress()
        // ----------------------------------------------------------------------------------------------------------------------------------------------
      
        that.BSStateUpload.next({ upload: progress, type: upload.file.type });
        
        switch (snapshot.state) {
          case firebase.storage.TaskState.PAUSED: // or 'paused'
            that.logger.debug('[FIREBASEUploadSERVICE] Upload is paused');
            
            break;
          case firebase.storage.TaskState.RUNNING: // or 'running'
            that.logger.debug('[FIREBASEUploadSERVICE] Upload is running');
            
            break;
        }
      }, function error(error) {
        // Handle unsuccessful uploads
        reject(error)
      }, function complete() {
        // Handle successful uploads on complete
        that.logger.debug('[FIREBASEUploadSERVICE] Upload is complete', upload);
       
        resolve(uploadTask.snapshot.ref.getDownloadURL())
        // that.BSStateUpload.next({upload: upload});

      });
    })

  }

}
