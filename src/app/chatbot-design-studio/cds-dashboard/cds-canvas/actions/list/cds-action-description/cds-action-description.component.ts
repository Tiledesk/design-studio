import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { INTENT_ELEMENT } from '../../../../../utils';
import { Action } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { BrandService } from 'src/app/services/brand.service';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { TranslateService } from '@ngx-translate/core';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'cds-action-description',
  templateUrl: './cds-action-description.component.html',
  styleUrls: ['./cds-action-description.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // BEST PRACTICE: OnPush per componenti con molte istanze (300-500)
})
export class CdsActionDescriptionComponent implements OnInit, OnDestroy {

  // Mappa statica per lookup O(1) invece di Object.values().find() O(n)
  private static elementTypeToElementMap: Map<string, any> | null = null;
  private static intentElementMap: Map<string, any> | null = null;

  // Memoization per evitare ricalcoli quando elementType non cambia
  private _elementType: string | null = null;
  private _element: any | null = null;
  private _actionSelected: Action | null = null;

  @Input() 
  set actionSelected(value: Action) {
    if (this._actionSelected !== value) {
      this._actionSelected = value;
      if (value) {
        // Se actionSelected cambia, aggiorna elementType
        this.elementType = value._tdActionType;
        if (value._tdActionTitle && value._tdActionTitle !== "") {
          this.dataInput = value._tdActionTitle;
        }
      }
      // Notifica OnPush che lo stato è cambiato
      this.cdr.markForCheck();
    }
  }
  get actionSelected(): Action {
    return this._actionSelected;
  }

  @Input() 
  set elementType(value: string) {
    if (this._elementType !== value) {
      this._elementType = value;
      this._element = null; // Reset memoization
      this.calculateElement();
      this.updateComputedValues();
      // Notifica OnPush che lo stato è cambiato
      this.cdr.markForCheck();
    }
  }
  get elementType(): string {
    return this._elementType || '';
  }

  @Input() 
  set previewMode(value: boolean) {
    if (this._previewMode !== value) {
      this._previewMode = value;
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
  private _previewMode: boolean = true;

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
  private _showTip: boolean = false;
  // @Output() closeIntent = new EventEmitter();
  // @Output() saveIntent = new EventEmitter();
  
  titlePlaceholder: string = 'Set a title';
  element: any;
  dataInput: string;
  tparams: any;
  BRAND_BASE_INFO = BRAND_BASE_INFO

  // Proprietà precomputate per ottimizzazione performance (eliminano valutazioni nel template)
  elementSrc: string = '';
  elementNameTranslated: string = '';
  elementNameTitle: string = '';
  badgeClass: string = '';
  elementBadge: string = ''; // BEST PRACTICE: Precomputato per eliminare accesso nested element?.badge
  showBadge: boolean = false;
  showBeta: boolean = false;
  showDeprecation: boolean = false;
  showDeprecationMessage: boolean = false;
  dragTitleTranslated: string = '';
  deprecationMessageTranslated: string = '';
  descriptionKey: string = '';
  descriptionTranslated: string = '';
  docUrlKey: string = '';
  docUrlTranslated: string = '';
  showDocs: boolean = false;
  tipText: string = ''; // Fix: proprietà mancante

  // BEST PRACTICE: Flag per nascondere drag button durante pan/zoom per eliminare overhead
  isPanOrZoomActive: boolean = false;
  private panZoomSubscription: Subscription | null = null;
  private unsubscribe$ = new Subject<void>();

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private brandService: BrandService,
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef,
    private stageService: StageService
  ) {
    const brand = brandService.getBrand();
    this.tparams = brand;
    
    // Precomputa traduzioni statiche (usa instant per sincrono, con fallback)
    try {
      this.dragTitleTranslated = this.translateService.instant('CDSCanvas.Drag') || 'Drag';
      this.deprecationMessageTranslated = this.translateService.instant('CDSCanvas.DeprecationMessage') || 'Deprecation Message';
    } catch (e) {
      // Fallback se traduzioni non ancora caricate
      this.dragTitleTranslated = 'Drag';
      this.deprecationMessageTranslated = 'Deprecation Message';
    }
    // Converti esplicitamente a boolean per evitare errori di tipo
    this.showDocs = !!BRAND_BASE_INFO['DOCS'];
   }

  ngOnInit(): void {
    // Inizializza mappe statiche una sola volta (condivise tra tutte le istanze)
    if (!CdsActionDescriptionComponent.elementTypeToElementMap) {
      CdsActionDescriptionComponent.elementTypeToElementMap = new Map();
      Object.values(ACTIONS_LIST).forEach(el => {
        if (el && el.type) {
          CdsActionDescriptionComponent.elementTypeToElementMap!.set(el.type, el);
        }
      });
    }
    
    if (!CdsActionDescriptionComponent.intentElementMap) {
      CdsActionDescriptionComponent.intentElementMap = new Map();
      Object.values(INTENT_ELEMENT).forEach(el => {
        if (el && el.type) {
          CdsActionDescriptionComponent.intentElementMap!.set(el.type, el);
        }
      });
    }

    // Calcola element se elementType è già disponibile
    if (this._elementType) {
      this.calculateElement();
      this.updateComputedValues();
      // Notifica OnPush dopo inizializzazione
      this.cdr.markForCheck();
    }

    // BEST PRACTICE: Sottoscrivi a panZoomActive$ per nascondere drag button durante pan/zoom
    this.initPanZoomSubscription();
  }

  /**
   * Inizializza la subscription a panZoomActive$ per nascondere drag button durante pan/zoom.
   */
  private initPanZoomSubscription(): void {
    this.panZoomSubscription = this.stageService.panZoomActive$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(isActive => {
        this.isPanOrZoomActive = isActive;
        this.cdr.markForCheck(); // Notifica OnPush
      });
  }

  /**
   * Calcola element da elementType usando mappa statica (lookup O(1) invece di Object.values().find() O(n)).
   * Memoizzato per evitare ricalcoli quando elementType non cambia.
   */
  private calculateElement(): void {
    // Se già calcolato e memoizzato, non ricalcolare
    if (this._element !== null && this._elementType) {
      return;
    }

    if (!this._elementType) {
      this._element = null;
      return;
    }

    try {
      switch(this._elementType){
        case 'form':
        case 'question':
        case 'answer':
          // Usa mappa statica per lookup O(1)
          this._element = CdsActionDescriptionComponent.intentElementMap?.get(this._elementType) || null;
          break;
        case 'jsoncondition':
          this._element = ACTIONS_LIST.JSON_CONDITION;
          if(this._actionSelected && 'noelse' in this._actionSelected) {
            this._element = ACTIONS_LIST.CONDITION;
          }
          break;
        default:
          // Usa mappa statica per lookup O(1)
          this._element = CdsActionDescriptionComponent.elementTypeToElementMap?.get(this._elementType) || null;
          break;
      }
      
      // Aggiorna element per compatibilità con template
      this.element = this._element;
      
      this.logger.log('[ActionDescriptionComponent] element calcolato:: ', this.element);
    } catch (error) {
      this.logger.log("[ActionDescriptionComponent] error calcolo element ", error);
      this._element = null;
      this.element = null;
    }
  }

  /**
   * Precomputa tutti i valori per il template per eliminare valutazioni costose durante change detection.
   * Chiamato quando cambia element o elementType.
   */
  private updateComputedValues(): void {
    if (!this.element) {
      // Reset valori se element non disponibile
      this.elementSrc = '';
      this.elementNameTranslated = '';
      this.elementNameTitle = '';
      this.badgeClass = '';
      this.elementBadge = '';
      this.showBadge = false;
      this.showBeta = false;
      this.showDeprecation = false;
      this.showDeprecationMessage = false;
      this.descriptionKey = '';
      this.descriptionTranslated = '';
      this.docUrlKey = '';
      this.docUrlTranslated = '';
      this.tipText = '';
      return;
    }

    // Precomputa accessi a proprietà nested
    this.elementSrc = this.element?.src || '';
    const elementName = this.element?.name || '';
    
    // Precomputa traduzioni (usa instant per sincrono, con fallback)
    try {
      this.elementNameTranslated = this.translateService.instant(elementName) || elementName;
      this.elementNameTitle = this.elementNameTranslated;
    } catch (e) {
      this.elementNameTranslated = elementName;
      this.elementNameTitle = elementName;
    }

    // Precomputa badge class e flags
    const badge = this.element?.badge;
    this.elementBadge = badge || ''; // BEST PRACTICE: Precomputato per eliminare accesso nested nel template
    this.showBadge = !!badge;
    if (badge) {
      this.badgeClass = `trigger-beta-badge badge-${badge}`;
    } else {
      this.badgeClass = '';
    }

    // Precomputa showBeta
    this.showBeta = !this._previewMode && this.element?.status === 'beta';

    // Precomputa showDeprecation e showDeprecationMessage
    this.showDeprecation = badge === 'DEP';
    this.showDeprecationMessage = !this._previewMode && badge === 'DEP';

    // Precomputa description key e traduzione
    const doc = this.element?.doc;
    if (doc) {
      this.descriptionKey = `${doc}.DESCRIPTION`;
      try {
        this.descriptionTranslated = this.translateService.instant(this.descriptionKey, this.tparams) || '';
      } catch (e) {
        this.descriptionTranslated = '';
      }

      this.docUrlKey = `${doc}.DOC_URL`;
      try {
        this.docUrlTranslated = this.translateService.instant(this.docUrlKey, this.tparams) || '';
      } catch (e) {
        this.docUrlTranslated = '';
      }
    } else {
      this.descriptionKey = '';
      this.descriptionTranslated = '';
      this.docUrlKey = '';
      this.docUrlTranslated = '';
    }

    // Precomputa tipText (se necessario, altrimenti stringa vuota)
    this.tipText = ''; // TODO: definire logica per tipText se necessario
  }

  // onCloseIntent(){
  //   this.closeIntent.emit();
  // }

  // onSaveIntent(){
  //   this.saveIntent.emit();
  // }

  onChangeText(text: string){
    this.logger.log('[ActionDescriptionComponent] onChangeText:: ', text);
    this.actionSelected._tdActionTitle = text;
  }

  ngOnDestroy(): void {
    // BEST PRACTICE: Cleanup subscription per evitare memory leaks
    if (this.panZoomSubscription) {
      this.panZoomSubscription.unsubscribe();
    }
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

}
