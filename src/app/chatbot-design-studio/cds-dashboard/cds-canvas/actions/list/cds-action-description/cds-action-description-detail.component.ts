import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { Action } from 'src/app/models/action-model';
import { ActionDescriptionService } from './action-description.service';

/**
 * Full-featured component for action description in detail mode.
 * Includes tooltips, descriptions, and deprecation messages.
 * Used in action detail panels.
 */
@Component({
  selector: 'cds-action-description-detail',
  templateUrl: './cds-action-description-detail.component.html',
  styleUrls: ['./cds-action-description-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CdsActionDescriptionDetailComponent implements OnChanges {
  @Input() actionSelected: Action;
  @Input() elementType: string;
  @Input() showTip: boolean = false;

  element: any = null;
  tparams: any;
  readonly BRAND_BASE_INFO = BRAND_BASE_INFO;
  dataInput: string = '';

  constructor(
    private actionDescriptionService: ActionDescriptionService,
    private cdr: ChangeDetectorRef
  ) {
    this.tparams = this.actionDescriptionService.getBrandParams();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['elementType'] || changes['actionSelected']) {
      const resolvedType = this.actionDescriptionService.resolveElementType(
        this.actionSelected,
        this.elementType
      );
      this.element = this.actionDescriptionService.resolveElement(resolvedType, this.actionSelected);
      
      if (this.actionSelected?._tdActionTitle) {
        this.dataInput = this.actionSelected._tdActionTitle;
      }
      
      this.cdr.markForCheck();
    }
  }

  onChangeText(text: string): void {
    if (this.actionSelected) {
      this.actionSelected._tdActionTitle = text;
    }
  }
}
