import { generateShortUID } from '../utils';
import { fixActionDestinationHashes } from '../utils-connectors';

/**
 * Assigns a short id to actions that lack one (or carry the literal "UUIDV4"
 * placeholder used by server-generated welcome / defaultFallback blocks), and
 * the same to the cases of a multi-case condition, whose connectors hang off
 * `_tdCaseId`.
 *
 * Null/undefined actions are skipped: they are a known possibility in loaded
 * flow data and are removed later by IntentService.intentAnalyzer(). Guarding
 * here prevents a "Cannot read properties of null (reading '_tdActionId')" crash
 * since patchActionId runs before that filtering step.
 */
export function patchActionIds(faqs: any[]): void {
  // Una destinazione salvata senza '#' (l'id nudo di un blocco) il motore la
  // cerca come NOME di blocco, non la trova e ferma il flusso, mentre il canvas
  // la disegna collegata. Qui si ripara al caricamento: solo se il valore e'
  // l'id di un blocco del flusso e non il nome di un altro, cosi' un flusso
  // vecchio che punta a un blocco per nome resta com'e'. Si salva con il
  // primo salvataggio del blocco.
  const intentIds = new Set((faqs || []).map(faq => faq?.intent_id).filter(id => !!id));
  const intentNames = new Set((faqs || []).map(faq => faq?.intent_display_name).filter(name => !!name));
  const isIntentId = (id: string) => intentIds.has(id) && !intentNames.has(id);
  (faqs || []).forEach(element => {
    (element?.actions || []).forEach((action: any) => {
      if (action) {
        fixActionDestinationHashes(action, isIntentId);
      }
      if (action && (!action._tdActionId || action._tdActionId === 'UUIDV4')) {
        action._tdActionId = action._tdActionId ? action._tdActionId : generateShortUID();
      }
      // Stessa ragione, un livello piu' sotto: il connettore di un caso della
      // condizione a piu' uscite e' ancorato a `_tdCaseId`. Un flusso importato,
      // scritto a mano o generato dalla chat puo' non averlo, e senza id il
      // connettore nasce agganciato a `undefined`. Chi ce l'ha se lo tiene: e'
      // cosi' che riordinare i casi non stacca i collegamenti.
      if (action && Array.isArray(action.cases)) {
        action.cases.forEach((branch: any) => {
          if (branch && !branch._tdCaseId) {
            branch._tdCaseId = generateShortUID();
          }
        });
      }
    });
  });
}
