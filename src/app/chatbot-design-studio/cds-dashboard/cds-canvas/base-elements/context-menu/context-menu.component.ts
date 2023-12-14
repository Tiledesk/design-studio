import { Component, OnInit, HostListener, ElementRef, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'cds-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent implements OnInit {
  @Output() hideContextMenu = new EventEmitter();

  ACTION_CATEGORY: any;
  constructor(
    private el: ElementRef
  ) { }

  ngOnInit(): void {
    this.addDocumentClickListener();
    this.ACTION_CATEGORY = ['incolla'];
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

  private addDocumentClickListener(): void {
    console.log('[CDS-CONTEXT-MENU] addDocumentClickListener:: ');
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  private removeDocumentClickListener(): void {
    console.log('[CDS-CONTEXT-MENU] removeDocumentClickListener:: ');
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }
}
