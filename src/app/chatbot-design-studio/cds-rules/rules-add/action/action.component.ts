import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormGroup, FormGroupDirective } from '@angular/forms';

@Component({
  selector: 'rule-action',
  templateUrl: './action.component.html',
  styleUrls: ['./action.component.scss']
})
export class ActionComponent implements OnInit {

  @Input() autocompleteOptions: string[]
  actionForm: FormGroup;
  constructor(private rootFormGroup: FormGroupDirective,) { }

  ngOnInit(): void {
    this.actionForm = this.rootFormGroup.control.get('do') as FormGroup;
  }

  onChangeDelayTime(number){
    this.actionForm.controls[0].patchValue({wait: number})
  }


}
