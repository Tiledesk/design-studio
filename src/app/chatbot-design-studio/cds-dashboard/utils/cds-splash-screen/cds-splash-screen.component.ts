import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LocalDbService } from 'app/services/users-local-db.service';

@Component({
  selector: 'cds-splash-screen',
  templateUrl: './cds-splash-screen.component.html',
  styleUrls: ['./cds-splash-screen.component.scss']
})
export class CdsSplashScreenComponent implements OnInit {
  
  @Input() text: string
  @Input() videoUrl: string;
  @Input() videoDescription: string;
  @Input() section:  "cds-sb-intents" | "cds-sb-fulfillment" | "cds-sb-training" | "cds-sb-rules" | "cds-sb-settings"
  @Output() onClickBtn = new EventEmitter();

  canShowVideo: boolean = true
  url: SafeResourceUrl = null
  constructor(
      public usersLocalDbService: LocalDbService,
      private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(){
    let canShowVideo = this.usersLocalDbService.getFromStorage('HAS_WATCHED_'+ this.section+ '_VIDEO')
    if(!canShowVideo || canShowVideo === 'false'){
      this.url = this.sanitizer.bypassSecurityTrustResourceUrl(this.videoUrl+'?rel=0&autoplay=0&controls=1&showinfo=0')
      this.canShowVideo = true
      this.usersLocalDbService.setInStorage('HAS_WATCHED_'+ this.section+ '_VIDEO', true)
    }else{
      this.canShowVideo = false
    }
  }

  onAdd() {
    this.onClickBtn.emit(true);
  }

}
