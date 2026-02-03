import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Action } from 'src/app/models/action-model';
import { ActionDescriptionService } from './action-description.service';

/**
 * Lightweight component for action description in preview mode.
 * Optimized for performance with OnPush change detection.
 * Used in canvas drag handles and action lists.
 */
@Component({
  selector: 'cds-action-description-preview',
  templateUrl: './cds-action-description-preview.component.html',
  styleUrls: ['./cds-action-description-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CdsActionDescriptionPreviewComponent implements OnChanges {
  @Input() actionSelected: Action;
  @Input() elementType: string;

  element: any = null;

  constructor(private actionDescriptionService: ActionDescriptionService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['elementType'] || changes['actionSelected']) {
      const resolvedType = this.actionDescriptionService.resolveElementType(
        this.actionSelected,
        this.elementType
      );
      this.element = this.actionDescriptionService.resolveElement(resolvedType, this.actionSelected);
    }
  }
}
