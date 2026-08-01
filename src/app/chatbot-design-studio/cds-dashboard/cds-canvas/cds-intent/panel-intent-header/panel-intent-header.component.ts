import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Intent } from 'src/app/models/intent-model';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { IntentService } from '../../../../services/intent.service';
import {
  INTENT_COLORS,
  RESERVED_INTENT_NAMES,
  UNTITLED_BLOCK_PREFIX,
} from '../../../../utils';

@Component({
  selector: 'cds-panel-intent-header',
  templateUrl: './panel-intent-header.component.html',
  styleUrls: ['./panel-intent-header.component.scss'],
})
export class PanelIntentHeaderComponent implements OnInit, OnChanges {
  @ViewChild('inputIntentName', { static: true })
  inputIntentName!: ElementRef<HTMLInputElement>;

  @Input() intent: Intent;
  @Input() intentColor: string;

  RESERVED_INTENT_NAMES = RESERVED_INTENT_NAMES;
  intentName: string;
  isStart = false;
  isDefaultFallback = false;
  isWebhook = false;
  isNotErrorName = true;
  intentNameAlreadyExist = false;
  intentNameNOTHasSpecialCharacters = true;

  private readonly logger: LoggerService =
    LoggerInstance.getInstance();
  private listOfIntents: Intent[] = [];
  private isFocused = false;

  constructor(public intentService: IntentService) {
    this.intentService.getIntents().subscribe((intents) => {
      if (intents) {
        this.listOfIntents = intents;
        if (this.intent) {
          this.intentName = this.intent.intent_display_name;
        }
      }
    });
  }

  ngOnInit(): void {
    this.initialize();
  }

  /**
   * Angular lifecycle hook: risponde ai cambi delle input properties.
   * @param changes - mappa delle proprietà modificate
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Riservato a eventuali reazioni future ai cambi di intent
  }

  /**
   * Gestisce il click sulla zona header dell'intent (log e possibile estensione).
   * @param event - evento di click
   */
  onSelectIntent(event: Event): void {
    this.logger.log(
      '[PANEL-INTENT-HEADER] onSelectIntent',
      event,
      this.intent
    );
  }

  /**
   * Imposta il focus sull'input del nome intent al mouseup.
   * @param event - evento mouseup
   */
  onMouseUpInput(event: Event): void {
    this.logger.log('[PANEL-INTENT-HEADER] onMouseUpInput');
    this.isFocused = true;
    this.inputIntentName.nativeElement.focus();
  }

  /**
   * Aggiorna il nome intent in tempo reale in base all'input; gestisce vuoti e nomi riservati.
   * @param event - valore corrente dell'input (nome intent)
   */
  onChangeIntentName(event: string): void {
    this.logger.log(
      '[PANEL-INTENT-HEADER] onChangeIntentName',
      event,
      this.intent
    );
    if (!event || event.trim().length === 0) {
      this.intentNameAlreadyExist = false;
      this.isNotErrorName = true;
      this.intentNameNOTHasSpecialCharacters = true;
      this.intentName = event || '';
      this.intent.intent_display_name = event || '';
      this.intentService.updateIntentDisplayNameInRealTime(this.intent);
      return;
    }
    if (
      this.intentService.isReservedIntent(event) &&
      !this.intent.attributes.readonly
    ) {
      this.logger.log(
        '[PANEL-INTENT-HEADER] isReservedIntent TRUE',
        this.intent.attributes.readonly
      );
      this.intentNameAlreadyExist = true;
      this.isNotErrorName = false;
    } else {
      this.logger.log('[PANEL-INTENT-HEADER] isReservedIntent FALSE');
      this.intentNameAlreadyExist = false;
      this.isNotErrorName = this.checkIntentName(event);
      if (this.isNotErrorName) {
        this.intentName = event;
        this.intent.intent_display_name = event;
        this.intentService.updateIntentDisplayNameInRealTime(this.intent);
      }
    }
  }

  /**
   * Al blur: valida il nome, genera un nome di default se vuoto, e salva se valido.
   * @param event - evento blur
   */
  onBlur(event: Event): void {
    this.logger.log('[PANEL-INTENT-HEADER]  onBlur!!!', this.intent);
    if (!this.intentName || this.intentName.trim().length === 0) {
      this.logger.log(
        '[PANEL-INTENT-HEADER] Campo vuoto, genero nome automatico'
      );
      const generatedName = this.intentService.setDisplayName();
      this.intentName = generatedName;
      this.intent.intent_display_name = generatedName;
      this.isNotErrorName = true;
      this.intentNameAlreadyExist = false;
      this.intentNameNOTHasSpecialCharacters = true;
      this.intentService.updateIntentDisplayNameInRealTime(this.intent);
      this.inputIntentName.nativeElement.blur();
      this.onSaveIntent();
      return;
    }
    if (
      this.intentService.isReservedIntent(this.intentName) &&
      this.intent.attributes.readonly === false
    ) {
      this.intentNameAlreadyExist = true;
      this.intentName = this.intent.intent_display_name;
      this.logger.log('[PANEL-INTENT-HEADER]  isReservedIntent true');
    } else {
      this.intentNameAlreadyExist = false;
      this.logger.log('[PANEL-INTENT-HEADER]  isReservedIntent true');
      this.isNotErrorName = this.checkIntentName(this.intentName);
      if (this.isNotErrorName) {
        this.intent.intent_display_name = this.intentName;
        this.inputIntentName.nativeElement.blur();
        this.onSaveIntent();
      }
    }
  }

  /**
   * Alla pressione di Enter: se il campo è vuoto genera nome e salva, altrimenti fa blur.
   * @param event - evento keydown Enter
   */
  onEnterButtonPressed(event: Event): void {
    this.logger.log(
      '[PANEL-INTENT-HEADER] onEnterButtonPressed Intent name: onEnterButtonPressed event',
      event
    );
    if (!this.intentName || this.intentName.trim().length === 0) {
      this.logger.log(
        '[PANEL-INTENT-HEADER] Campo vuoto su Enter, genero nome automatico'
      );
      const generatedName = this.intentService.setDisplayName();
      this.intentName = generatedName;
      this.intent.intent_display_name = generatedName;
      this.isNotErrorName = true;
      this.intentNameAlreadyExist = false;
      this.intentNameNOTHasSpecialCharacters = true;
      this.intentService.updateIntentDisplayNameInRealTime(this.intent);
      this.inputIntentName.nativeElement.blur();
      this.onSaveIntent();
      return;
    }
    this.inputIntentName.nativeElement.blur();
  }

  /**
   * Seleziona tutto il testo nell'input al doppio click.
   * @param event - evento dblclick
   */
  doubleClickFunction(event: Event): void {
    this.logger.log('[PANEL-INTENT-HEADER] doubleClickFunction');
    this.inputIntentName.nativeElement.select();
  }

  /**
   * Propaga il salvataggio del nome intent al servizio.
   */
  onSaveIntent(): void {
    this.logger.log('[PANEL-INTENT-HEADER] SALVO!!!');
    this.intentService.changeIntentName(this.intent);
  }

  /**
   * Metodo pubblico per mettere il focus sull'input del nome intent (usabile dal parent).
   */
  public focusInput(): void {
    if (this.inputIntentName?.nativeElement) {
      setTimeout(() => {
        this.inputIntentName.nativeElement.focus({ preventScroll: true });
      }, 300);
    }
  }

  /**
   * Inizializza stato e nome intent; imposta colore e flag per intent riservati.
   */
  private initialize(): void {
    this.listOfIntents = this.intentService.listOfIntents;
    this.intentNameAlreadyExist = false;
    this.intentNameNOTHasSpecialCharacters = true;
    if (
      this.intent.intent_display_name === undefined ||
      this.intent.intent_display_name.trim().length === 0
    ) {
      this.intentService.setDisplayName();
    } else {
      this.intentName = this.intent.intent_display_name;
    }
    if (this.intentName === RESERVED_INTENT_NAMES.START) {
      this.isStart = true;
    } else if (this.intentName === RESERVED_INTENT_NAMES.DEFAULT_FALLBACK) {
      this.isDefaultFallback = true;
    } else if (this.intentName === RESERVED_INTENT_NAMES.WEBHOOK) {
      this.isWebhook = true;
    }
    if (!this.intentColor) {
      this.intentColor = INTENT_COLORS.COLOR1;
    }
    this.logger.log('[PANEL-INTENT-HEADER] initialize name:', this.intent);
  }

  /**
   * Verifica se il nome intent rispetta il regex (solo lettere, numeri, spazi, underscore).
   * @param intentname - nome da validare
   * @returns true se valido
   */
  private checkIntentNameMatchRegex(intentname: string): boolean {
    const regex = /^[ _0-9a-zA-Z]+$/;
    return regex.test(intentname);
  }

  /**
   * Controlla unicità e caratteri consentiti del nome; aggiorna flag di errore.
   * @param name - nome da controllare
   * @returns true se il nome è valido
   */
  private checkIntentName(name: string): boolean {
    this.intentNameAlreadyExist = false;
    if (
      !this.intentName ||
      this.intentName.trim().length === 0 ||
      this.intentName === UNTITLED_BLOCK_PREFIX
    ) {
      return false;
    }
    for (const element of this.listOfIntents) {
      if (
        element.intent_display_name === name &&
        element.intent_id !== this.intent.intent_id
      ) {
        this.intentNameAlreadyExist = true;
        return false;
      }
    }
    this.intentNameNOTHasSpecialCharacters =
      this.checkIntentNameMatchRegex(name);
    if (!this.intentNameNOTHasSpecialCharacters) {
      return false;
    }
    return true;
  }
}
