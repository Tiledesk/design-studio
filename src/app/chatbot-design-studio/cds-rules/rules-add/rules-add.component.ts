import { FormGroup, FormBuilder, Validators} from '@angular/forms';
import { Component, Input, OnInit, SimpleChanges, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { Intent } from 'src/app/models/intent-model';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { Rule } from 'src/app/models/rule-model';
import { MatExpansionPanel } from '@angular/material/expansion';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-rules-add',
  templateUrl: './rules-add.component.html',
  styleUrls: ['./rules-add.component.scss']
})
export class RulesAddComponent implements OnInit {

  @ViewChild(MatExpansionPanel) pannel?: MatExpansionPanel; 
  
  @Input() listOfIntents: Array<Intent>;
  @Input() selectedRule: Rule
  @Input() selectedChatbot: Chatbot;
  @Input() addMode: boolean = true
  @Output() onRuleAdded = new EventEmitter<Rule>();
  @Output() onRuleDeleted = new EventEmitter<Rule>();
  @Output() onBack = new EventEmitter<boolean>();

  
  ruleFormGroup: FormGroup
  autocompleteOptions: Array<string> = [];
  isPanelExpanded: boolean = false;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(private formBuilder: FormBuilder,
              private el: ElementRef,
              private faqkbService: FaqKbService) { }

  ngOnInit(): void {
    this.ruleFormGroup = this.buildForm();
    this.ruleFormGroup.valueChanges.subscribe(form => {
      this.logger.debug('[RULES-ADD] ruleFormGroup changed-->', form)
      if(form && (form.when.regexOption !== '' || form.when.text !== '')){
        this.ruleFormGroup.controls['when'].patchValue({'urlMatches': this.buildRegex(form.when.regexOption, form.when.text)}, {emitEvent: false})
      }
    })
    if(this.selectedRule){
      this.logger.debug('[RULES-ADD] selectedRule-->', this.selectedRule)
      this.setFormValue()
    }
  }

  ngOnChanges(changes: SimpleChanges){
    if(this.listOfIntents){
      this.listOfIntents.forEach(value => this.autocompleteOptions.push('/'+value.intent_display_name))
    }
  }

  buildForm(): FormGroup{
    return this.formBuilder.group({
      uid: [ uuidv4(), Validators.required],
      name: ['', Validators.required],
      description: ['', Validators.nullValidator],
      when: this.formBuilder.group({
        regexOption: ['any', Validators.required],
        text: ['', Validators.required],
        urlMatches: ['', Validators.required],
        triggerEvery: [-1, Validators.required]
      }),
      do: this.formBuilder.array([
        // this.formBuilder.group({
        //   wait: [2, Validators.required]
        // }),
        this.formBuilder.group({
          message: this.formBuilder.group({
            text: ['', Validators.required],
            participants: [['bot_'+this.selectedChatbot._id], Validators.required],
            attributes: [{subtype: 'info'}, Validators.required]
          })
        })
      ])
    })
  }

  buildRegex(option: string, text: string): string{
    let regex = text
    if(option === 'any'){
      regex = '^.*$'
    }else if(option === 'starts'){
      regex = '^(' + text + ').*' 
    }else if (option === 'ends'){
      regex = '^.*(' + text + ')$'
    }else if(option === 'contains'){
      regex = '^.*(' + text + ').*$'
    }else if(option === 'custom'){
      regex = '/' + text + '/'
    }
    return regex
  }

  setFormValue(){
    this.ruleFormGroup.patchValue({
      uid: this.selectedRule.uid,
      name: this.selectedRule.name,
      description: this.selectedRule.description,
      when: {
        regexOption: this.selectedRule.when.regexOption,
        text: this.selectedRule.when.text,
        urlMatches : this.selectedRule.when.urlMatches,
        triggerEvery: this.selectedRule.when.triggerEvery
      },
      do: [
        // { wait: this.selectedRule.do[0].wait},
        { message: {
            text: this.selectedRule.do[0].message['text']
          }
        }
      ]
    })
  }

  private addOrReplace(array: Rule[], newObj: Rule): Rule[]{ 
    return [...array.filter((obj) => obj.uid !== newObj.uid), {...newObj}];
  }
    

  submitForm(){
    this.logger.debug('[RULES-ADD] submitForm-->', this.ruleFormGroup)
    const pendingClassName = 'loading-btn--pending';
    const successClassName = 'loading-btn--success';
    const failClassName    = 'loading-btn--fail';
    const stateDuration = 1500;
    if(this.ruleFormGroup.valid){
      let rules: Rule[] = [this.ruleFormGroup.value]
      if(this.selectedChatbot.attributes && this.selectedChatbot.attributes['rules']){
        rules = this.addOrReplace(this.selectedChatbot.attributes['rules'], this.ruleFormGroup.value)
      }
      this.logger.debug('[RULES-ADD] add Rules to bot-->', rules)
      const button = this.el.nativeElement.querySelector('#create-rule-form')
     
      //PENDING STATE
      button.classList.add(pendingClassName)
      const that = this
      this.faqkbService.addRuleToChatbot(this.selectedChatbot._id, rules).subscribe((data)=> {
        
        if(data){
          //SUCCESS STATE
          
          setTimeout(() => {
            button.classList.remove(pendingClassName);
            button.classList.add(successClassName);
            that.onRuleAdded.emit(this.ruleFormGroup.value)
            window.setTimeout(() => {
              button.classList.remove(successClassName)
              
              that.isPanelExpanded = false;
            }, stateDuration);
          }, stateDuration);
          
        }

      }, (error)=> {
        //FAIL STATE
        setTimeout(() => {
          button.classList.remove(pendingClassName);
          button.classList.add(failClassName);
        
          window.setTimeout(() => button.classList.remove(failClassName), stateDuration);
        }, stateDuration);
        this.logger.debug('[RULES-ADD] faqkbService addRuleToChatbot - ERROR:', error)
      }, ()=>{
        this.logger.debug('[RULES-ADD] faqkbService addRuleToChatbot - COMPLETE')
      })
    }
        
  }


  removeRule(){
    this.logger.debug('[RULES-ADD] removeRule-->', this.selectedChatbot.attributes)

    const pendingClassName = 'loading-btn--pending';
    const successClassName = 'loading-btn--success';
    const failClassName    = 'loading-btn--fail';
    const stateDuration = 1500;
    let rules: Rule[] = this.selectedChatbot.attributes['rules'].filter(el => el.uid !== this.ruleFormGroup.value.uid)
    
    this.logger.debug('[RULES-ADD] add Rules to bot-->', rules)
    const button = this.el.nativeElement.querySelector('#delete-rule-form')
    
    //PENDING STATE
    button.classList.add(pendingClassName)
    const that = this

    this.faqkbService.addRuleToChatbot(this.selectedChatbot._id, rules).subscribe((data)=> {
        
      if(data){
        //SUCCESS STATE
        
        setTimeout(() => {
          button.classList.remove(pendingClassName);
          button.classList.add(successClassName);
          that.onRuleDeleted.emit(this.ruleFormGroup.value)
          window.setTimeout(() => {
            button.classList.remove(successClassName)
            that.isPanelExpanded = true;
          }, stateDuration);
        }, stateDuration);
        
      }

    }, (error)=> {
      //FAIL STATE
      setTimeout(() => {
        button.classList.remove(pendingClassName);
        button.classList.add(failClassName);
      
        window.setTimeout(() => button.classList.remove(failClassName), stateDuration);
      }, stateDuration);
      this.logger.debug('[RULES-ADD] faqkbService addRuleToChatbot - ERROR:', error)
    }, ()=>{
      this.logger.debug('[RULES-ADD] faqkbService addRuleToChatbot - COMPLETE')
    })
  }

  returnBack(){
    this.logger.debug('[RULES-ADD] returnBack-->', this.selectedChatbot.attributes)
    this.onBack.emit(true)
  }

  closePanel(event){
    // event.stopPropagation();
    // event.preventDefault();
  }

  openPanel(event){
  }

}
