import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'cds-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent implements OnInit {
  btnDisabled: boolean = true;
  
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
  }


  onCloseDialog(): void {
    this.dialogRef.close();
  }


}
