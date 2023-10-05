import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-addkb-dialog',
  templateUrl: './addkb-dialog.component.html',
  styleUrls: ['./addkb-dialog.component.scss']
})
export class AddkbDialogComponent implements OnInit {

  disableSubmit: boolean = true;
  kbForm: FormGroup;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<AddkbDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) { }

  ngOnInit(): void {
    this.logger.log("Add Knowledge base dialog - OPENED");
    this.kbForm = this.createConditionGroup();
  }

  onChangeInput(event, target):void {
    // this.logger.log("----> event: ", event);

    // if (target === 'url') {
    //   const regexPattern = '(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?';
    //   let REGEX = new RegExp(regexPattern.replace(/\//gi, ''));
    //   if (REGEX.test(event) && event !== '' && this.data.name !== ''){
    //     this.btnDisabled = false;
    //   } else {
    //     this.btnDisabled = true;
    //   }
    // }
    if (this.kbForm.valid) {
      this.disableSubmit = false;
    } else {
      this.disableSubmit = true;
    }
  }
  
  createConditionGroup(): FormGroup {
    return this.formBuilder.group({
      name: ['', Validators.required],
      url:  ['', [Validators.required, Validators.pattern('(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?')]]
    })
  }

  onSubmitKb() {
    this.logger.log("onSubmitKb: ", this.kbForm)
    if (this.kbForm.valid) {
      this.logger.log("abilita il bottone")
      this.disableSubmit = false;
    } else {
      this.logger.log("disabilita il bottone")
      this.disableSubmit = true;
    }
  }

  onCloseDialog(): void {
    // ADD CONTROLS!!!!
    // NOT NECESSARY???
    this.logger.log("Add Knowledge base dialog - CLOSED");
    this.dialogRef.close();
  }

}
