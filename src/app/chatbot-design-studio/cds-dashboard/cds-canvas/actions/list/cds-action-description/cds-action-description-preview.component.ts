import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Action } from 'src/app/models/action-model';
import { BrandService } from 'src/app/services/brand.service';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { BaseActionDescriptionComponent } from './base-action-description.component';

/**
 * Componente per visualizzare la descrizione di un'action in modalità preview (previewMode=true).
 * Estende BaseActionDescriptionComponent per ereditare tutta la logica comune.
 * Aggiunge funzionalità specifiche per preview mode: drag button, gestione pan/zoom, ecc.
 * BEST PRACTICE: Ereditarietà per evitare duplicazione di codice.
 */
@Component({
  selector: 'cds-action-description-preview',
  templateUrl: './cds-action-description-preview.component.html',
  styleUrls: ['./cds-action-description.component.scss'], // Condivide gli stessi stili
  changeDetection: ChangeDetectionStrategy.OnPush // BEST PRACTICE: OnPush per componenti con molte istanze (300-500)
})
export class CdsActionDescriptionPreviewComponent extends BaseActionDescriptionComponent implements OnInit, OnDestroy {



  @Input() 
  override set actionSelected(value: Action) {
    super.actionSelected = value;
  }
  override get actionSelected(): Action {
    return super.actionSelected;
  }

  @Input() 
  override set elementType(value: string) {
    super.elementType = value;
  }
  override get elementType(): string {
    return super.elementType;
  }

  /**
   * Input per sincronizzare lo stato pan/zoom dal parent.
   * OTTIMIZZAZIONE PERFORMANCE: Usa Input binding invece di subscription per evitare 300-500 subscription separate.
   * Il parent (cds-intent) ha già una subscription a panZoomActive$, quindi passiamo il valore come Input.
   * Benefici:
   * - 1 subscription nel parent vs 300-500 nei child
   * - Più semplice da mantenere
   * - Con OnPush, il change detection è efficiente
   */
  @Input() isPanOrZoomActive: boolean = false;

  // Preview mode è sempre true per questo componente
  protected get previewMode(): boolean {
    return true;
  }

  // Tip non mostrato in preview mode
  protected get showTip(): boolean {
    return false;
  }

  private unsubscribe$ = new Subject<void>();

  constructor(
    protected override brandService: BrandService,
    protected override translateService: TranslateService,
    protected override cdr: ChangeDetectorRef
  ) {
    super(brandService, translateService);
  }

  ngOnInit(): void {
    super.initialize();
    
    // OTTIMIZZAZIONE: Rimossa subscription locale a panZoomActive$.
    // Il valore viene passato come @Input() dal parent (cds-intent) che ha già una subscription.
    // Questo riduce le subscription da 300-500 a 1 sola nel parent.
  }

  /**
   * Override per aggiungere logica specifica di preview mode.
   * In preview mode, il badge viene mostrato nell'icona invece che sotto il nome.
   */
  protected override updateComputedValues(): void {
    super.updateComputedValues();
    // Logica specifica per preview mode se necessario
    // Ad esempio, potremmo voler mostrare il badge in modo diverso
  }

  ngOnDestroy(): void {
    // OTTIMIZZAZIONE: Rimossa cleanup subscription locale (ora usiamo Input binding)
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    super.cleanup();
  }
}
