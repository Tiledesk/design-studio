import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, HostListener, Input, OnInit, Output, ViewChild, EventEmitter } from '@angular/core';
import { SatPopover } from '@ncstate/sat-popover';
import { Condition, Expression, Operator } from 'app/models/intent-model';
import { variableList, OPERATORS_LIST } from 'app/chatbot-design-studio/utils';
import { LoggerService } from 'app/services/logger/logger.service';
import { CDSFilterComponent } from 'app/chatbot-design-studio/cds-base-element/filter/filter.component';


@Component({
  selector: 'base-filter',
  templateUrl: './base-filter.component.html',
  styleUrls: ['./base-filter.component.scss']
})
export class BaseFilterComponent extends CDSFilterComponent {
  
  
  constructor(
    public logger: LoggerService
  ) { super(logger)}

  

}
