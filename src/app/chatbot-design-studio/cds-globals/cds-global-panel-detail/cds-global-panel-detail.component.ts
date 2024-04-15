import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Global } from '../../../models/global-model';
import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'cds-global-panel-detail',
  templateUrl: './cds-global-panel-detail.component.html',
  styleUrls: ['./cds-global-panel-detail.component.scss']
})
export class CdsGlobalPanelDetailComponent implements OnInit {

  @Input() global:Global
  @Output() onGlobalChange = new EventEmitter<{type: 'add' | 'edit' | 'delete' | 'return', element: Global | null}>();
  
  globalForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(){
    this.globalForm = this.createGlobalForm();
    if(this.global){
      this.globalForm.patchValue({ 'key': this.global.key, 'value': this.global.value })
    }
  }

  createGlobalForm(): FormGroup {
    return this.formBuilder.group({
      // key: ['', [Validators.required, Validators.pattern('({{.*[A-Za-z0-9\_]+}}$)|([A-za-z0-9\_]+)')]], // (group1: get {{[A-za-z0-0\_]}}) | (group2: get[A-za-z0-0\_] )
      key: ['', [Validators.required, Validators.pattern('([a-zA-Z0-9_]+)')]],
      value: ['', [Validators.required]]
    })
  }


  onDelete() {
    this.onGlobalChange.emit({type: 'delete', element: null})
  }

  onCancel() {
    this.onGlobalChange.emit({type: 'return', element: null})
  }

  onUpdate(){
    if(this.globalForm.valid){
      this.onGlobalChange.emit({type: 'edit', element: this.globalForm.value})
      this.globalForm.reset();
    }
  }
  onAdd(){
    if(this.globalForm.valid){
      this.onGlobalChange.emit({type: 'add', element: this.globalForm.value})
      this.globalForm.reset();
    }
  }

}
