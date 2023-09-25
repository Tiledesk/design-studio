import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Operand } from 'app/models/intent-model';


@Component({
    selector: 'operand',
    templateUrl: './operand.component.html',
    styleUrls: ['./operand.component.scss']
})
export class OperandComponent implements OnInit {

    @Input() operand: Operand;
    @Input() listOfFunctions: Array<{name: string, value: string, icon?:string}>;
    @Output() onChangeOperand = new EventEmitter<Operand>();

    operandForm: FormGroup;
    // listOfFunctions: Array<{name: string, value: string, icon?:string}> = [];
    openSlectFunction: boolean;
    placeholder: string;

    constructor(private formBuild: FormBuilder) {}

    ngOnInit(): void {
        this.openSlectFunction = false;
        // for (let key in TYPE_FUNCTION_LIST) {
        //     this.listOfFunctions.push({name: TYPE_FUNCTION_LIST[key].name, value: TYPE_FUNCTION_LIST[key].type})
        // }
    }

    ngOnChanges() {
        this.placeholder = 'Insert a constant value or choose an attribute';
        this.operandForm = this.createOperandGroup();
        this.operandForm.valueChanges.subscribe(data => {
            if(data.value !== '') {
                this.operand.value = data.value;
                this.operand.isVariable = data.isVariable;
            }
            if (data.function !== null) {
                this.operand.function = data.function;
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
        if(text && text.match(new RegExp(/(?<=\$\{)(.*)(?=\})/g))){
            text = text.replace(text, text.match(new RegExp(/(?<=\$\{)(.*)(?=\})/g))[0]);
            this.operandForm.get('value').setValue(text);
            this.operandForm.get('isVariable').setValue(true);
            this.onChangeOperand.emit(this.operand)
        }
        if(text){
            this.onChangeOperand.emit(this.operand)
        }
       
    }   
    onSelectedAttribute(variableSelected: { name: string, value: string }){
        this.operandForm.get('isVariable').setValue(true);
        this.operandForm.get('value').setValue(variableSelected.name);
        this.onChangeOperand.emit(this.operand)
    }
    onClearSelectedAttribute(){
        this.operandForm.get('value').setValue('');
        this.operandForm.get('isVariable').setValue(false);
        this.onChangeOperand.emit(this.operand)
    }
    /** END EVENTS TEXTAREA */


    onSelectedFunction(event: any) {
        if(event){
            this.operandForm.get('function').setValue(event.value);
        } else {
            this.operandForm.get('function').setValue(null);
        }
        this.onChangeOperand.emit(this.operand)
    }

    onToggleSelectFunction(){
        this.openSlectFunction = !this.openSlectFunction;
    }

}
