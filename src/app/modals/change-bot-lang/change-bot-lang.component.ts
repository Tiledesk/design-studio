import { Component, Inject, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BotsBaseComponent } from 'src/app/components/bots/bots-base/bots-base.component';

@Component({
  selector: 'appdashboard-change-bot-lang',
  templateUrl: './change-bot-lang.component.html',
  styleUrls: ['./change-bot-lang.component.scss']
})

export class ChangeBotLangModalComponent extends BotsBaseComponent implements OnInit, OnChanges {
  botDefaultSelectedLangCode: string
  selectedDefaultBotLang: string
  intentsEngine: string
  constructor(
    public dialogRef: MatDialogRef<ChangeBotLangModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
    super();
    // console.log('[CHANGE-BOT-LANG] DATA ', data)
    this.botDefaultSelectedLangCode = data.chatbot.language;
    this.selectedDefaultBotLang = this.botDefaultLanguages[this.getIndexOfbotDefaultLanguages(data.chatbot.language)].name;
    this.intentsEngine = data.chatbot.intentsEngine
  }
  ngOnChanges(changes: SimpleChanges): void {
  }

  onSelectBotDefaultlang(selectedDefaultBotLang) {
    // console.log('onSelectBotDefaultlang > selectedDefaultBotLang ', selectedDefaultBotLang)
    if (selectedDefaultBotLang) {
      this.selectedDefaultBotLang = selectedDefaultBotLang.name;
      this.botDefaultSelectedLangCode = selectedDefaultBotLang.code;
      // console.log('[CHANGE-BOT-LANG] onSelectBotDefaultlang > selectedDefaultBotLang > lang', this.selectedDefaultBotLang)
    }
  }


  closeDialog() {
    this.dialogRef.close('close');
  }


  changeBotLanguage() {
    this.dialogRef.close(this.botDefaultSelectedLangCode);
  }


}
