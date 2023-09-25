import { Component, Input, OnInit, ViewChild, isDevMode } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NgSelectComponent } from '@ng-select/ng-select';
import { CdsPublishOnCommunityModalComponent } from 'app/chatbot-design-studio/cds-dashboard/utils/cds-publish-on-community-modal/cds-publish-on-community-modal.component';
import { CERTIFIED_TAGS } from 'app/chatbot-design-studio/utils';
import { AuthService } from 'app/core/auth.service';
import { NotifyService } from 'app/core/notify.service';
import { Chatbot } from 'app/models/faq_kb-model';
import { Project } from 'app/models/project-model';
import { FaqKbService } from 'app/services/faq-kb.service';
import { LoggerService } from 'app/services/logger/logger.service';
import { UsersService } from 'app/services/users.service';
const swal = require('sweetalert');

@Component({
  selector: 'cds-detail-community',
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss']
})
export class CDSDetailCommunityComponent implements OnInit {

  @ViewChild(NgSelectComponent, { static: false }) ngSelect: NgSelectComponent

  @Input() selectedChatbot: Chatbot
  @Input() project: Project;
  @Input() translationsMap: Map<string, string> = new Map();


  tagsList: Array<any> = []
  tags: Array<any> = []
  tag: any;

  certifiedTag: { name: string, color: string }
  certifiedTags = CERTIFIED_TAGS

  certifiedTagNotSelected: boolean;
  titleIsEmpty: boolean;
  shortDescriptionIsEmpty: boolean;
  userWebsite: string;
  userPlublicEmail: string;
  userDescription: string;
  user: any;
  userCmntyInfo = false;
  seeAll: any;
  seeUserCmntyInfo: boolean = false;
  hasPersonalCmntyInfo: boolean = false;
  constructor(
    private logger: LoggerService,
    public dialog: MatDialog,
    private faqKbService: FaqKbService,
    private notify: NotifyService,
    private usersService: UsersService,
    private auth: AuthService,
  ) { }

  displayUserCommunityInfo(seeUserCmntyInfo) {
    this.logger.log('displayUserCommunityInfo ', seeUserCmntyInfo)
    if (seeUserCmntyInfo === false) {
      this.userCmntyInfo = false;
    } else {
      this.userCmntyInfo = true;
    }
  }

  ngOnInit(): void {
    this.logger.log('[CDS-DETAIL-COMMUNITY] onInit-->', this.selectedChatbot)
    if (this.selectedChatbot && this.selectedChatbot.tags) {
      this.tagsList = this.selectedChatbot.tags
    }
    if (this.selectedChatbot && this.selectedChatbot.certifiedTags && this.selectedChatbot.certifiedTags.length > 0) {
      this.certifiedTag = this.selectedChatbot.certifiedTags[0]
    }
    this.logger.log('[CDS-DETAIL-COMMUNITY] onInit-->', this.certifiedTag)

    this.getLoggedUserAndUserCommunityProfile()
  }

  getLoggedUserAndUserCommunityProfile() {
    this.auth.user_bs.subscribe((user) => {
      this.logger.log('[CDS-DETAIL-COMMUNITY] - GET LOGGED USER - USER', user)

      if (user) {
        this.user = user;
        this.getUserCommunityProfile(this.user._id)
      }
    })

  }

  getUserCommunityProfile(user_id: string) {
    this.usersService.getCurrentUserCommunityProfile(user_id)
      .subscribe((userCmntyProfile) => {
        this.logger.log('[CDS-DETAIL-COMMUNITY] GET CURRENT  USER CMNTY PROFILE RES ', userCmntyProfile)
        if (userCmntyProfile) {
          if (userCmntyProfile['description']) {
            this.userDescription = userCmntyProfile['description'];
            this.logger.log('[CDS-DETAIL-COMMUNITY] GET CURRENT  USER CMNTY PROFILE > description ', this.userDescription)
            this.hasPersonalCmntyInfo = true;
          } else {
            this.userDescription = undefined
          }

          if (userCmntyProfile['public_email']) {
            this.userPlublicEmail = userCmntyProfile['public_email'];
            this.logger.log('[CDS-DETAIL-COMMUNITY] GET CURRENT  USER CMNTY PROFILE > public_email ', this.userPlublicEmail)
            this.hasPersonalCmntyInfo = true;
          } else {
            this.userPlublicEmail = undefined
          }

          if (userCmntyProfile['public_website']) {
            this.userWebsite = userCmntyProfile['public_website'];
            this.logger.log('[CDS-DETAIL-COMMUNITY] GET CURRENT  USER CMNTY PROFILE > userWebsite ', this.userWebsite)
            this.hasPersonalCmntyInfo = true;
          } else {
            this.userWebsite = undefined
          }
        }

        if (this.userDescription === undefined && this.userPlublicEmail=== undefined && this.userWebsite === undefined) {
          this.logger.log('[CDS-DETAIL-COMMUNITY] hasPersonalCmntyInfo (1)' ,  this.hasPersonalCmntyInfo)
          this.hasPersonalCmntyInfo = false;
        }



      }, (error) => {
        this.logger.error('[CDS-DETAIL-COMMUNITY] GET CURRENT USER CMNTY PROFILE -  ERROR ', error);


      }, () => {
        this.logger.log('[CDS-CHATBOT-DTLS] GET CURRENT USER PROFILE - * COMPLETE *');
      })
  }


  // --------------------------------------------------------------------------------
  // Tags 
  // --------------------------------------------------------------------------------
  createNewTag = (newTag: string) => {
    this.logger.log("Create New TAG Clicked -> newTag: " + newTag)
    var index = this.tagsList.findIndex(t => t.tag === newTag);
    if (index === -1) {
      this.logger.log("Create New TAG Clicked - Tag NOT exist")
      this.tagsList.push(newTag)
      this.logger.log("Create New TAG Clicked - chatbot tag tagsList : ", this.tagsList)

      let self = this;
      this.logger.log(' this.ngSelect', this.ngSelect)
      if (this.ngSelect) {
        this.ngSelect.close()
        this.ngSelect.blur()
      }

      self.selectedChatbot.tags = this.tagsList
      // self.updateChatbot(self.selectedChatbot)

    } else {
      this.logger.log("Create New TAG Clicked - Tag already exist ")

    }
  }

  removeTag(tag: string) {
    // if (this.DISABLE_ADD_NOTE_AND_TAGS === false) {
    this.logger.log('[CDS-DETAIL-COMMUNITY] - REMOVE TAG - tag TO REMOVE: ', tag);
    var index = this.tagsList.indexOf(tag);
    if (index !== -1) {
      this.tagsList.splice(index, 1);
    }
    this.selectedChatbot.tags = this.tagsList
    // this.updateChatbot(this.selectedChatbot)
    this.logger.log('[CDS-DETAIL-COMMUNITY] -  REMOVE TAG - TAGS ARRAY AFTER SPLICE: ', this.tagsList);

  }

  // are you sure to publish on the community without your Personal information
  publishOnCommunity() {
    this.logger.log('[CDS-DETAIL-COMMUNITY] hasPersonalCmntyInfo (2)' ,  this.hasPersonalCmntyInfo)
    this.logger.log('openDialog')
    const dialogRef = this.dialog.open(CdsPublishOnCommunityModalComponent, {
      data: {
        chatbot: this.selectedChatbot,
        projectId: this.project._id,
        personalCmntyInfo: this.hasPersonalCmntyInfo
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      this.logger.log(`Dialog result: ${result}`);


      if (result === 'has-published-on-cmnty') {
        if (!isDevMode()) {
          try {
            window['analytics'].track("Publish on community", {
              "type": "organic",
              "first_name": this.user.firstname,
              "last_name": this.user.lastname,
              "email": this.user.email,
              'userId': this.user._id,
              'botId': this.selectedChatbot._id,
              'bot_name': this.selectedChatbot.name,
            });
          } catch (err) {
            this.logger.error('track signup event error', err);
          }
        }
      }
    });

  }

  removeFromCommunity() {

    swal({
      title: "Are you sure",
      text: 'You are about to remove the chatbot from the community',
      icon: "warning",
      buttons: ["Cancel", 'Remove'],
      dangerMode: false,
    })
      .then((WillRemove) => {
        if (WillRemove) {
          this.logger.log('[CDS DSBRD] removeFromCommunity swal WillRemove', WillRemove)
          this.selectedChatbot.public = false
          this.faqKbService.updateChatbot(this.selectedChatbot).subscribe((data) => {
            this.logger.log('[CDS DSBRD] removeFromCommunity - RES ', data)
          }, (error) => {
            swal('An error has occurred', {
              icon: "error",
            });
            this.logger.error('[CDS DSBRD] removeFromCommunity ERROR ', error);
          }, () => {
            this.logger.log('[CDS DSBRD] removeFromCommunity * COMPLETE *');
            if (!isDevMode()) {
              try {
                window['analytics'].track("Removed from community", {
                  "type": "organic",
                  "first_name": this.user.firstname,
                  "last_name": this.user.lastname,
                  "email": this.user.email,
                  'userId': this.user._id,
                  'botId': this.selectedChatbot._id,
                  'bot_name': this.selectedChatbot.name,
                });
              } catch (err) {
                this.logger.error('track signup event error', err);
              }
            }

            swal("Done!", "The Chatbot has been removed from the community", {
              icon: "success",


            }).then((okpressed) => {

            });
          });
        } else {
          this.logger.log('[CDS DSBRD] removeFromCommunity (else)')
        }
      });

  }

  _publishOnCommunity() {
    swal({
      title: "Publish the chatbot",
      text: 'You are about to publish the chatbot in the community',
      icon: "info",
      buttons: ["Cancel", 'Publish'],
      dangerMode: false,
    })
      .then((WillPublish) => {
        if (WillPublish) {
          this.logger.log('[CDS DSBRD] publishOnCommunity swal WillPublish', WillPublish)
          this.selectedChatbot.public = true
          this.faqKbService.updateChatbot(this.selectedChatbot).subscribe((data) => {
            this.logger.log('[CDS DSBRD] publishOnCommunity - RES ', data)
          }, (error) => {
            swal('An error has occurred', {
              icon: "error",
            });
            this.logger.error('[CDS DSBRD] publishOnCommunity ERROR ', error);
          }, () => {
            this.logger.log('[CDS DSBRD] publishOnCommunity * COMPLETE *');
            swal("Done!", "The Chatbot has been published in the community", {
              icon: "success",
            }).then((okpressed) => {

            });
          });
        } else {
          this.logger.log('[CDS DSBRD] publishOnCommunity (else)')
        }
      });
  }

  addMainCategory(category) {
    this.logger.log('[CDS-DETAIL-COMMUNITY] addMainCategory -->', category)
    if (category) {
      this.selectedChatbot.certifiedTags = [category]
      this.certifiedTagNotSelected = false
    }
  }

  onChangeTitle(event) {
    this.logger.log('[CDS-DETAIL-COMMUNITY] onChangeTitle > event', event)
    if (event.length > 0) {
      this.titleIsEmpty = false
    } else {
      this.titleIsEmpty = true
      this.selectedChatbot.title = undefined
    }
  }

  onChangeShortDescription(event) {
    this.logger.log('[CDS-DETAIL-COMMUNITY] onChangeShortDescription > event', event)
    if (event.length > 0) {
      this.shortDescriptionIsEmpty = false
    } else {
      this.shortDescriptionIsEmpty = true
      this.selectedChatbot.short_description = undefined
    }
  }


  update() {
    if (!this.certifiedTag) {
      this.certifiedTagNotSelected = true
    }

    if (!this.selectedChatbot.title) {
      this.titleIsEmpty = true
    }

    if (!this.selectedChatbot.short_description) {
      this.shortDescriptionIsEmpty = true
    }

    if (!this.certifiedTag || !this.selectedChatbot.title || !this.selectedChatbot.short_description) {
      return
    }
    this.logger.log('[CDS-DETAIL-COMMUNITY] updateDataOnCommunity chatbot -->', this.selectedChatbot)
    this.faqKbService.updateChatbot(this.selectedChatbot).subscribe((chatbot) => {
      this.logger.log('[CDS-DETAIL-COMMUNITY] UPDATE CHATBOT DATA ON CMNTY RES ', chatbot)
    }, (error) => {
      this.logger.error('[CDS-CHATBOT-DTLS] EDIT BOT -  ERROR ', error);


      // =========== NOTIFY ERROR ===========
      this.notify.showWidgetStyleUpdateNotification(this.translationsMap.get('UpdateBotError'), 4, 'report_problem');

    }, () => {
      this.logger.log('[CDS-CHATBOT-DTLS] EDIT BOT - * COMPLETE *');
      // =========== NOTIFY SUCCESS===========
      this.notify.showWidgetStyleUpdateNotification(this.translationsMap.get('UpdateBotSuccess'), 2, 'done');
      this.selectedChatbot.name
    })
  }
  // -----------------------------------
  // User community info
  // -----------------------------------
  onChangeUserWebsite(event) {
    this.logger.log('[CDS-DETAIL-COMMUNITY] onChangeUserWebsite > event', event)
  }


  updateUserProfile() {
    this.logger.log('[CDS-DETAIL-COMMUNITY] UPDATE USER PROFILE, ')
    this.usersService.updateUserWithCommunityProfile(this.userWebsite, this.userPlublicEmail, this.userDescription)
      .subscribe((userProfile) => {
        this.logger.log('[CDS-DETAIL-COMMUNITY] UPDATE USER PROFILE RES ', userProfile)
        if(userProfile['updatedUser']['description'] === "" && userProfile['updatedUser']['public_email'] === "" &&  userProfile['updatedUser']['public_website'] === "") {
          this.hasPersonalCmntyInfo = false;
          this.logger.log('[CDS-DETAIL-COMMUNITY] UPDATE USER PROFILE RES > hasPersonalCmntyInfo', this.hasPersonalCmntyInfo)
        } else {
          this.hasPersonalCmntyInfo = true;
          this.logger.log('[CDS-DETAIL-COMMUNITY] UPDATE USER PROFILE RES > hasPersonalCmntyInfo', this.hasPersonalCmntyInfo)
        }

      
      }, (error) => {
        this.logger.error('[CDS-DETAIL-COMMUNITY] UPDATE USER PROFILE -  ERROR ', error);
        // =========== NOTIFY ERROR ===========
        this.notify.showWidgetStyleUpdateNotification('An error occurred while updating your user profile', 4, 'report_problem');

      }, () => {
        this.logger.log('[CDS-CHATBOT-DTLS] UPDATE USER PROFILE - * COMPLETE *');
        // =========== NOTIFY SUCCESS===========
        this.notify.showWidgetStyleUpdateNotification('User profile updated successfully', 2, 'done');

      })

  }


  goToCommunityChatbotDetail(bot_id: string) {
    let urlCommunity = 'https://tiledesk.com/community/search/getchatbotinfo/chatbotId/' + bot_id + '-' + this.selectedChatbot.title.replace(/[^a-zA-Z0-9]/g, '-')
    window.open(urlCommunity, '_blank')

  }


}
