import { Component, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

import { LIST_JSON_MODEL_REPLY_V1, LIST_JSON_MODEL_REPLY_V2, JSON_MODEL_PLACEHOLDER } from 'src/app/chatbot-design-studio/utils-jsonbuttons';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { TYPE_ACTION } from 'src/app/chatbot-design-studio/utils-actions';
import { DOCS_LINK } from 'src/app/chatbot-design-studio/utils';
import { CDSTextareaComponent } from 'src/app/chatbot-design-studio/cds-dashboard/cds-canvas/base-elements/textarea/textarea.component';

@Component({
  selector: 'cds-action-reply-jsonbuttons-new',
  templateUrl: './cds-action-reply-jsonbuttons-new.component.html',
  styleUrls: ['./cds-action-reply-jsonbuttons-new.component.scss']
})
export class CdsActionReplyJsonbuttonsNewComponent implements OnInit {
  @Input() jsonBody: string;
  /** Optional override of the examples list. When provided, takes precedence over the default buttons/gallery list. */
  @Input() examplesList: any[] | null = null;
  /** Translation key for the "+ Add" pill and section title. Defaults to JSON buttons. */
  @Input() addLabelKey: string = 'CDSCanvas.JsonButtons';
  /** Translation key for the trailing "More on …" footer label. */
  @Input() footerTitleKey: string = 'CDSCanvas.JSONButtons';
  /** Optional override of the docs link object. */
  @Input() docsLink: any = null;
  /** Label used for the locally-saved entry at the top of the menu. */
  @Input() savedItemName: string = 'My JSON Buttons';
  @Output() changeJsonButtons = new EventEmitter();

  @ViewChild('jsonCdsTextarea') jsonCdsTextarea: CDSTextareaComponent;

  showJsonSection: boolean = false;
  showJsonBody: boolean = false;
  isEditing: boolean = false;
  selectOpen: boolean = false;
  selectedExample: any = null;
  highlightedJson: SafeHtml = '';
  jsonPlaceholder: string = JSON_MODEL_PLACEHOLDER;
  listType: any[] = [];
  link: any;

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly intentService: IntentService,
    private readonly sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.initialize();
  }

  initialize() {
    const baseList = this.examplesList && this.examplesList.length
      ? this.examplesList
      : (this.intentService.selectedAction?._tdActionType !== TYPE_ACTION.REPLY
          ? LIST_JSON_MODEL_REPLY_V2
          : LIST_JSON_MODEL_REPLY_V1);
    this.link = this.docsLink || DOCS_LINK.JSON_BUTTONS;

    if (this.jsonBody && this.jsonBody.trim() !== '') {
      this.showJsonSection = true;
      this.showJsonBody = true;
      this.updateHighlight(this.jsonBody);
      const match = baseList.find(i => i.value.trim() === this.jsonBody.trim());
      if (match) {
        this.listType = baseList;
        this.selectedExample = match;
      } else {
        const myItem = { name: this.savedItemName, meta: 'saved', value: this.jsonBody };
        this.listType = [myItem, ...baseList];
        this.selectedExample = myItem;
      }
    } else {
      this.listType = baseList;
      this.jsonBody = '';
      this.showJsonSection = false;
      this.showJsonBody = false;
    }
  }

  enterEditMode() {
    this.isEditing = true;
    setTimeout(() => {
      this.jsonCdsTextarea?.elTextarea?.focus();
    }, 0);
  }

  toggleSelect() {
    this.selectOpen = !this.selectOpen;
  }

  closeSelect() {
    this.selectOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.selectOpen = false;
  }

  selectExample(item: any) {
    this.selectedExample = item;
    this.selectOpen = false;
    this.jsonBody = item.value;
    this.showJsonBody = true;
    this.isEditing = false;
    this.updateHighlight(item.value);
    this.changeJsonButtons.emit(this.jsonBody);
  }

  onClickJsonButtons() {
    this.showJsonSection = true;
    this.showJsonBody = false;
    this.isEditing = false;
  }

  onDeleteJsonButtons() {
    this.jsonBody = '';
    this.showJsonSection = false;
    this.showJsonBody = false;
    this.isEditing = false;
    this.selectedExample = null;
    this.highlightedJson = '';
    this.changeJsonButtons.emit();
  }

  onChangeJsonTextarea(text: string) {
    this.jsonBody = text || '';
    const match = this.listType.find(i => i.value.trim() === this.jsonBody.trim());
    this.selectedExample = match ?? null;
  }

  onBlurJsonTextarea(event: Event) {
    this.logger.log('[ACTION REPLY jsonbuttons-new] onBlurJsonTextarea ', event);
    const json = (event.target as HTMLTextAreaElement)?.value ?? this.jsonBody;
    this.jsonBody = json;
    this.isEditing = false;
    if (this.jsonBody.trim()) {
      this.showJsonBody = true;
      this.updateHighlight(this.jsonBody);
      this.syncMyJsonButton();
    } else {
      this.showJsonBody = false;
    }
    this.changeJsonButtons.emit(this.jsonBody);
  }

  private syncMyJsonButton() {
    const baseList = this.listType.filter(i => i.meta !== 'saved');
    const match = baseList.find(i => i.value.trim() === this.jsonBody.trim());
    if (match) {
      this.listType = baseList;
      this.selectedExample = match;
    } else {
      const myItem = { name: this.savedItemName, meta: 'saved', value: this.jsonBody };
      this.listType = [myItem, ...baseList];
      this.selectedExample = myItem;
    }
  }

  private updateHighlight(json: string) {
    const escaped = json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const highlighted = escaped
      .replace(/"([^"]+)"(\s*:)/g, '<span class="jk">"$1"</span>$2')
      .replace(/:\s*"([^"]*)"/g, ': <span class="js">"$1"</span>')
      .replace(/([{}[\],])/g, '<span class="jp">$1</span>');

    this.highlightedJson = this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
