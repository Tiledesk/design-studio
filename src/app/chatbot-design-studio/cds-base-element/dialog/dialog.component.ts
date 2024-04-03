import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';

@Component({
  selector: 'cds-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent implements OnInit {
  btnDisabled: boolean = true;

  userDefined = variableList.find(el => el.key ==='userDefined').elements
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
  }

  onChangeTextInput($event):void {
    const regexPattern = "/^[a-zA-Z0-9_]*$/";
    let REGEX = new RegExp(regexPattern.replace(/\//gi, ''));
    this.logger.log('[TILEBOT-EDIT-ADD] checkFields nameRGEX REGEX ', REGEX, REGEX.test(this.data.text))
    
    let exist = this._checkIfExist(this.data.text)
    if(exist)
      this.btnDisabled = true;
    else 
      this.btnDisabled = false;

    if(REGEX.test(this.data.text) && this.data.text !== ''){
      this.btnDisabled = false;
    } else {
      this.btnDisabled = true;
    }


    
    
  }


  onCloseDialog(): void {
    this.dialogRef.close();
  }

  private _checkIfExist(value: string): boolean {
    const filterValue = value.toLowerCase();
    const filter = this.userDefined.filter(option => option.name.toLowerCase() === filterValue);
    if(filter.length === 0)
      return false
    return true
  }


}
