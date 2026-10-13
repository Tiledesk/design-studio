import {
  ACTIONS_LIST, ACTIONS_WITH_OWN_OUTPUTS, TYPE_ACTION, TYPE_CHATBOT,
  isActionAvailableInSubagentContext
} from './utils-actions';

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
