import { Component, OnInit, OnDestroy, Input, ElementRef } from '@angular/core';

@Component({
  selector: 'user-typing',
  templateUrl: './user-typing.component.html',
  styleUrls: ['./user-typing.component.scss'],
})
export class UserTypingComponent implements OnInit, OnDestroy {

 // @Input() idConversation: string;
  // @Input() idCurrentUser: string;
  // @Input() isDirect: boolean;
  @Input() typingLocation: string = 'content'
  @Input() translationMap: Map<string, string>;
  @Input() themeColor: string;
  @Input() idUserTypingNow: string;
  @Input() nameUserTypingNow: string;
  // @Input() membersConversation: [string];

  constructor(private elementRef: ElementRef) { }

  /** */
  ngOnInit() {
    this.elementRef.nativeElement.style.setProperty('--themeColor', this.themeColor);
  }

  /** */
  ngOnDestroy() {
  }


}
