import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TYPE_MATH_OPERATOR, TYPE_MATH_OPERATOR_LIST } from '../../../../../../utils';

@Component({
    selector: 'operator-v2',
    templateUrl: './operator.component.html',
    styleUrls: ['./operator.component.scss']
})
export class OperatorV2Component implements OnInit {

    @Input() operator: TYPE_MATH_OPERATOR;
    @Output() operatorChange = new EventEmitter<TYPE_MATH_OPERATOR>();
    listOfOperators: Array<{name: string, value: string, icon?:string}> = [];

    constructor() { }

    ngOnInit(): void {
        for (let key in TYPE_MATH_OPERATOR_LIST) {
            this.listOfOperators.push({name: TYPE_MATH_OPERATOR_LIST[key].name, value: TYPE_MATH_OPERATOR_LIST[key].type})
        }
    }
          
    onSelectedOperator(event: any) {    
        this.operatorChange.emit(event);        
    }
}
