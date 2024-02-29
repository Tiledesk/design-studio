import { CONTEXT_MENU_ITEMS } from './../../../../utils-menu';
import { Component, OnInit, HostListener, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { IntentService } from '../../../../services/intent.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

@Component({
  selector: 'cds-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent implements OnInit {
  @Input() positions: any;
  @Output() hideContextMenu = new EventEmitter();

  CONTEXT_MENU_ITEMS = CONTEXT_MENU_ITEMS;
  isPasteButtonDisabled: boolean = false;

  constructor(
    private el: ElementRef,
    private appStorageService: AppStorageService,
    public intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.addDocumentClickListener();
  }

  ngAfterViewInit() {
    // ---------------------------------------
    // load localstorage
    // ---------------------------------------
    let copyPasteTEMP = JSON.parse(this.appStorageService.getItem('copied_items'));
    if(copyPasteTEMP){
      this.intentService.arrayCOPYPAST = copyPasteTEMP['copy'];
    }
    if(this.intentService.arrayCOPYPAST.length === 0){
      this.isPasteButtonDisabled = true;
    }
  }

  onMenuOptionFN(item: { key: string, label: string, icon: string, src?: string}){
    switch(item.key){
      case 'PASTE':{
        this.intentService.pasteElementToStage(this.positions);
        break;
      }
    }
    this.onHideContextMenu();
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.onHideContextMenu();
    }
  }

  onHideContextMenu(): void {
    this.hideContextMenu.emit();
    this.removeDocumentClickListener();
  }

  private addDocumentClickListener(): void {
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  private removeDocumentClickListener(): void {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }
}
