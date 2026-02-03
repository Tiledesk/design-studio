import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Action } from 'src/app/models/action-model';

/**
 * Wrapper component that delegates to either preview or detail component
 * based on the previewMode input. This maintains backward compatibility
 * while using optimized specialized components internally.
 */
@Component({
  selector: 'cds-action-description',
  template: `
    <cds-action-description-preview
      *ngIf="previewMode"
      [actionSelected]="actionSelected"
      [elementType]="elementType">
    </cds-action-description-preview>
    
    <cds-action-description-detail
      *ngIf="!previewMode"
      [actionSelected]="actionSelected"
      [elementType]="elementType"
      [showTip]="showTip">
    </cds-action-description-detail>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CdsActionDescriptionComponent {
  @Input() actionSelected: Action;
  @Input() elementType: string;
  @Input() previewMode: boolean = true;
  @Input() showTip: boolean = false;
}
