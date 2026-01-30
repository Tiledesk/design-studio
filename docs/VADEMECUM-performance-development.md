# Vademecum Performance - Sviluppo Angular Design Studio

**Versione**: 1.0  
**Data**: 2026-01-30  
**Focus**: Prevenire errori di scrittura che influenzano seriamente le performance

---

## PARTE 1: Checklist Sintetica - DO e DON'T

### ✅ DO - Cose da FARE

1. **Usare `OnPush` Change Detection Strategy** per componenti con molte istanze (100+)
2. **Precomputare tutti i valori** usati nel template (classi, stili, stringhe, booleani)
3. **Usare `trackBy`** in tutti gli `*ngFor` con liste dinamiche
4. **Sostituire `*ngIf` con CSS `hidden`** quando possibile (elementi sempre nel DOM)
5. **Usare CSS `background-image`** invece di `<img>` per icone/immagini ripetute (300+ istanze)
6. **Aggiungere GPU acceleration** (`will-change`, `transform: translateZ(0)`, `contain`) per elementi animati/repaintati
7. **Nascondere elementi durante pan/zoom** usando `*ngIf` con flag `isPanOrZoomActive`
8. **Rimuovere attributi non necessari** (`role`, `tabindex`, `aria-label` se non usati)
9. **Usare getter/setter** invece di `ngOnChanges` per `@Input` properties
10. **Debounce/throttle ResizeObserver** e event listeners ad alta frequenza
11. **Disabilitare `cdkDrag` durante pan/zoom** per ridurre overhead event system
12. **Precomputare classi CSS e stili** invece di valutazioni nel template
13. **Usare mappe statiche** per lookup O(1) invece di `Object.values().find()` O(n)
14. **Memoizzare calcoli costosi** quando i valori di input non cambiano
15. **Lazy initialize componenti pesanti** (`sat-popover`, tooltip) solo quando necessari

### ❌ DON'T - Cose da NON FARE

1. **NON usare Change Detection Strategy di default** per componenti con molte istanze
2. **NON valutare espressioni complesse nel template** (funzioni, concatenazioni, accessi nested)
3. **NON usare `*ngFor` senza `trackBy`** su liste dinamiche
4. **NON usare `*ngIf` eccessivamente** quando si può usare CSS `hidden` (elementi sempre nel DOM)
5. **NON usare `<img>` per icone/immagini ripetute** (300+ istanze) - usare CSS `background-image`
6. **NON dimenticare GPU acceleration** per elementi che vengono repaintati frequentemente
7. **NON renderizzare elementi non necessari durante pan/zoom** - nasconderli
8. **NON aggiungere attributi non necessari** (`role`, `tabindex`, `aria-label` se non usati)
9. **NON usare `ngOnChanges`** quando si può usare getter/setter per controllo fine
10. **NON lasciare ResizeObserver e event listeners senza debounce/throttle**
11. **NON lasciare `cdkDrag` attivo durante pan/zoom** - disabilitarlo
12. **NON valutare classi CSS e stili nel template** - precomputarli nel componente
13. **NON usare `Object.values().find()`** per lookup - usare mappe statiche O(1)
14. **NON ricalcolare valori costosi** quando gli input non cambiano - memoizzare
15. **NON inizializzare componenti pesanti** se non necessari - lazy initialize

---

## PARTE 2: Spiegazione Dettagliata con Esempi

### 1. Change Detection Strategy: OnPush

**Problema**: Con 300-500 istanze di un componente, ogni change detection valuta tutte le proprietà del template, causando overhead critico.

**Soluzione**: Usare `OnPush` e chiamare `cdr.markForCheck()` solo quando necessario.

**Esempio ERRATO**:
```typescript
@Component({
  selector: 'cds-action-description',
  templateUrl: './cds-action-description.component.html',
  styleUrls: ['./cds-action-description.component.scss']
  // ❌ Change Detection Strategy di default - valuta tutto ad ogni change detection
})
export class CdsActionDescriptionComponent implements OnInit {
  // ...
}
```

**Esempio CORRETTO**:
```typescript
@Component({
  selector: 'cds-action-description',
  templateUrl: './cds-action-description.component.html',
  styleUrls: ['./cds-action-description.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // ✅ OnPush per componenti con molte istanze
})
export class CdsActionDescriptionComponent implements OnInit {
  constructor(private cdr: ChangeDetectorRef) {}
  
  // ✅ Chiamare markForCheck() solo quando lo stato cambia
  private updateComputedValues(): void {
    // ... calcoli ...
    this.cdr.markForCheck(); // Notifica OnPush che lo stato è cambiato
  }
}
```

**Impatto**: Riduce valutazioni change detection del 90%+ per componenti con molte istanze.

---

### 2. Precomputazione Valori Template

**Problema**: Valutare espressioni nel template (funzioni, concatenazioni, accessi nested) ad ogni change detection causa overhead significativo.

**Soluzione**: Precomputare tutti i valori nel componente e usarli nel template.

**Esempio ERRATO**:
```html
<!-- ❌ Valutazioni nel template ad ogni change detection -->
<div [ngClass]="{'isStart': isStart, 'tds-slim-intent': isNewChatbot}">
  <img [src]="element?.src" [title]="element?.name | translate">
  <span *ngIf="previewMode && showBadge" [class]="'badge-' + element?.badge">
    {{element?.badge}}
  </span>
</div>
```

**Esempio CORRETTO**:
```typescript
// ✅ Precomputare tutti i valori nel componente
export class CdsActionDescriptionComponent {
  elementSrc: string = '';
  elementNameTitle: string = '';
  badgeClass: string = '';
  elementBadge: string = '';
  intentClasses: { [key: string]: boolean } = {};
  
  private updateComputedValues(): void {
    this.elementSrc = this.element?.src || '';
    this.elementNameTitle = this.translateService.instant(this.element?.name || '');
    this.badgeClass = this.element?.badge ? `badge-${this.element.badge}` : '';
    this.elementBadge = this.element?.badge || '';
    this.intentClasses = {
      'isStart': this.isStart,
      'tds-slim-intent': this.isNewChatbot
    };
  }
}
```

```html
<!-- ✅ Usare valori precomputati nel template -->
<div [ngClass]="intentClasses">
  <img [src]="elementSrc" [title]="elementNameTitle">
  <span *ngIf="previewMode && showBadge" [class]="badgeClass">
    {{elementBadge}}
  </span>
</div>
```

**Impatto**: Elimina valutazioni nel template, riduce overhead change detection del 80%+.

---

### 3. trackBy per *ngFor

**Problema**: Senza `trackBy`, Angular ricrea tutti gli elementi DOM ad ogni change detection, causando overhead significativo.

**Soluzione**: Usare `trackBy` con identificatori univoci.

**Esempio ERRATO**:
```html
<!-- ❌ Senza trackBy - ricrea tutti gli elementi DOM -->
<div *ngFor="let action of listOfActions">
  <cds-action-description [elementType]="action._tdActionType">
  </cds-action-description>
</div>
```

**Esempio CORRETTO**:
```typescript
// ✅ trackBy con identificatore univoco
trackByActionId(index: number, action: Action): string {
  return action._tdActionId || `action-${index}`;
}
```

```html
<!-- ✅ Con trackBy - riutilizza elementi DOM esistenti -->
<div *ngFor="let action of listOfActions; trackBy: trackByActionId">
  <cds-action-description [elementType]="action._tdActionType">
  </cds-action-description>
</div>
```

**Impatto**: Riduce creazione/distruzione elementi DOM del 90%+.

---

### 4. Sostituire *ngIf con CSS hidden

**Problema**: `*ngIf` rimuove/aggiunge elementi dal DOM, causando overhead durante change detection e layout thrashing.

**Soluzione**: Usare CSS `hidden` (display: none) quando gli elementi possono rimanere nel DOM.

**Esempio ERRATO**:
```html
<!-- ❌ *ngIf valuta condizioni ad ogni change detection -->
<span *ngIf="previewMode && showBadge" [class]="badgeClass">{{elementBadge}}</span>
<span *ngIf="!previewMode" class="label-action">{{elementNameTranslated}}</span>
<span *ngIf="showBeta" class="trigger-beta-badge">Beta</span>
```

**Esempio CORRETTO**:
```typescript
// ✅ Precomputare classi CSS per sostituire *ngIf
cssClasses: { [key: string]: string } = {
  badgeInPreview: '',
  labelAction: '',
  betaBadge: ''
};

private updateCssClasses(): void {
  this.cssClasses.badgeInPreview = (this._previewMode && this.showBadge) ? '' : 'hidden';
  this.cssClasses.labelAction = !this._previewMode ? '' : 'hidden';
  this.cssClasses.betaBadge = this.showBeta ? '' : 'hidden';
}
```

```html
<!-- ✅ Elementi sempre nel DOM, nascosti con CSS -->
<span [class]="badgeClass + ' ' + cssClasses.badgeInPreview">{{elementBadge}}</span>
<span [class]="'label-action ' + cssClasses.labelAction">{{elementNameTranslated}}</span>
<span [class]="'trigger-beta-badge ' + cssClasses.betaBadge">Beta</span>
```

```scss
// ✅ Classe hidden per nascondere elementi
.hidden {
  display: none !important;
}
```

**Impatto**: Elimina valutazioni `*ngIf` durante change detection, riduce overhead del 80%+.

**Nota**: Mantenere `*ngIf` per direttive/componenti che richiedono elemento nel DOM (es. `satPopoverAnchor`, `sat-popover`).

---

### 5. CSS background-image invece di <img>

**Problema**: Con 300-500 istanze, `<img>` causa overhead rendering GPU critico (caricamento, validazione, repaint).

**Soluzione**: Usare CSS `background-image` per icone/immagini ripetute.

**Esempio ERRATO**:
```html
<!-- ❌ 300-500 immagini nel DOM, overhead rendering GPU critico -->
<div *ngIf="previewMode" class="action-btn-icon">
  <button class="btn drag-btn">
    <img class="active-icon" 
         src="assets/images/icons/drag_indicator.svg" 
         [title]="dragTitleTranslated">
  </button>
</div>
```

**Esempio CORRETTO**:
```html
<!-- ✅ CSS background-image, nessuna immagine nel DOM -->
<div *ngIf="previewMode && !isPanOrZoomActive" class="action-btn-icon">
  <div class="btn drag-btn drag-icon">
  </div>
</div>
```

```scss
// ✅ CSS background-image ottimizzato per GPU
.drag-btn.drag-icon {
  width: 16px;
  height: 16px;
  background-image: url('/assets/images/icons/drag_indicator.svg');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  cursor: grab;
  
  // GPU acceleration per performance durante pan/zoom
  will-change: transform;
  transform: translateZ(0); // Forza GPU layer
  contain: layout style paint; // Isola rendering
}
```

**Impatto**: Elimina 300-500 immagini dal DOM, riduce overhead rendering GPU del 90%+.

---

### 6. GPU Acceleration per Elementi Animati/Repaintati

**Problema**: Elementi che vengono repaintati frequentemente (durante pan/zoom) causano overhead rendering GPU.

**Soluzione**: Usare GPU acceleration (`will-change`, `transform`, `contain`).

**Esempio ERRATO**:
```scss
// ❌ Nessuna ottimizzazione GPU
.drag-icon {
  width: 16px;
  height: 16px;
  background-image: url('/assets/images/icons/drag_indicator.svg');
  background-size: contain;
}
```

**Esempio CORRETTO**:
```scss
// ✅ GPU acceleration per performance durante pan/zoom
.drag-icon {
  width: 16px;
  height: 16px;
  background-image: url('/assets/images/icons/drag_indicator.svg');
  background-size: contain;
  
  // GPU acceleration
  will-change: transform; // Indica al browser che l'elemento cambierà
  transform: translateZ(0); // Forza GPU layer (compositing layer)
  contain: layout style paint; // Isola rendering per evitare repaint di elementi vicini
}
```

**Impatto**: Riduce overhead rendering GPU del 70-80% durante pan/zoom.

---

### 7. Nascondere Elementi durante Pan/Zoom

**Problema**: Elementi non necessari vengono renderizzati durante pan/zoom, causando overhead rendering.

**Soluzione**: Nascondere elementi durante pan/zoom usando `*ngIf` con flag `isPanOrZoomActive`.

**Esempio ERRATO**:
```html
<!-- ❌ Elemento sempre renderizzato durante pan/zoom -->
<div *ngIf="previewMode" class="action-btn-icon">
  <div class="drag-icon"></div>
</div>
```

**Esempio CORRETTO**:
```typescript
// ✅ Subscription a panZoomActive$ per nascondere durante pan/zoom
export class CdsActionDescriptionComponent implements OnInit, OnDestroy {
  isPanOrZoomActive: boolean = false;
  private panZoomSubscription: Subscription | null = null;
  private unsubscribe$ = new Subject<void>();
  
  constructor(
    private stageService: StageService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.initPanZoomSubscription();
  }
  
  private initPanZoomSubscription(): void {
    this.panZoomSubscription = this.stageService.panZoomActive$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(isActive => {
        this.isPanOrZoomActive = isActive;
        this.cdr.markForCheck();
      });
  }
  
  ngOnDestroy(): void {
    if (this.panZoomSubscription) {
      this.panZoomSubscription.unsubscribe();
    }
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
```

```html
<!-- ✅ Elemento nascosto durante pan/zoom -->
<div *ngIf="previewMode && !isPanOrZoomActive" class="action-btn-icon">
  <div class="drag-icon"></div>
</div>
```

**Impatto**: Elimina completamente overhead rendering durante pan/zoom.

---

### 8. Rimuovere Attributi Non Necessari

**Problema**: Attributi non necessari (`role`, `tabindex`, `aria-label`) creano overhead event system e DOM updates.

**Soluzione**: Rimuovere attributi non necessari, mantenere solo quelli essenziali per accessibilità.

**Esempio ERRATO**:
```html
<!-- ❌ Attributi non necessari creano overhead -->
<div class="drag-btn drag-icon"
     [attr.aria-label]="dragTitleTranslated || null"
     role="button"
     tabindex="0">
</div>
```

**Esempio CORRETTO**:
```html
<!-- ✅ Attributi rimossi (drag gestito da cdkDragHandle, div è solo visivo) -->
<div class="drag-btn drag-icon">
</div>
```

**Impatto**: Elimina overhead event system, focus management, DOM updates.

---

### 9. Getter/Setter invece di ngOnChanges

**Problema**: `ngOnChanges` viene chiamato per tutti gli `@Input`, anche quando non necessario, causando overhead.

**Soluzione**: Usare getter/setter per controllo fine e aggiornare solo quando necessario.

**Esempio ERRATO**:
```typescript
// ❌ ngOnChanges chiamato per tutti gli Input, anche quando non necessario
export class CdsActionDescriptionComponent implements OnChanges {
  @Input() intent: Intent;
  @Input() previewMode: boolean;
  
  ngOnChanges(changes: SimpleChanges): void {
    // Viene chiamato anche quando cambiano altri Input non correlati
    if (changes.intent) {
      this.updateComputedValues();
    }
    if (changes.previewMode) {
      this.updateComputedValues();
    }
  }
}
```

**Esempio CORRETTO**:
```typescript
// ✅ Getter/setter per controllo fine, aggiorna solo quando necessario
export class CdsActionDescriptionComponent {
  private _intent: Intent;
  private _previewMode: boolean = true;
  
  @Input() 
  set intent(value: Intent) {
    if (this._intent !== value) {
      this._intent = value;
      this.updateComputedValues();
      this.cdr.markForCheck();
    }
  }
  get intent(): Intent {
    return this._intent;
  }
  
  @Input() 
  set previewMode(value: boolean) {
    if (this._previewMode !== value) {
      this._previewMode = value;
      if (this.element) {
        this.updateComputedValues();
      }
      this.cdr.markForCheck();
    }
  }
  get previewMode(): boolean {
    return this._previewMode;
  }
}
```

**Impatto**: Riduce chiamate inutili del 90%+ per componenti con molte istanze.

---

### 10. Debounce/Throttle ResizeObserver e Event Listeners

**Problema**: ResizeObserver e event listeners ad alta frequenza causano overhead significativo.

**Soluzione**: Debounce/throttle callback per ridurre frequenza esecuzione.

**Esempio ERRATO**:
```typescript
// ❌ ResizeObserver senza debounce - chiamato ad ogni resize
ngAfterViewInit(): void {
  this.resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const nuovaAltezza = entry.contentRect.height;
      this.connectorService.updateConnector(this.intent.intent_id);
    }
  });
  this.resizeObserver.observe(this.resizeElement.nativeElement);
}
```

**Esempio CORRETTO**:
```typescript
// ✅ ResizeObserver con debounce - riduce frequenza esecuzione
private resizeObserver: ResizeObserver | null = null;
private resizeDebounceTimeout: any = null;
private readonly RESIZE_DEBOUNCE_MS = 150;

private setupResizeObserver(): void {
  if (this.resizeObserver) {
    this.resizeObserver.disconnect();
  }
  this.resizeObserver = new ResizeObserver(entries => {
    if (!this.stageService.getConnectorsEnabled()) {
      return;
    }
    clearTimeout(this.resizeDebounceTimeout);
    this.resizeDebounceTimeout = setTimeout(() => {
      for (const entry of entries) {
        const nuovaAltezza = entry.contentRect.height;
        if (!this.isDragging) {
          this.connectorService.updateConnector(this.intent.intent_id);
        }
      }
      this.cdr.markForCheck();
    }, this.RESIZE_DEBOUNCE_MS);
  });
  this.resizeObserver.observe(this.resizeElement.nativeElement);
}

ngOnDestroy(): void {
  if (this.resizeObserver) {
    this.resizeObserver.disconnect();
  }
  clearTimeout(this.resizeDebounceTimeout);
}
```

**Impatto**: Riduce frequenza esecuzione del 80-90% durante resize frequenti.

---

### 11. Disabilitare cdkDrag durante Pan/Zoom

**Problema**: `cdkDrag` attivo durante pan/zoom causa overhead event system significativo.

**Soluzione**: Disabilitare `cdkDrag` durante pan/zoom usando flag `isPanOrZoomActive`.

**Esempio ERRATO**:
```html
<!-- ❌ cdkDrag sempre attivo, anche durante pan/zoom -->
<div *ngFor="let action of listOfActions" 
     cdkDrag
     [cdkDragDisabled]="isNewChatbot">
  <cds-action-description [elementType]="action._tdActionType">
  </cds-action-description>
</div>
```

**Esempio CORRETTO**:
```typescript
// ✅ Subscription a panZoomActive$ per disabilitare cdkDrag durante pan/zoom
export class CdsIntentComponent {
  isPanOrZoomActive: boolean = false;
  
  private initPanZoomSubscription(): void {
    this.stageService.panZoomActive$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(isActive => {
        this.isPanOrZoomActive = isActive;
        this.cdr.markForCheck();
      });
  }
}
```

```html
<!-- ✅ cdkDrag disabilitato durante pan/zoom -->
<div *ngFor="let action of listOfActions" 
     cdkDrag
     [cdkDragDisabled]="isPanOrZoomActive || isNewChatbot">
  <cds-action-description [elementType]="action._tdActionType">
  </cds-action-description>
</div>
```

**Impatto**: Elimina overhead event system durante pan/zoom, riduce overhead del 90%+.

---

### 12. Precomputare Classi CSS e Stili

**Problema**: Valutare classi CSS e stili nel template ad ogni change detection causa overhead.

**Soluzione**: Precomputare classi CSS e stili nel componente.

**Esempio ERRATO**:
```html
<!-- ❌ Valutazioni nel template ad ogni change detection -->
<div [ngClass]="{'cds-no-featured-action': action._tdActionType !== TYPE_ACTION.REPLY && action._tdActionType !== TYPE_ACTION_VXML.DTMF_FORM, 'cds-last-action': last}">
  <div [ngStyle]="{'outline': intentService.actionSelectedID === action._tdActionId ? '2px solid rgba('+intent.attributes.color+', 1)' : 'none'}">
  </div>
</div>
```

**Esempio CORRETTO**:
```typescript
// ✅ Precomputare classi CSS e stili nel componente
export class CdsIntentComponent {
  actionClasses: Map<string, { [key: string]: boolean }> = new Map();
  actionOutlineStyle: Map<string, string> = new Map();
  
  private updateActionClasses(action: Action, isLast: boolean): { [key: string]: boolean } {
    const isNoFeaturedAction = action._tdActionType !== TYPE_ACTION.REPLY 
      && action._tdActionType !== TYPE_ACTION_VXML.DTMF_FORM 
      && action._tdActionType !== TYPE_ACTION_VXML.BLIND_TRANSFER;
    
    return {
      'cds-no-featured-action': isNoFeaturedAction,
      'cds-last-action': isLast
    };
  }
  
  private updateActionOutlineStyle(action: Action): string {
    const isSelected = this.currentActionSelectedID === action._tdActionId;
    if (isSelected) {
      const color = this.intent?.attributes?.color || INTENT_COLORS.COLOR1;
      return `2px solid rgba(${color}, 1)`;
    }
    return 'none';
  }
  
  private updateAllActionsComputedValues(): void {
    this.actionClasses.clear();
    this.actionOutlineStyle.clear();
    this.listOfActions.forEach((action, i) => {
      const key = action._tdActionId || `action-${i}`;
      this.actionClasses.set(key, this.updateActionClasses(action, i === this.listOfActions.length - 1));
      this.actionOutlineStyle.set(key, this.updateActionOutlineStyle(action));
    });
  }
}
```

```html
<!-- ✅ Usare valori precomputati nel template -->
<div [ngClass]="actionClasses.get(action._tdActionId || 'action-'+i)">
  <div [ngStyle]="{'outline': actionOutlineStyle.get(action._tdActionId || 'action-'+i)}">
  </div>
</div>
```

**Impatto**: Elimina valutazioni nel template, riduce overhead change detection del 80%+.

---

### 13. Mappe Statiche per Lookup O(1)

**Problema**: `Object.values().find()` ha complessità O(n), causando overhead significativo con molti elementi.

**Soluzione**: Usare mappe statiche per lookup O(1).

**Esempio ERRATO**:
```typescript
// ❌ Object.values().find() O(n) - overhead significativo
private calculateElement(): void {
  this.element = Object.values(ACTIONS_LIST).find(el => el.type === this._elementType);
}
```

**Esempio CORRETTO**:
```typescript
// ✅ Mappa statica O(1) - lookup istantaneo
export class CdsActionDescriptionComponent {
  private static elementTypeToElementMap: Map<string, any> | null = null;
  
  ngOnInit(): void {
    // Inizializza mappa statica una sola volta (condivisa tra tutte le istanze)
    if (!CdsActionDescriptionComponent.elementTypeToElementMap) {
      CdsActionDescriptionComponent.elementTypeToElementMap = new Map();
      Object.values(ACTIONS_LIST).forEach(el => {
        if (el && el.type) {
          CdsActionDescriptionComponent.elementTypeToElementMap!.set(el.type, el);
        }
      });
    }
  }
  
  private calculateElement(): void {
    // ✅ Lookup O(1) invece di O(n)
    this.element = CdsActionDescriptionComponent.elementTypeToElementMap?.get(this._elementType) || null;
  }
}
```

**Impatto**: Riduce complessità lookup da O(n) a O(1), riduce overhead del 90%+ con molti elementi.

---

### 14. Memoizzazione Calcoli Costosi

**Problema**: Ricalcolare valori costosi quando gli input non cambiano causa overhead inutile.

**Soluzione**: Memoizzare calcoli costosi e ricalcolare solo quando necessario.

**Esempio ERRATO**:
```typescript
// ❌ Ricalcola sempre, anche quando elementType non cambia
private calculateElement(): void {
  this.element = this.findElementByType(this._elementType);
}
```

**Esempio CORRETTO**:
```typescript
// ✅ Memoizzazione - ricalcola solo quando elementType cambia
private _elementType: string | null = null;
private _element: any | null = null;

@Input() 
set elementType(value: string) {
  if (this._elementType !== value) {
    this._elementType = value;
    this._element = null; // Reset memoization
    this.calculateElement();
  }
}

private calculateElement(): void {
  // Se già calcolato e memoizzato, non ricalcolare
  if (this._element !== null && this._elementType) {
    return;
  }
  
  if (!this._elementType) {
    this._element = null;
    return;
  }
  
  // Calcola solo quando necessario
  this._element = CdsActionDescriptionComponent.elementTypeToElementMap?.get(this._elementType) || null;
  this.element = this._element;
}
```

**Impatto**: Elimina ricalcoli inutili, riduce overhead del 90%+ quando gli input non cambiano.

---

### 15. Lazy Initialize Componenti Pesanti

**Problema**: Inizializzare componenti pesanti (`sat-popover`, tooltip) anche quando non necessari causa overhead.

**Soluzione**: Lazy initialize componenti pesanti solo quando necessari.

**Esempio ERRATO**:
```html
<!-- ❌ sat-popover sempre inizializzato, anche quando non necessario -->
<sat-popover #descriptionTooltip>
  <div class="tooltip-wrp">
    <span [innerHTML]="descriptionTranslated"></span>
  </div>
</sat-popover>
```

**Esempio CORRETTO**:
```html
<!-- ✅ sat-popover lazy initialized solo quando necessario -->
<sat-popover *ngIf="showTip && descriptionKey"
    #descriptionTooltip>
  <div class="tooltip-wrp">
    <span [innerHTML]="descriptionTranslated"></span>
  </div>
</sat-popover>
```

**Impatto**: Elimina inizializzazione componenti pesanti quando non necessari, riduce overhead del 100% quando non visibili.

---

## Conclusione

Seguendo queste best practices, è possibile evitare errori di scrittura che influenzano seriamente le performance, specialmente con componenti che hanno molte istanze (100+).

**Priorità**:
1. **CRITICA**: OnPush, precomputazione valori, trackBy, CSS background-image
2. **ALTA**: GPU acceleration, nascondere durante pan/zoom, disabilitare cdkDrag
3. **MEDIA**: Getter/setter, debounce/throttle, mappe statiche, memoization

**Metriche Target**:
- Change detection: < 50ms con 100+ componenti
- Pan/Zoom: > 30fps con 100+ componenti
- Rendering: < 16ms per frame (60fps)
