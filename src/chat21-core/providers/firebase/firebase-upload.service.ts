import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// firebase
// import * as firebase from 'firebase/app';
// import firebase from "firebase/app";
// import 'firebase/messaging';
// import 'firebase/database';
// import 'firebase/storage';
// import 'firebase/firestore';

// services
import { UploadService } from '../abstract/upload.service';
import { LoggerInstance } from '../logger/loggerInstance';
import { LoggerService } from '../abstract/logger.service';

// models
import { UploadModel } from '../../models/upload';
import { environment } from 'src/environments/environment';

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
  private firebase: any;

  private urlStorageBucket = environment.firebaseConfig.storageBucket
  
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

  public async initialize() {
    this.logger.log('[FIREBASEUploadSERVICE] initialize');

    const { default: firebase} = await import("firebase/app");
    await Promise.all([import("firebase/storage")]);
    this.firebase = firebase
  }
  
  public upload(userId: string, upload: UploadModel): Promise<{downloadURL: string, src: string}> {
    const that = this;
    const uid = this.createGuid();
    const urlImagesNodeFirebase = '/public/images/' + userId + '/' + uid + '/' + upload.file.name;
    this.logger.debug('[FIREBASEUploadSERVICE] pushUpload ', urlImagesNodeFirebase, upload.file);

    // Create a root reference
    const storageRef = this.firebase.storage().ref();
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
          case that.firebase.storage.TaskState.PAUSED: // or 'paused'
            that.logger.debug('[FIREBASEUploadSERVICE] Upload is paused');
            
            break;
          case that.firebase.storage.TaskState.RUNNING: // or 'running'
            that.logger.debug('[FIREBASEUploadSERVICE] Upload is running');
            
            break;
        }
      }, function error(error) {
        // Handle unsuccessful uploads
        reject(error)
      }, async function complete() {
        // Handle successful uploads on complete
        that.logger.debug('[FIREBASEUploadSERVICE] Upload is complete', upload);
       
        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
        resolve({downloadURL : downloadURL, src: downloadURL})
        // that.BSStateUpload.next({upload: upload});

      });
    })

  }

  public uploadProfile(userId: string, upload: UploadModel): Promise<any>  {
    const that = this;
    const urlImagesNodeFirebase = '/profiles/' + userId + '/photo.jpg'
    this.logger.debug('[FIREBASEUploadSERVICE] uploadProfile ', urlImagesNodeFirebase, upload.file);

    // Create a root reference
    const storageRef = this.firebase.storage().ref();
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
          case that.firebase.storage.TaskState.PAUSED: // or 'paused'
            that.logger.debug('[FIREBASEUploadSERVICE] Upload is paused');
            
            break;
          case that.firebase.storage.TaskState.RUNNING: // or 'running'
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


  public async delete(userId: string, path: string): Promise<any>{
    const that = this;

    that.logger.debug('[FIREBASEUploadSERVICE] delete image for USER', userId, path);

    let uid = path.split(userId)[1].split('%2F')[1]; // get the UID of the image
    let imageName = path.split(uid + '%2F')[1].split('?')[0];

    // Create a root reference
    const storageRef = this.firebase.storage().ref();
    const ref = storageRef.child('public/images/' + userId + '/'+ uid + '/')
    let arrayPromise = []
    await ref.listAll().then((dir => {
      dir.items.forEach(fileRef => arrayPromise.push(this.deleteFile(ref.fullPath, fileRef.name)));
    })).catch(error => {
      that.logger.error('[FIREBASEUploadSERVICE] delete: listAll error', error)
    })

    //AWAIT to return ALL the promise delete()
    return new Promise((resolve, reject)=> {
      Promise.all(arrayPromise).then(()=>{
        resolve(true)
      }).catch((error)=>{
        reject(error)
      })
    })
  }

  public async deleteProfile(userId: string, path: string): Promise<any>{
    const that = this;
    const file_name_photo = 'photo.jpg';
    const file_name_thumb_photo = 'thumb_photo.jpg';

    that.logger.debug('[FIREBASEUploadSERVICE] delete image for USER', userId, path);

    // Create a root reference
    const storageRef = this.firebase.storage().ref();
    const ref = storageRef.child('profiles/' + userId + '/')
    let arrayPromise = []
    await ref.listAll().then((dir => {
      dir.items.forEach(fileRef => arrayPromise.push(this.deleteFile(ref.fullPath, fileRef.name)));
    })).catch(error => {
      that.logger.error('[FIREBASEUploadSERVICE] delete: listAll error', error)
    })

    //AWAIT to return ALL the promise delete()
    return new Promise((resolve, reject)=> {
      Promise.all(arrayPromise).then(()=>{
        resolve(true)
      }).catch((error)=>{
        reject(error)
      })
    })
  }


  // // ------------------------------------
  // // Delete the file photo
  // // ------------------------------------
  private deleteFile(pathToFile, fileName){
    const ref = this.firebase.storage().ref(pathToFile);
    const childRef = ref.child(fileName);
    return childRef.delete()
  }

}
