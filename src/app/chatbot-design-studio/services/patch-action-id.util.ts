import { generateShortUID } from '../utils';

/**
 * Assigns a short id to actions that lack one (or carry the literal "UUIDV4"
 * placeholder used by server-generated welcome / defaultFallback blocks).
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
    });
  });
}
