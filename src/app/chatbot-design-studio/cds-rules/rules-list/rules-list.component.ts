import { Component, Input, OnInit } from '@angular/core';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { Intent } from 'src/app/models/intent-model';
import { Rule } from 'src/app/models/rule-model';

@Component({
  selector: 'cds-rules-list',
  templateUrl: './rules-list.component.html',
  styleUrls: ['./rules-list.component.scss']
})
export class RulesListComponent implements OnInit {

  @Input() listOfIntents: Intent[];
  @Input() listOfRules: Rule[];
  @Input() selectedChatbot: Chatbot;
  step = 0;

  constructor() { }

  ngOnInit(): void {
  }

  setStep(index: number) {
    this.step = index;
  }

  nextStep() {
    this.step++;
  }

  prevStep() {
    this.step--;
  }

  onRuleDeleted(event: Rule){
    this.listOfRules = this.listOfRules.filter(el => el.uid !== event.uid)
    this.selectedChatbot.attributes['rules']= this.listOfRules
  }

  onRuleAdded(event: Rule){
  }

}
