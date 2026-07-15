import { Component } from '@angular/core';
import { CDSFilterComponent } from '../../../../../../cds-base-element/filter/filter.component';

@Component({
  selector: 'base-filter',
  templateUrl: './base-filter.component.html',
  styleUrls: ['./base-filter.component.scss']
})
export class BaseFilterComponent extends CDSFilterComponent {
  
  
  constructor() {
    super();
  }

  

}
