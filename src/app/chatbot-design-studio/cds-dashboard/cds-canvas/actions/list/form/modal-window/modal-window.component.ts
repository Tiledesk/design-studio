import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'appdashboard-modal-window',
  templateUrl: './modal-window.component.html',
  styleUrls: ['./modal-window.component.scss']
})
export class ModalWindowComponent implements OnInit {
  @Output() confirmDeleteModal = new EventEmitter();
  @Output() closeDeleteModal = new EventEmitter();
  @Input() translateMap: any;
  @Input() objectId: string;

  constructor() { }

  ngOnInit(): void {
  }

  confirmDelete() {
    this.confirmDeleteModal.emit(this.objectId);
  }

  closeDelete() {
    this.closeDeleteModal.emit();
  }

}
