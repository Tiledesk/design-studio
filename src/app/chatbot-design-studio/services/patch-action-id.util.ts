import { generateShortUID } from '../utils';

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
  (faqs || []).forEach(element => {
    (element?.actions || []).forEach((action: any) => {
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
