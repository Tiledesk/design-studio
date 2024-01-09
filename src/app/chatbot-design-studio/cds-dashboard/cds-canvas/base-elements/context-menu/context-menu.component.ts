import { Component, OnInit, HostListener, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { IntentService } from '../../../../services/intent.service';

@Component({
  selector: 'cds-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent implements OnInit {
  @Input() positions: any;
  @Output() hideContextMenu = new EventEmitter();

  MENU_ITEMS: any;
  isPasteButtonDisabled: boolean = false;

  constructor(
    private el: ElementRef,
    public intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.addDocumentClickListener();
    this.MENU_ITEMS = ['paste'];
  }

  ngAfterViewInit() {
    // ---------------------------------------
    // load localstorage
    // ---------------------------------------
    let copyPasteTEMP = JSON.parse(localStorage.getItem('copied_items'));
    if(copyPasteTEMP){
      this.intentService.arrayCOPYPAST = copyPasteTEMP['copy'];
    }
    if(this.intentService.arrayCOPYPAST.length === 0){
      this.isPasteButtonDisabled = true;
    }
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event): void {
    console.log('[CDS-CONTEXT-MENU] click:: ', this.el.nativeElement, event.target);
    if (!this.el.nativeElement.contains(event.target)) {
      this.onHideContextMenu();
    }
  }

  onHideContextMenu(): void {
    console.log('[CDS-CONTEXT-MENU] hideContextMenu:: ');
    this.hideContextMenu.emit();
    this.removeDocumentClickListener();
  }

  onClickedMenuButton(item){
    console.log('[CDS-CONTEXT-MENU] onClickedMenuButton', item, this.positions);
    if(item === 'paste'){
      this.intentService.pasteElementToStage(this.positions);
    }
    this.onHideContextMenu();
  }

  private addDocumentClickListener(): void {
    console.log('[CDS-CONTEXT-MENU] addDocumentClickListener:: ');
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  private removeDocumentClickListener(): void {
    console.log('[CDS-CONTEXT-MENU] removeDocumentClickListener:: ');
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }
}
