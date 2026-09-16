import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { DashboardService } from 'src/app/services/dashboard.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
const swal = require('sweetalert');
import * as moment from 'moment';
import { AppConfigService } from 'src/app/services/app-config';
import { avatarPlaceholder, getColorBck } from 'src/chat21-core/utils/utils-user';
import { TranslateService } from '@ngx-translate/core';




@Component({
  selector: 'cds-publish-history',
  templateUrl: './cds-publish-history.component.html',
  styleUrls: ['./cds-publish-history.component.scss']
})


export class CdsPublishHistoryComponent implements OnInit {
  // expandedIndexes: boolean[] = [];
  // lineCounts: number[] = [];
  @ViewChildren('textRef') textRefs!: QueryList<ElementRef>;

  @ViewChildren('cloneRef') cloneRefs!: QueryList<ElementRef>;

  lineCounts: number[] = [];
  expandedIndexes: { [key: number]: boolean } = {};

  selectedChatbot: Chatbot;
  releases: any;
  imageStorageURL: string
  // releases: Release[] = [
  //   {
  //     version: 'V12',
  //     note: 'Chatbot',
  //     author: 'Nicola Lanzilotto',
  //     updatedAt: '2025-04-28T12:00:00Z'
  //   },
  //   {
  //     version: 'V11',
  //     author: 'Nicola Lanzilotto',
  //     updatedAt: '2025-04-27T10:00:00Z'
  //   },
  //   {
  //     version: 'V10',
  //     note: 'oila version',
  //     author: 'Nicola Lanzilotto',
  //     updatedAt: '2025-04-27T09:00:00Z'
  //   },
  //   {
  //     version: 'V9',
  //     author: 'Nicola Lanzilotto',
  //     updatedAt: '2025-04-26T16:00:00Z'
  //   }
  // ];

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private faqKbService: FaqKbService,
    private dashboardService: DashboardService,
    public appConfigService: AppConfigService,
     private translate: TranslateService
  ) { }

  ngOnInit(): void {
    moment.locale('en');

    this.imageStorageURL = ''
    const uploadEngine = this.appConfigService.getConfig().uploadEngine;
    this.logger.log('[CDS-PUBLISH-HISTORY] - puploadEngine ', uploadEngine)
    if (uploadEngine === 'firebase') {
      const firebase_conf = this.appConfigService.getConfig().firebaseConfig
      this.imageStorageURL = firebase_conf['storageBucket']
      this.logger.log('[CDS-PUBLISH-HISTORY] - photo profile case URL use case Firebase ', this.imageStorageURL)
    } else {
      this.imageStorageURL = this.appConfigService.getConfig().SERVER_BASE_URL
      this.logger.log('[CDS-PUBLISH-HISTORY] - photo profile case URL use case Native ', this.imageStorageURL)
    }
    this.logger.log('[CDS-PUBLISH-HISTORY] uploadEngine ', uploadEngine)
    this.selectedChatbot = this.dashboardService.selectedChatbot
    this.logger.log('[CDS-PUBLISH-HISTORY] selectedChatbot ', this.selectedChatbot)
    if (this.selectedChatbot) {
      this.getReleaseHistory(this.selectedChatbot._id)
    }
  }

  ngAfterViewInit() {
    // this.logger.log(`textRefs: ${this.textRefs.length}`);
    this.textRefs.changes.subscribe(() => {
      setTimeout(() => this.measureText(), 0);
    });
  }

  measureText() {
    this.lineCounts = [];
    this.expandedIndexes = [];

    // this.textRefs.forEach((ref, index) => {
    this.cloneRefs.forEach((ref, index) => {
      const el = ref.nativeElement as HTMLElement;
      this.logger.log('[CDS-PUBLISH-HISTORY] el ', el)
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      const lines = Math.round(el.offsetHeight / lineHeight);

      this.lineCounts[index] = lines;
      this.logger.log('[CDS-PUBLISH-HISTORY] lines ', lines)
      this.expandedIndexes[index] = false; // initially collapsed
    });
  }

  toggleExpand(index: number) {
    this.expandedIndexes[index] = !this.expandedIndexes[index];
  }

  getReleaseHistory(chatbotid: string) {
    this.faqKbService.getBotReleaseHistory(chatbotid).subscribe({
      next: (_releases: Chatbot) => {
        this.logger.log('[CDS-PUBLISH-HISTORY] - GET BOT RELEASE HISTORY - RES ', _releases);
        if (_releases) {
          this.releases = _releases
          this.releases.forEach(release => {

            this.manageUserAvatar(release.publishedBy)
            this.logger.log('[CDS-PUBLISH-HISTORY] - GET BOT RELEASE HISTORY - release > publishedBy ', release.publishedBy);
            const formattedDate = moment(release.publishedAt).locale('en').format('MMMM D, YYYY h:mm A')
            release['formattedDate'] = formattedDate
            // this.logger.log('[CDS-PUBLISH-HISTORY] - GET BOT RELEASE HISTORY - release publishedAt  formattedDate', formattedDate);

          });
        }

      },
      error: (error) => {
        this.logger.error('[CDS-PUBLISH-HISTORY] - GET BOT RELEASE HISTORY - ERROR: ', error);

      },
      complete: () => {
        this.logger.log('[CDS-PUBLISH-HISTORY] - GET BOT RELEASE HISTORY * COMPLETE * ');
      }
    })
  }

  manageUserAvatar(projectuser: any) {
    projectuser.loadingImage = true; // set loading flag before checking
    const userid = projectuser._id
    this.logger.log('[CDS-PUBLISH-HISTORY] manageUserAvatar ',userid )
    // Set image URL based on your upload engine
    let imgUrl = '';
    if (this.appConfigService.getConfig().uploadEngine === 'firebase') {
      imgUrl = `https://firebasestorage.googleapis.com/v0/b/${this.imageStorageURL}/o/profiles%2F${userid}%2Fphoto.jpg?alt=media`;
    } else {
      imgUrl = `${this.imageStorageURL}images?path=uploads%2Fusers%2F${userid}%2Fimages%2Fthumbnails_200_200-photo.jpg`;
    }

    // Check if image exists
    this.checkImageExists(imgUrl, (existsImage) => {
      setTimeout(() => {
        projectuser.loadingImage = false;
      }, 0);
    
      projectuser.hasImage = existsImage;
    });

     // Set initials and color
    this.createUserAvatar(projectuser);
  }


  createUserAvatar(user: any) {
    let fullname = '';
    if (user.firstname && user.lastname) {
      fullname = user.firstname + ' ' + user.lastname;
    } else if (user.firstname) {
      fullname = user.firstname;
    }
  
    user.fullname_initial = avatarPlaceholder(fullname);
    user.fillColour = getColorBck(fullname);
  }

  checkImageExists(imageUrl, callBack) {
    var imageData = new Image()
    imageData.onload = function () {
      callBack(true)
    }
    imageData.onerror = function () {
      callBack(false)
    }
    imageData.src = imageUrl
  }

  getUserImageUrl(user: any): string {
    if (this.appConfigService.getConfig().uploadEngine === 'firebase') {
      return `https://firebasestorage.googleapis.com/v0/b/${this.imageStorageURL}/o/profiles%2F${user._id}%2Fphoto.jpg?alt=media`;
    } else {
      return `${this.imageStorageURL}images?path=uploads%2Fusers%2F${user._id}%2Fimages%2Fthumbnails_200_200-photo.jpg`;
    }
  }
  
  restoreRelease(release: Chatbot) {
    this.logger.log('[CDS-PUBLISH-HISTORY] - Restore release chatbot ', release);
    this.logger.log('[CDS-PUBLISH-HISTORY] - Restore release chatbot name ', release.name);
    this.logger.log('[CDS-PUBLISH-HISTORY] - Restore release chatbot formattedDate ', release['formattedDate']);
    swal({
      // title: `Are you sure you want to restore the Flow ${release['name']} to ${release['formattedDate']} version?`,
      title: this.translate.instant(('AreYouSureYouWantToRestore'), {release_name: release.name, release_date:release['formattedDate']}),
      text: this.translate.instant("ThisOperationWillReplaceTheCurrentlyPublishedFlow"),
      icon: "warning",
      buttons: ["Cancel", 'Continue'],
      dangerMode: false,
      className: "swal-restore"
    })
      .then((WillRestore) => {
        if (WillRestore) {

          this.faqKbService.publish(this.selectedChatbot, release._id, null).subscribe({
            next: (data) => {
              this.logger.log('[CDS DSBRD] publish  - RES ', data)
            },
            error: (error) => {

              swal('An error has occurred', {
                icon: "error",
              });
              this.logger.error('[CDS-PUBLISH-HISTORY] publish ERROR ', error);
            },
            complete: () => {
              this.getReleaseHistory(this.selectedChatbot._id)
              this.logger.log('[CDS-PUBLISH-HISTORY] publish * COMPLETE *');
              swal("Done!", `The Flow has been successfully restored to ${release['formattedDate']} version.`, {
                icon: "success",
                className: "swal-restore"
              }).then((okpressed) => {

              });

            }
          });
        }
      });
  }




}

