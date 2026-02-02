import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { ChangeDetectorRef } from '@angular/core';
import { INTENT_ELEMENT } from '../../../../../utils';
import { Action } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { BrandService } from 'src/app/services/brand.service';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { TranslateService } from '@ngx-translate/core';

/**
 * Classe base astratta per cds-action-description.
 * Contiene tutta la logica comune per calcolo element, traduzioni, e gestione input.
 * BEST PRACTICE: Ereditarietà per evitare duplicazione di codice tra componenti preview e detail.
 * 
 * NOTA: Non è un componente Angular, quindi non ha decoratore @Component.
 * È una classe TypeScript pura che viene estesa da componenti Angular.
 * Le classi derivate implementano OnInit e OnDestroy.
 */
export abstract class BaseActionDescriptionComponent {

  // Mappa statica per lookup O(1) invece di Object.values().find() O(n)
  // Condivisa tra tutte le istanze (static)
  protected static elementTypeToElementMap: Map<string, any> | null = null;
  protected static intentElementMap: Map<string, any> | null = null;

  // Memoization per evitare ricalcoli quando elementType non cambia
  protected _elementType: string | null = null;
  protected _element: any | null = null;
  protected _actionSelected: Action | null = null;

  // Proprietà pubbliche per template
  titlePlaceholder: string = 'Set a title';
  element: any;
  dataInput: string;
  tparams: any;
  BRAND_BASE_INFO = BRAND_BASE_INFO;

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
  tipText: string = '';

  // Proprietà astratte che devono essere implementate dalle classi derivate
  protected abstract get previewMode(): boolean;
  protected abstract get showTip(): boolean;
  protected abstract get cdr(): ChangeDetectorRef;

  // Logger condiviso tra tutte le istanze
  protected logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    protected brandService: BrandService,
    protected translateService: TranslateService
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

  /**
   * Metodo di inizializzazione chiamato dalle classi derivate.
   * Le classi derivate devono chiamare super.ngOnInit() nel loro ngOnInit().
   */
  protected initialize(): void {
    // Inizializza mappe statiche una sola volta (condivise tra tutte le istanze)
    if (!BaseActionDescriptionComponent.elementTypeToElementMap) {
      BaseActionDescriptionComponent.elementTypeToElementMap = new Map();
      Object.values(ACTIONS_LIST).forEach(el => {
        if (el && el.type) {
          BaseActionDescriptionComponent.elementTypeToElementMap!.set(el.type, el);
        }
      });
    }
    
    if (!BaseActionDescriptionComponent.intentElementMap) {
      BaseActionDescriptionComponent.intentElementMap = new Map();
      Object.values(INTENT_ELEMENT).forEach(el => {
        if (el && el.type) {
          BaseActionDescriptionComponent.intentElementMap!.set(el.type, el);
        }
      });
    }

    // FIX: Se elementType è 'action' (valore generico) e actionSelected è disponibile,
    // usa il tipo specifico dell'action prima di calcolare element
    if (this._elementType === 'action' && this._actionSelected && this._actionSelected._tdActionType) {
      this._elementType = this._actionSelected._tdActionType;
      this.logger.log(`[BASE-ACTION-DESCRIPTION] ngOnInit: elementType='action' sostituito con tipo specifico: ${this._actionSelected._tdActionType}`);
    }

    // Calcola element se elementType è già disponibile
    if (this._elementType) {
      this.calculateElement();
      this.updateComputedValues();
      // Notifica OnPush dopo inizializzazione
      this.cdr.markForCheck();
    }
  }

  /**
   * Setter per actionSelected - gestisce la logica comune di aggiornamento.
   * Le classi derivate possono override per aggiungere logica specifica.
   */
  set actionSelected(value: Action) {
    if (this._actionSelected !== value) {
      this._actionSelected = value;
      if (value) {
        // FIX: Se actionSelected cambia, aggiorna sempre elementType con il tipo specifico dell'action
        // Questo è necessario perché in cds-panel-action-detail viene passato elementType='ACTION' 
        // che non è un tipo valido per ACTIONS_LIST
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

  /**
   * Setter per elementType - gestisce la logica comune di aggiornamento.
   * Le classi derivate possono override per aggiungere logica specifica.
   */
  set elementType(value: string) {
    if (this._elementType !== value) {
      // FIX: Se elementType è 'action' (valore generico da TYPE_INTENT_ELEMENT) e actionSelected è disponibile,
      // usa il tipo specifico dell'action invece del valore generico
      if (value === 'action' && this._actionSelected && this._actionSelected._tdActionType) {
        this._elementType = this._actionSelected._tdActionType;
        this.logger.log(`[BASE-ACTION-DESCRIPTION] elementType='action' sostituito con tipo specifico: ${this._actionSelected._tdActionType}`);
      } else {
        this._elementType = value;
      }
      this._element = null; // Reset memoization
      this.calculateElement();
      // FIX: Aggiorna sempre i valori computati quando elementType cambia
      this.updateComputedValues();
      // Notifica OnPush che lo stato è cambiato
      this.cdr.markForCheck();
    }
  }
  get elementType(): string {
    return this._elementType || '';
  }

  /**
   * Calcola element da elementType usando mappa statica (lookup O(1) invece di Object.values().find() O(n)).
   * Memoizzato per evitare ricalcoli quando elementType non cambia.
   */
  protected calculateElement(): void {
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
          this._element = BaseActionDescriptionComponent.intentElementMap?.get(this._elementType) || null;
          break;
        case 'jsoncondition':
          this._element = ACTIONS_LIST.JSON_CONDITION;
          if(this._actionSelected && 'noelse' in this._actionSelected) {
            this._element = ACTIONS_LIST.CONDITION;
          }
          break;
        default:
          // Usa mappa statica per lookup O(1)
          this._element = BaseActionDescriptionComponent.elementTypeToElementMap?.get(this._elementType) || null;
          break;
      }
      
      // Aggiorna element per compatibilità con template
      this.element = this._element;
      
      this.logger.log('[BaseActionDescriptionComponent] element calcolato:: ', this.element);
    } catch (error) {
      this.logger.log("[BaseActionDescriptionComponent] error calcolo element ", error);
      this._element = null;
      this.element = null;
    }
  }

  /**
   * Precomputa tutti i valori per il template per eliminare valutazioni costose durante change detection.
   * Chiamato quando cambia element o elementType.
   * Le classi derivate possono override per aggiungere logica specifica basata su previewMode.
   */
  protected updateComputedValues(): void {
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
      this.logger.log('[BASE-ACTION-DESCRIPTION] updateComputedValues: element non disponibile');
      return;
    }

    // FIX: Precomputa sempre elementSrc e elementNameTranslated (non dipendono da previewMode)
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
    
    this.logger.log(`[BASE-ACTION-DESCRIPTION] updateComputedValues: elementSrc=${this.elementSrc}, elementNameTranslated=${this.elementNameTranslated}, previewMode=${this.previewMode}`);

    // Precomputa badge class e flags
    const badge = this.element?.badge;
    this.elementBadge = badge || ''; // BEST PRACTICE: Precomputato per eliminare accesso nested nel template
    this.showBadge = !!badge;
    if (badge) {
      this.badgeClass = `trigger-beta-badge badge-${badge}`;
    } else {
      this.badgeClass = '';
    }

    // Precomputa showBeta (dipende da previewMode - implementato nelle classi derivate)
    this.showBeta = !this.previewMode && this.element?.status === 'beta';

    // Precomputa showDeprecation e showDeprecationMessage (dipende da previewMode)
    this.showDeprecation = badge === 'DEP';
    this.showDeprecationMessage = !this.previewMode && badge === 'DEP';

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

  onChangeText(text: string){
    this.logger.log('[BaseActionDescriptionComponent] onChangeText:: ', text);
    if (this.actionSelected) {
      this.actionSelected._tdActionTitle = text;
    }
  }

  /**
   * Metodo di cleanup chiamato dalle classi derivate.
   * Le classi derivate devono chiamare super.cleanup() nel loro ngOnDestroy().
   */
  protected cleanup(): void {
    // BEST PRACTICE: Cleanup se necessario (le classi derivate possono override)
  }
}
