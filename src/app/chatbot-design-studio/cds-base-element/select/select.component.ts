import { FormControl, FormGroup } from '@angular/forms';
import { Component, Input, OnInit, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges, ElementRef, NgZone, OnDestroy } from '@angular/core';
import { NgSelectComponent } from '@ng-select/ng-select';
import { RESERVED_INTENT_NAMES } from '../../utils';

@Component({
  selector: 'cds-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss']
})
export class SelectComponent implements OnInit, OnDestroy {
  @ViewChild('ngSelect', { static: true }) ngSelect: NgSelectComponent;

  @Input() items: any[] = [];
  @Input() itemSelected: any;
  @Input() bindLabelSelect: string;
  @Input() bindValueSelect: string;
  @Input() optionalBindAdditionalText: string; 
  @Input() optionalBindDescription: string; 
  /** If true, renders the optionalBindAdditionalText as a right-aligned badge (opt-in, default false). */
  @Input() additionalTextAsBadge: boolean = false;
  @Input() groupByKey: string; 
  @Input() footerButton: boolean = false;
  @Input() footerButtonDisabled: boolean = false;
  @Input() footerButtonIcon: string;
  @Input() footerButtonText: string;

  @Input() deleteButton: boolean = false;
  @Input() clearable: boolean = false;
  @Input() searchable: boolean = false;
  /** If true, sorts items alphabetically (default true for backward compatibility). */
  @Input() sortAlphabetically: boolean = true;
  @Input() placeholder: string = 'Select an option'
  @Input() formGroup: FormGroup = new FormGroup({ select: new FormControl()});
  @Input() formControlName: string = 'select';
  @Output() onSelected = new EventEmitter();
  @Output() onReset = new EventEmitter();
  @Output() onDeleted = new EventEmitter();

  RESERVED_INTENT_NAMES = RESERVED_INTENT_NAMES;
  valueFormGroup: FormGroup 
  sortedItems: any[] = [];
  
  /** Rimuove il listener di scroll acceso all'apertura; null a pannello chiuso. */
  private stopScrollWatch: (() => void) | null = null;

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) { }

  ngOnInit(): void {
    // empty
  }

  ngOnChanges(changes: SimpleChanges){
    // Ordina items in ordine alfabetico crescente (come cds-panel-intent-list)
    // Unless explicitly disabled to preserve incoming order.
    if (changes['items'] || changes['bindLabelSelect'] || changes['groupByKey'] || changes['sortAlphabetically']) {
      this.sortedItems = this.sortAlphabetically ? this.sortItemsAlphabetically(this.items) : [...(this.items || [])];
    }

    if (this.itemSelected != null && this.sortedItems?.length && this.bindValueSelect) {
      try {
        const found = this.sortedItems.find(el => el[this.bindValueSelect] === this.itemSelected);
        this.itemSelected = found ? found[this.bindValueSelect] : this.itemSelected;
      } catch (error) {
        //console.error('ERROR', error);
      }
    }
  }

  private sortItemsAlphabetically(items: any[]): any[] {
    if (!Array.isArray(items) || items.length === 0) return items || [];
    if (!this.bindLabelSelect) return [...items];

    const labelKey = this.bindLabelSelect;
    const groupKey = this.groupByKey;

    return [...items].sort((a: any, b: any) => {
      // Se è presente il groupByKey, ordina prima per gruppo poi per label
      if (groupKey) {
        const groupA = (a?.[groupKey] ?? '').toString().toLowerCase();
        const groupB = (b?.[groupKey] ?? '').toString().toLowerCase();
        const groupCmp = groupA.localeCompare(groupB);
        if (groupCmp !== 0) return groupCmp;
      }

      const nameA = (a?.[labelKey] ?? '').toString().toLowerCase();
      const nameB = (b?.[labelKey] ?? '').toString().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  onChangeActionButton(event) {
    if(event){
      this.itemSelected = event[this.bindValueSelect];
      this.onSelected.emit(event);
    }
  }

  onResetValue(event){
    this.itemSelected = null
    this.onReset.emit(null)
  }

  onOpen(){
    this.watchOutsideScroll();
  }

  onFooterButtonClick(event) {
    this.onSelected.emit({ clickEvent: 'footer'});
  }

  onDeleteButtonClick(event) {
    this.onDeleted.emit(event);
  }

  onClose(){
    this.unwatchOutsideScroll();
    this.ngSelect.blur();
  }

  ngOnDestroy(): void {
    // Un pannello aperto quando il componente viene distrutto (si cambia
    // blocco, si chiude il pannello di dettaglio) lascerebbe il listener
    // attaccato a document per sempre.
    this.unwatchOutsideScroll();
  }

  /** Chiude il pannello quando scorre qualcosa che non e' questa select.
   *
   *  `appendTo="body"` stacca il pannello dal campo: e' figlio del body e le
   *  sue coordinate sono calcolate all'apertura, quindi se il contenitore del
   *  campo scorre la lista resta dov'era, sospesa sopra il resto della pagina.
   *
   *  Il listener e' in fase di CAPTURE su document perche' l'evento `scroll`
   *  non risale: in capture si vede lo scroll di qualunque contenitore senza
   *  doverne agganciare uno a ognuno, e senza sapere in anticipo dentro cosa
   *  la select e' stata usata.
   *
   *  Lo scroll DENTRO la lista delle opzioni e' interazione con la select, non
   *  con la pagina: quello non chiude niente, ed e' il motivo del controllo su
   *  `.ng-dropdown-panel`.
   *
   *  Tutto fuori da Angular: uno scroll produce decine di eventi al secondo e
   *  farli passare dalla change detection si sente sulla canvas. Si rientra
   *  nella zona solo nel momento in cui si chiude davvero. */
  private watchOutsideScroll(): void {
    this.unwatchOutsideScroll();

    const onScroll = (event: Event) => {
      const target = event.target as Node | null;
      const el = target && target.nodeType === Node.ELEMENT_NODE ? target as HTMLElement : null;
      if (el && (el.closest('.ng-dropdown-panel') || this.host.nativeElement.contains(el))) {
        return;
      }
      this.zone.run(() => this.ngSelect?.close());
    };

    this.zone.runOutsideAngular(() => {
      // Al tick successivo, non subito: aprendo la select il browser puo'
      // portare il campo in vista, e quello scroll chiuderebbe il pannello
      // nello stesso istante in cui si e' aperto.
      const armed = setTimeout(() => document.addEventListener('scroll', onScroll, true));
      this.stopScrollWatch = () => {
        clearTimeout(armed);
        document.removeEventListener('scroll', onScroll, true);
      };
    });
  }

  private unwatchOutsideScroll(): void {
    this.stopScrollWatch?.();
    this.stopScrollWatch = null;
  }

}
