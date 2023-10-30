import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { variableList } from '../../utils';

@Component({
  selector: 'cds-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent implements OnInit {
  btnDisabled: boolean = true;

  userDefined = variableList.userDefined
  
  constructor(
    public dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
  }

  onChangeTextInput($event):void {
    const regexPattern = "/^[a-zA-Z0-9_]*$/";
    let REGEX = new RegExp(regexPattern.replace(/\//gi, ''));
    // this.logger.log('[TILEBOT-EDIT-ADD] checkFields nameRGEX REGEX ', REGEX)
    
    if(REGEX.test(this.data.text) && this.data.text !== ''){
      this.btnDisabled = false;
    } else {
      this.btnDisabled = true;
    }


    let exist = this._checkIfExist(this.data.text)
    if(exist)
      this.btnDisabled = true;
    else 
      this.btnDisabled = false;
    
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
