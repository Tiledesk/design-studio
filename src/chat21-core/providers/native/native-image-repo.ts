import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ImageRepoService } from 'src/chat21-core/providers/abstract/image-repo.service';

// @Injectable({ providedIn: 'root' })
@Injectable()
export class NativeImageRepoService extends ImageRepoService {
    
    private baseImageURL: string;
    
    constructor(public http: HttpClient) {
        super();
    }

    /**
     * @param uid
     */
    getImagePhotoUrl(uid: string): string {
        this.baseImageURL = this.getImageBaseUrl() + 'images'
        let sender_id = '';
        if (uid.includes('bot_')) {
            sender_id = uid.slice(4)
        } else {
            sender_id = uid
        }
        const filename_photo = '?path=uploads/users/'+ sender_id + '/images/photo.jpg'
        const filename_thumbnail = '?path=uploads/users/'+ sender_id + '/images/thumbnails_200_200-photo.jpg'
        return this.baseImageURL + filename_photo
    } 

    checkImageExists(url: string, callback: (exist: boolean) => void): void {
        this.http.get(url).subscribe( res => {
            callback(true)
        },(error) => { console.log('errorrrrrr', url, error);callback(false)})
    }

}