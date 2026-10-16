import {
  ACTIONS_LIST, ACTIONS_WITH_OWN_OUTPUTS, TYPE_ACTION, TYPE_CHATBOT,
  isActionAvailableInSubagentContext
} from './utils-actions';
import { dsVersionOf, isV3ManagedChatbot } from './utils';

describe('isV3ManagedChatbot — gli agenti del V3 non si aprono con questa console', () => {
  it('vero con l\'etichetta v3 nel campo ds_version del bot', () => {
    expect(isV3ManagedChatbot({ ds_version: 'v3' })).toBeTrue();
    expect(isV3ManagedChatbot({ ds_version: ' V3 ', attributes: {} })).toBeTrue();
  });
  it('vero anche con l\'etichetta alla vecchia maniera, in attributes.dsVersion', () => {
    expect(isV3ManagedChatbot({ attributes: { dsVersion: 'v3' } })).toBeTrue();
    expect(isV3ManagedChatbot({ attributes: { dsVersion: ' V3 ' } })).toBeTrue();
  });
  it('vero con la lista dei connettori, nel campo del bot o negli attributi', () => {
    expect(isV3ManagedChatbot({ connectors: { version: 1, items: [] } })).toBeTrue();
    expect(isV3ManagedChatbot({ attributes: { connectors: { version: 1, items: [] } } })).toBeTrue();
  });
  it('il campo vince sull\'attributo quando dicono cose diverse', () => {
    expect(isV3ManagedChatbot({ ds_version: 'v3', attributes: { dsVersion: 'legacy' } })).toBeTrue();
    expect(isV3ManagedChatbot({ ds_version: 'legacy', attributes: { dsVersion: 'v3' } })).toBeFalse();
    expect(dsVersionOf({ ds_version: 'v3', attributes: { dsVersion: 'legacy' } })).toBe('v3');
    expect(dsVersionOf({ attributes: { dsVersion: 'v3' } })).toBe('v3');
    expect(dsVersionOf({})).toBeUndefined();
  });
  it('falso senza etichetta e senza lista, con un\'altra etichetta, o senza agente', () => {
    expect(isV3ManagedChatbot({ attributes: {} })).toBeFalse();
    expect(isV3ManagedChatbot({ ds_version: 'legacy' })).toBeFalse();
    expect(isV3ManagedChatbot({ attributes: { dsVersion: 'legacy', connectors: {} } })).toBeFalse();
    expect(isV3ManagedChatbot({ connectors: {} })).toBeFalse();
    expect(isV3ManagedChatbot({})).toBeFalse();
    expect(isV3ManagedChatbot(null)).toBeFalse();
  });
});

/**
 * Invarianti del catalogo delle azioni.
 *
 * Nascono da una regressione vera: la condizione a piu' casi era gia' stata
 * aggiunta a ACTIONS_WITH_OWN_OUTPUTS, poi un branch combinato l'ha persa e sul
 * canvas il blocco ha ripreso a mostrare il pallino di uscita accanto alle sue
 * uscite proprie. Nessun test guardava quella lista, quindi nulla lo ha detto.
 */
describe('catalogo delle azioni — invarianti', () => {

  describe('ACTIONS_WITH_OWN_OUTPUTS', () => {
    it('contiene la condizione a piu\' casi: le sue uscite sono i casi e l\'else', () => {
      expect(ACTIONS_WITH_OWN_OUTPUTS).toContain(TYPE_ACTION.JSON_CONDITION_MULTI);
    });

    it('contiene anche le due condition che la precedono, per la stessa ragione', () => {
      expect(ACTIONS_WITH_OWN_OUTPUTS).toContain(TYPE_ACTION.JSON_CONDITION);
      expect(ACTIONS_WITH_OWN_OUTPUTS).toContain(TYPE_ACTION.JSON_CONDITION2);
    });

    it('ogni voce dell\'elenco e\' un tipo che il catalogo conosce davvero', () => {
      const tipiDelCatalogo = Object.values(ACTIONS_LIST).map(el => el.type as string);
      ACTIONS_WITH_OWN_OUTPUTS.forEach(tipo => {
        expect(tipiDelCatalogo).toContain(tipo as string);
      });
    });
  });

  describe('ds_version: a quale editor appartiene un\'azione', () => {
    it('la condizione a piu\' casi e\' marcata solo-V3', () => {
      const voce = Object.values(ACTIONS_LIST).find(el => el.type === TYPE_ACTION.JSON_CONDITION_MULTI);
      expect(voce?.ds_version).toBe('v3');
    });

    it('il marcatore NON filtra la palette: a schermo non cambia nulla', () => {
      // Il pannello delle azioni (cds-panel-elements) filtra su tre cose sole:
      // categoria, status e contesto subagent. Il marcatore lo legge solo la
      // guardia in flow-ops: se un giorno entrasse anche qui, gli agenti legacy
      // perderebbero l'azione dal pannello senza che nessuno l'abbia deciso.
      const voce = Object.values(ACTIONS_LIST)
        .find(el => el.type === TYPE_ACTION.JSON_CONDITION_MULTI);
      expect(voce?.status).not.toBe('inactive');
      expect(voce?.chatbot_types).toContain(TYPE_CHATBOT.CHATBOT);
      expect(isActionAvailableInSubagentContext(voce as any, false)).toBe(true);
    });

    it('e\' l\'unica azione marcata: la classificazione e\' voluta, non diffusa per sbaglio', () => {
      const marcate = Object.values(ACTIONS_LIST)
        .filter(el => el.ds_version === 'v3')
        .map(el => el.type as string);
      expect(marcate).toEqual([TYPE_ACTION.JSON_CONDITION_MULTI as string]);
    });
  });

});
