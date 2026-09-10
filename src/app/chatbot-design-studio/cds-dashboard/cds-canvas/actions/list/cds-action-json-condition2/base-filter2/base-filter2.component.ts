import { Component } from '@angular/core';
import { CDSFilter2Component } from '../../../../../../cds-base-element/filter2/filter2.component';

/** Variante del filtro V2 usata dentro l'azione JSON Condition V2 (template dedicato, stessa logica). */
@Component({
  selector: 'base-filter2',
  templateUrl: './base-filter2.component.html',
  styleUrls: ['./base-filter2.component.scss']
})
export class BaseFilter2Component extends CDSFilter2Component {


  constructor() {
    super();
  }



}
