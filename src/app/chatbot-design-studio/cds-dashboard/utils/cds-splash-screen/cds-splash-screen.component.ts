import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SIDEBAR_PAGES } from 'src/app/chatbot-design-studio/utils';
import { BRAND_BASE_INFO, LOGOS_ITEMS } from 'src/app/chatbot-design-studio/utils-resources';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

@Component({
  selector: 'cds-splash-screen',
  templateUrl: './cds-splash-screen.component.html',
  styleUrls: ['./cds-splash-screen.component.scss']
})
export class CdsSplashScreenComponent implements OnInit {
  
  @Input() text: string
  @Input() videoUrl: string;
  @Input() videoDescription: string;
  @Input() section:  SIDEBAR_PAGES
  @Output() onClickBtn = new EventEmitter();

  canShowVideo: boolean = true
  url: SafeResourceUrl = null

  LOGOS_ITEMS = LOGOS_ITEMS
  BRAND_BASE_INFO = BRAND_BASE_INFO
  
  constructor(
      public appStorageService: AppStorageService,
      private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(){
    let canShowVideo = this.appStorageService.getItem('HAS_WATCHED_'+ this.section+ '_VIDEO')
    if((!canShowVideo || canShowVideo === 'false') && this.videoUrl){
      this.url = this.sanitizer.bypassSecurityTrustResourceUrl(this.videoUrl+'?rel=0&autoplay=0&controls=1&showinfo=0')
      this.canShowVideo = true
      this.appStorageService.setItem('HAS_WATCHED_'+ this.section+ '_VIDEO', true)
    }else{
      this.canShowVideo = false
    }

    if(!BRAND_BASE_INFO['DOCS']){
      this.canShowVideo = false
    }
    
  }

  onAdd() {
    this.onClickBtn.emit(true);
  }

}
