import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';


@Component({
  selector: 'appdashboard-attributes-dialog',
  templateUrl: './attributes-dialog.component.html',
  styleUrls: ['./attributes-dialog.component.scss']
})
export class AttributesDialogComponent implements OnInit {

  btn_disabled: boolean = false;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<AttributesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.logger.debug("[AttributesDialog] data: ", this.data);
    if (this.data.attributes.find(a => a.value === null || a.value === '')){
      this.btn_disabled = true;
    }
  }

  onCloseDialog(): void {
    this.logger.log("[AttributesDialog] - modal CLOSED");
    this.dialogRef.close();
  }

  onChangeTextarea(text, key) {
    this.btn_disabled = false;
    this.data.attributes.find(a => a.name === key).value = text
    if (this.data.attributes.find(a => a.value === null || a.value === '')){
      this.btn_disabled = true;
    }
  }

  onGenerateClick() {
    this.data.attributes.forEach((attr) => {
      let old_value = "{{" + attr.name + "}}";
      this.data.question = this.data.question.replace(old_value, attr.value);
      if(this.data.namespace){
        this.data.namespace =  this.data.namespace.replace(old_value, attr.value);
      }
    })

    this.logger.log("[AttributesDialog] - onGenerateClick return data: ", this.data);
    this.dialogRef.close(this.data);
  }


  // createConditionGroup(): FormGroup {
  //   return this.formBuilder.group({
  //     attributes: this.formBuilder.array([
  //       this.createAttributesGroup()
  //     ])  
  //   })
  // }

  // createAttributesGroup(): FormGroup {
  //   return this.formBuilder.group({
  //     name: ['', Validators.required],
  //     value: ['', Validators.required]
  //   })
  // }

  // setFormValue() {
  //   let attributesControl = <FormArray>this.varsForm.controls.attributes;
  //   this.data.attributes.forEach((v) => {
  //     attributesControl.push(v)
  //     // this.varsForm.patchValue({ attributes: this.data.attributes });
  //   })
  //   this.logger.log("varsForm: ", this.varsForm);
  // }

}
