import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Action } from 'src/app/models/action-model';
import { BrandService } from 'src/app/services/brand.service';
import { TranslateService } from '@ngx-translate/core';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { Subject } from 'rxjs';
import { BaseActionDescriptionComponent } from './base-action-description.component';

/**
 * Componente per visualizzare la descrizione di un'action in modalità detail (previewMode=false).
 * Estende BaseActionDescriptionComponent per ereditare tutta la logica comune.
 * BEST PRACTICE: Ereditarietà per evitare duplicazione di codice.
 */
@Component({
  selector: 'cds-action-description',
  templateUrl: './cds-action-description.component.html',
  styleUrls: ['./cds-action-description.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // BEST PRACTICE: OnPush per componenti con molte istanze (300-500)
})
export class CdsActionDescriptionComponent extends BaseActionDescriptionComponent implements OnInit, OnDestroy {

  protected _previewMode: boolean = false; // Default: detail mode
  protected _showTip: boolean = false;
  
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

  @Input() 
  set previewMode(value: boolean) {
    if (this._previewMode !== value) {
      this._previewMode = value;
      // FIX: Assicura che element sia calcolato prima di aggiornare i valori
      // Se elementType è disponibile ma element non è ancora calcolato, calcolalo
      if (this._elementType && !this.element) {
        this.calculateElement();
      }
      // Aggiorna valori che dipendono da previewMode
      if (this.element) {
        this.updateComputedValues();
      }
      // Notifica OnPush che lo stato è cambiato
      this.cdr.markForCheck();
    }
  }
  get previewMode(): boolean {
    return this._previewMode;
  }
 

  @Input() 
  set showTip(value: boolean) {
    if (this._showTip !== value) {
      this._showTip = value;
      // Notifica OnPush che lo stato è cambiato
      this.cdr.markForCheck();
    }
  }
  get showTip(): boolean {
    return this._showTip;
  }
  

  // BEST PRACTICE: Flag per nascondere drag button durante pan/zoom per eliminare overhead
  private unsubscribe$ = new Subject<void>();

  constructor(
    protected override brandService: BrandService,
    protected override translateService: TranslateService,
    protected override cdr: ChangeDetectorRef,
    private stageService: StageService
  ) {
    super(brandService, translateService);
  }

  ngOnInit(): void {
    super.initialize();
    // Logica specifica per detail mode se necessario
  }

  /**
   * Override per aggiungere logica specifica di detail mode se necessario.
   */
  protected override updateComputedValues(): void {
    super.updateComputedValues();
    // Logica specifica per detail mode se necessario
    // In detail mode, mostriamo sempre il nome e il badge sotto l'icona
  }

  ngOnDestroy(): void {
    // BEST PRACTICE: Cleanup subscription per evitare memory leaks
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    super.cleanup();
  }
}
