import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { TYPE_MATH_OPERATOR } from '../../../../../../utils';
import { Operand, Operation } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
    selector: 'operation-v2',
    templateUrl: './operation.component.html',
    styleUrls: ['./operation.component.scss']
})
export class OperationV2Component implements OnInit {

    @Input() operation: Operation;
    @Input() listOfFunctions: Array<{name: string, value: string, icon?:string}>;
    @Output() onChangeOperation = new EventEmitter<any>();

    list: Array< TYPE_MATH_OPERATOR | Operand | ''> = [];

    private logger: LoggerService = LoggerInstance.getInstance();

    constructor() { }

    ngOnInit(): void {}

    ngOnChanges(changes) {     
        if (this.operation) {
            this.setList(this.operation);
        }
    }

    private setList(operation: Operation) {
        this.list = [];
        for (let i = 0; i < operation.operands.length; i++) {
            this.list.push(operation.operands[i]);
            if (i < operation.operands.length - 1) {
                this.list.push(operation.operators[i]);
            }
        }
    }

    onClickOperator() {
        this.operation.operators.push(TYPE_MATH_OPERATOR['addAsNumber']);
        this.operation.operands.push(new Operand());
        this.setList(this.operation)
        this.onChangeOperation.emit();
    }

    onSelectedOperator(event: any, index: number) {
        this.list[index] = TYPE_MATH_OPERATOR[event.value];
        index = Math.floor(index / 2);
        this.operation.operators[index] = TYPE_MATH_OPERATOR[event.value];
        this.onChangeOperation.emit();
    }

    onChangeOperand(event: any, index: string) {
        this.onChangeOperation.emit();
    }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    onDeleteGroup(index: number, last: boolean){
        this.logger.log('onDeleteGroup', index, last, this.operation, this.list)
        if(!last){
            this.operation.operators.splice(index/2, 1)
            this.operation.operands.splice(index/2, 1)
        }else if(last){
            this.operation.operands.splice(index/2, 1)
            if(this.operation.operators.length > 0){
                this.operation.operators.splice((index-1)/2, 1)
            }
        }
        this.setList(this.operation)
        this.onChangeOperation.emit();
    }
}
