import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Operand } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';


@Component({
    selector: 'operand-v2',
    templateUrl: './operand.component.html',
    styleUrls: ['./operand.component.scss']
})
export class OperandV2Component implements OnInit {

    @Input() operand: Operand;
    @Input() listOfFunctions: Array<{name: string, value: string, icon?:string}>;
    @Output() onChangeOperand = new EventEmitter<Operand>();

    operandForm: FormGroup;
    // listOfFunctions: Array<{name: string, value: string, icon?:string}> = [];
    openSelectFunction: boolean = false;
    panelOpenState: boolean = false;
    
    private logger: LoggerService = LoggerInstance.getInstance();
    
    constructor(private formBuild: FormBuilder) {}

    ngOnInit(): void { }
    
    ngOnChanges(changes) {     
        this.initialize();
    }

    private initialize(){
        this.operandForm = this.createOperandGroup();
        this.operandForm.valueChanges.subscribe(data => {
            if(data.value !== '') {
                this.operand.value = data.value;
                this.operand.isVariable = data.isVariable;
            }
            if (data.function !== null) {
                this.operand.function = data.function;
                this.openSelectFunction = true
            } else {
                delete(this.operand.function);
            }
        });
        if (this.operand) {
            this.operandForm.patchValue(this.operand);
        }
    }

    //to do validate form
    private createOperandGroup(): FormGroup {
        return this.formBuild.group({
            value: ['', Validators.required],
            isVariable: [false],
            function: [null, Validators.nullValidator]
        })        
    }

    /** START EVENTS TEXTAREA **/
    onChangeTextArea(text: string) {
    //     if(text && text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g))){
    //         text = text.replace(text, text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g))[0]);
    //         this.operandForm.get('value').setValue(text);
    //         this.operandForm.get('isVariable').setValue(true);
    //         this.onChangeOperand.emit(this.operand)
    //     }
    //     if(text){
    //         this.onChangeOperand.emit(this.operand)
    //     }
    }

    onBlur(event){
        this.onChangeOperand.emit(this.operand);
    }

    onSelectedAttribute(variableSelected: { name: string, value: string }){
        // this.operandForm.get('isVariable').setValue(true);
        // this.operandForm.get('value').setValue('{{' + variableSelected.value + '}}');
        this.onChangeOperand.emit(this.operand) 
    }
    onClearSelectedAttribute(){
        this.operandForm.get('value').setValue('');
        this.operandForm.get('isVariable').setValue(false);
        this.operand = this.operandForm.value
        this.onChangeOperand.emit(this.operand)
    }
    /** END EVENTS TEXTAREA */


    onChangeIsCheckbox(event){
        this.operandForm.get('isVariable').setValue(event.checked);
        this.onChangeOperand.emit(this.operand)
    }

    onSelectedFunction(event: any) {
        if(event){
            this.operandForm.get('function').setValue(event.value);
        } else {
            this.operandForm.get('function').setValue(null);
        }
        this.onChangeOperand.emit(this.operand)
    }

    onToggleSelectFunction(){
        this.openSelectFunction = !this.openSelectFunction;
    }

}
