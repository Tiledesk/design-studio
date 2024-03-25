import { Intent } from 'src/app/models/intent-model';
import { Chatbot } from '../../../models/faq_kb-model';
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { Rule } from 'src/app/models/rule-model';

// SERVICES //
import { IntentService } from '../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { MEDIA } from '../../utils-resources';
import { DashboardService } from 'src/app/services/dashboard.service';

@Component({
  selector: 'cds-rules',
  templateUrl: './rules.component.html',
  styleUrls: ['./rules.component.scss']
})
export class RulesComponent implements OnInit {

  selectedChatbot: Chatbot;
  // @Input() listOfIntents: Intent[];

  listOfIntents: Intent[];
  addClicked: boolean = false;
  showWelcome: boolean = false;
  listOfRules: Rule[]=[];

  MEDIA = MEDIA
  
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private intentService: IntentService,
    private dashboardService: DashboardService
    ) { }

  ngOnInit(): void {
    this.listOfIntents = this.intentService.listOfIntents;
    this.selectedChatbot = this.dashboardService.selectedChatbot
    this.getAllRules();
  }

  ngOnChanges(changes: SimpleChanges){
   
  }
  
  ngOnDestroy(){
    this.addClicked = false;
  }

  addNew(){
    this.addClicked = true;
    if(this.listOfRules){
      this.showWelcome = false;
    }else if(this.addClicked && this.listOfRules.length ==0){
      this.showWelcome = false
    }
  }

  getAllRules(){
    this.logger.debug('[RULES] getAllRules: selectedChatbot-->', this.selectedChatbot)
    if(this.selectedChatbot.attributes && this.selectedChatbot.attributes['rules']){
      this.listOfRules = this.selectedChatbot.attributes['rules'] as Rule[]
      this.logger.debug('[RULES] getAllRules: listOfRules-->', this.listOfRules, this.showWelcome)
      if(this.listOfRules && this.listOfRules.length ==0)
        this.showWelcome = true
    }else{
      this.showWelcome = true
    }
  }

  onRuleAdded(rule: Rule){
    this.listOfRules.unshift(rule)
    this.selectedChatbot.attributes = {
      rules: this.listOfRules
    }
    this.addClicked = false;
  }

  onBack(event: boolean){
    this.addClicked = false;
  }

  onRuleDeleted(event: Rule){
    this.logger.log('[RULES]: onRemoveRule-->', event, this.listOfRules)
    this.listOfRules = this.listOfRules.filter(el => el.uid !== event.uid)
    if(this.listOfRules && this.listOfRules.length ==0)
      this.showWelcome = true
    else
      this.showWelcome = false
  }

}
