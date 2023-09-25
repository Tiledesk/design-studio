import { Component, Input, OnInit } from '@angular/core';
import { Chatbot } from 'app/models/faq_kb-model';
import { Intent } from 'app/models/intent-model';
import { Rule } from 'app/models/rule-model';

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
    // console.log('EVENT: onRemoveRule-->', event, this.listOfRules)
    this.selectedChatbot.attributes['rules']= this.listOfRules
  }

  onRuleAdded(event: Rule){
    // console.log('EVENT: onRuleAdded-->', event, this.listOfRules)
  }

}
