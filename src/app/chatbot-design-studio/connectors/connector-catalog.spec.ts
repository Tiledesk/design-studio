import {
  BLOCK_SLOT, OUTPUT_CATALOG, TYPES_WITH_OWN_OUTPUTS, blockOutputOf, edgesOfFlow, edgesOfIntent, ensureTechnicalIds,
  indexFlow, outputsOf, parseButtonTarget, parseRecordId, readTarget, setTarget, slotOfFromId, typeHasOwnOutputs,
} from './connector-catalog';
import { ACTIONS_WITH_OWN_OUTPUTS, TYPE_ACTION, TYPE_ACTION_VXML } from '../utils-actions';

/**
 * Il catalogo delle uscite: una tabella per tipo di action da cui si ricavano i connettori.
 * Questi test fissano gli id che ogni tipo produce, cosi' che una modifica al catalogo che
 * cambiasse un id -- e quindi staccasse i collegamenti dei flussi salvati -- si veda subito.
 */
describe('connector-catalog', () => {

  const blocco = (id: string, actions: any[] = [], next?: string, name?: string) => ({
    intent_id: id, intent_display_name: name || id, actions,
    attributes: next === undefined ? {} : { nextBlockAction: { _tdActionId: 'n_' + id, _tdActionType: 'intent', intentName: next } },
  });
  const idsOf = (intent: any, index = indexFlow([intent, blocco('x'), blocco('y'), blocco('z')])) =>
    edgesOfIntent(intent, index).records.map(r => r.id);

  describe('gli id dei connettori per tipo', () => {
    it('intent e connect_block: nessun suffisso', () => {
      expect(idsOf(blocco('i', [{ _tdActionId: 'a', _tdActionType: 'intent', intentName: '#x' }]))).toEqual(['i/a/x']);
      expect(idsOf(blocco('i', [{ _tdActionId: 'a', _tdActionType: 'connect_block', intentName: '#x' }]))).toEqual(['i/a/x']);
    });

    it('la famiglia true/false, per ognuno dei venti tipi', () => {
      const tipi = [
        TYPE_ACTION.ONLINE_AGENTS, TYPE_ACTION.ONLINE_AGENTSV2, TYPE_ACTION.OPEN_HOURS, TYPE_ACTION.JSON_CONDITION,
        TYPE_ACTION.JSON_CONDITION2, TYPE_ACTION.INVOKE_SUB_AGENT, TYPE_ACTION.ASKGPT, TYPE_ACTION.ASKGPTV2, TYPE_ACTION.GPT_TASK,
        TYPE_ACTION.GPT_ASSISTANT, TYPE_ACTION.AI_PROMPT, TYPE_ACTION.WEB_REQUESTV2, TYPE_ACTION.DATA_TABLE, TYPE_ACTION.MAKE,
        TYPE_ACTION.HUBSPOT, TYPE_ACTION.CUSTOMERIO, TYPE_ACTION.BREVO, TYPE_ACTION.N8N, TYPE_ACTION.QAPLA, TYPE_ACTION.SEND_WHATSAPP,
      ];
      expect(tipi.length).toBe(20);
      for (const tipo of tipi) {
        expect(idsOf(blocco('i', [{ _tdActionId: 'a', _tdActionType: tipo, trueIntent: '#x', falseIntent: '#y' }])))
          .withContext(tipo).toEqual(['i/a/true/x', 'i/a/false/y']);
      }
    });

    it('reply v1: un connettore per bottone action (anche con la coda {attrs}), piu\' noInput/noMatch da settings', () => {
      const reply = { _tdActionId: 'a', _tdActionType: 'reply', attributes: { attachment: { buttons: [
        { uid: 'b1', type: 'action', action: '#x' }, { uid: 'b2', type: 'action', action: '#y{"k":1}' },
        { uid: 'b3', type: 'url', action: '#x' }, { uid: 'b4', type: 'action', action: '' },
      ] } }, settings: { noInputIntent: '#z', noMatchIntent: '#x' } };
      expect(idsOf(blocco('i', [reply]))).toEqual(['i/a/b1/x', 'i/a/b2/y', 'i/a/noInput/z', 'i/a/noMatch/x']);
      const senzaAncora = outputsOf('i', reply).filter(s => s.spec.anchor === 'none').map(s => s.key);
      expect(senzaAncora).toEqual(['noInput', 'noMatch']);
      // Il bottone url non ha uscita; quello di testo ha il pallino vuoto, da cui si puo' partire.
      const testo = { _tdActionId: 'a', _tdActionType: 'reply', attributes: { attachment: { buttons: [
        { uid: 't1', type: 'text', value: 'solo testo' }, { uid: 't2', type: 'text', action: '#x' }, { uid: 'u1', type: 'url', action: '#x' },
      ] } } };
      expect(outputsOf('i', testo).map(s => [s.key, s.toId])).toEqual([['button:t1', null], ['button:t2', null]]);
      expect(idsOf(blocco('i', [testo]))).toEqual([]);
    });

    it('i bottoni si trovano a qualunque profondita\', come findButtons', () => {
      const reply = { _tdActionId: 'a', _tdActionType: 'reply', attributes: { commands: [
        { message: { attributes: { attachment: { buttons: [{ uid: 'b1', type: 'action', action: '#x' }] } } } },
        { message: { attributes: { attachment: { buttons: [{ uid: 'b2', type: 'action', action: '#y' }] } } } },
      ] } };
      expect(idsOf(blocco('i', [reply]))).toEqual(['i/a/b1/x', 'i/a/b2/y']);
    });

    it('replyv2: bottoni piu\' noInput/noMatch sulla action', () => {
      const reply = { _tdActionId: 'a', _tdActionType: 'replyv2', noInputIntent: '#x', noMatchIntent: '#y',
        attributes: { attachment: { buttons: [{ uid: 'b1', type: 'action', action: '#z' }] } } };
      expect(idsOf(blocco('i', [reply]))).toEqual(['i/a/b1/z', 'i/a/noInput/x', 'i/a/noMatch/y']);
    });

    it('condizione a piu\' casi: un connettore per caso, ancorato a _tdCaseId, piu\' l\'altrimenti', () => {
      const multi = { _tdActionId: 'a', _tdActionType: 'jsonconditionmulti', elseIntent: '#z',
        cases: [{ _tdCaseId: 'c1', intent: '#x' }, { _tdCaseId: 'c2', intent: '' }, { _tdCaseId: 'c3', intent: '#y' }] };
      expect(idsOf(blocco('i', [multi]))).toEqual(['i/a/case/c1/x', 'i/a/case/c3/y', 'i/a/else/z']);
    });

    it('ai_condition: un connettore per ramo (dalla label), piu\' fallback ed error; senza intents non lancia', () => {
      const ai = { _tdActionId: 'a', _tdActionType: 'ai_condition', fallbackIntent: '#y', errorIntent: '#z',
        intents: [{ label: 'vendite', conditionIntentId: '#x' }, { label: 'altro', conditionIntentId: '' }] };
      expect(idsOf(blocco('i', [ai]))).toEqual(['i/a/vendite/true/x', 'i/a/fallback/y', 'i/a/error/z']);
      expect(idsOf(blocco('i', [{ _tdActionId: 'a', _tdActionType: 'ai_condition', fallbackIntent: '#y' }]))).toEqual(['i/a/fallback/y']);
    });

    it('capture: nessun suffisso; iteration: /goto e /fallback (senza ancora)', () => {
      expect(idsOf(blocco('i', [{ _tdActionId: 'a', _tdActionType: 'capture_user_reply', goToIntent: '#x' }]))).toEqual(['i/a/x']);
      const iter = { _tdActionId: 'a', _tdActionType: 'iteration', goToIntent: '#x', fallbackIntent: '#y' };
      expect(idsOf(blocco('i', [iter]))).toEqual(['i/a/goto/x', 'i/a/fallback/y']);
      expect(outputsOf('i', iter).find(s => s.key === 'fallback')!.spec.anchor).toBe('none');
    });

    it('voice: bottoni e settings dell\'ultimo comando; speech_form senza bottoni; commands vuoto non lancia', () => {
      const comandi = (settings: any, buttons: any[] = []) => ({ commands: [
        { type: 'message', message: { attributes: { attachment: { buttons } } } },
        { type: 'wait', settings },
      ] });
      const menu = { _tdActionId: 'a', _tdActionType: TYPE_ACTION_VXML.DTMF_MENU,
        attributes: comandi({ noInputIntent: '#x', noMatchIntent: '#y' }, [{ uid: 'k1', type: 'action', action: '#z' }]) };
      expect(idsOf(blocco('i', [menu]))).toEqual(['i/a/k1/z', 'i/a/noInput/x', 'i/a/noMatch/y']);
      const transfer = { _tdActionId: 'a', _tdActionType: TYPE_ACTION_VXML.BLIND_TRANSFER, attributes: comandi({ trueIntent: '#x', falseIntent: '#y' }) };
      expect(idsOf(blocco('i', [transfer]))).toEqual(['i/a/true/x', 'i/a/false/y']);
      const speech = { _tdActionId: 'a', _tdActionType: TYPE_ACTION_VXML.SPEECH_FORM,
        attributes: comandi({ noInputIntent: '#x' }, [{ uid: 'k1', type: 'action', action: '#z' }]) };
      expect(idsOf(blocco('i', [speech]))).toEqual(['i/a/noInput/x']);
      expect(idsOf(blocco('i', [{ _tdActionId: 'a', _tdActionType: TYPE_ACTION_VXML.DTMF_FORM, attributes: { commands: [] } }]))).toEqual([]);
      expect(idsOf(blocco('i', [{ _tdActionId: 'a', _tdActionType: TYPE_ACTION_VXML.DTMF_FORM }]))).toEqual([]);
    });

    it('il pallino del blocco: nextBlockAction, mai sui blocchi Return to parent agent', () => {
      expect(idsOf(blocco('i', [], '#x'))).toEqual(['i/n_i/x']);
      expect(blockOutputOf(blocco('i', [], ''))!.toId).toBeNull();
      expect(blockOutputOf(blocco('i', [{ _tdActionId: 'a', _tdActionType: 'returnstack' }], '#x'))).toBeNull();
      expect(blockOutputOf(blocco('i'))).toBeNull();
    });

    it('il pallino viene prima delle action, e un id ripetuto conta una volta', () => {
      const due = blocco('i', [{ _tdActionId: 'a', _tdActionType: 'reply', attributes: { attachment: { buttons: [
        { uid: 'b1', type: 'action', action: '#x' }, { uid: 'b1', type: 'action', action: '#x' },
      ] } } }], '#y');
      expect(idsOf(due)).toEqual(['i/n_i/y', 'i/a/b1/x']);
    });
  });

  describe('destinazioni', () => {
    it('legge `#id`, l\'id nudo, e la coda {attrs} dei bottoni', () => {
      expect(parseButtonTarget('#x{"a":1}')).toEqual({ toId: 'x', attrs: '{"a":1}', hasHash: true });
      expect(parseButtonTarget('x')).toEqual({ toId: 'x', attrs: null, hasHash: false });
      expect(parseButtonTarget('')).toEqual({ toId: null, attrs: null, hasHash: false });
      const nudo = outputsOf('i', { _tdActionId: 'a', _tdActionType: 'intent', intentName: 'x' })[0];
      expect(nudo.toId).toBe('x');
      expect(nudo.hasHash).toBeFalse();
    });

    it('un riferimento nel vuoto e\' pendente, con la ragione giusta', () => {
      const index = indexFlow([blocco('w1', [], undefined, 'welcome'), blocco('i')]);
      const intent = blocco('i', [
        { _tdActionId: 'a', _tdActionType: 'ai_prompt', trueIntent: '#nope', falseIntent: 'welcome' },
        { _tdActionId: 'b', _tdActionType: 'intent', intentName: 'boh' },
      ]);
      const { records, dangling } = edgesOfIntent(intent, index);
      expect(records).toEqual([]);
      expect(dangling.map(d => [d.fromId, d.reason])).toEqual([['i/a/true', 'unknown-id'], ['i/a/false', 'bare-name'], ['i/b', 'bare-unknown']]);
    });

    it('setTarget scrive `#id` nel campo giusto, conserva la coda dei bottoni, e svuota con null', () => {
      const intent = blocco('i', [
        { _tdActionId: 'a', _tdActionType: 'ai_prompt', trueIntent: '', falseIntent: '#y' },
        { _tdActionId: 'b', _tdActionType: 'reply', attributes: { attachment: { buttons: [{ uid: 'b1', type: 'action', action: '#x{"k":1}' }] } } },
        { _tdActionId: 'c', _tdActionType: 'jsonconditionmulti', cases: [{ _tdCaseId: 'c1', intent: '' }] },
      ], '');
      expect(setTarget(intent, 'a', 'true', 'x')).toBeTrue();
      expect(intent.actions[0].trueIntent).toBe('#x');
      expect(setTarget(intent, 'a', 'false', null)).toBeTrue();
      expect(intent.actions[0].falseIntent).toBe('');
      expect(setTarget(intent, 'b', 'button:b1', 'z')).toBeTrue();
      expect(intent.actions[1].attributes.attachment.buttons[0].action).toBe('#z{"k":1}');
      expect(setTarget(intent, 'c', 'case:c1', 'y')).toBeTrue();
      expect(intent.actions[2].cases[0].intent).toBe('#y');
      expect(setTarget(intent, null, BLOCK_SLOT.key, 'x')).toBeTrue();
      expect(intent.attributes.nextBlockAction.intentName).toBe('#x');
      expect(setTarget(intent, null, BLOCK_SLOT.key, 'x')).toBeFalse();
      expect(readTarget(intent, 'b', 'button:b1')).toBe('z');
      expect(setTarget(intent, 'a', 'boh', 'x')).toBeFalse();
    });

    it('slotOfFromId risale dall\'id dell\'ancora all\'uscita; parseRecordId spezza l\'id', () => {
      const intent = blocco('i', [{ _tdActionId: 'a', _tdActionType: 'ai_prompt', trueIntent: '#x', falseIntent: '' }], '#y');
      expect(slotOfFromId(intent, 'i/a/false')!.key).toBe('false');
      expect(slotOfFromId(intent, 'i/n_i')!.key).toBe('next');
      expect(slotOfFromId(intent, 'i/zzz')).toBeNull();
      expect(parseRecordId('i/a/true/x')).toEqual({ fromId: 'i/a/true', toId: 'x', intentId: 'i' });
      expect(parseRecordId('x')).toBeNull();
    });
  });

  describe('il flusso intero', () => {
    it('indicizza i record per blocco di partenza e di arrivo', () => {
      const flusso = [
        blocco('a', [{ _tdActionId: 'a1', _tdActionType: 'intent', intentName: '#b' }]),
        blocco('b', [{ _tdActionId: 'b1', _tdActionType: 'ai_prompt', trueIntent: '#a', falseIntent: '#c' }], '#a'),
        blocco('c'),
      ];
      const edges = edgesOfFlow(flusso);
      expect(edges.records.map(r => r.id)).toEqual(['a/a1/b', 'b/n_b/a', 'b/b1/true/a', 'b/b1/false/c']);
      expect(edges.outOf.get('b')!.map(r => r.from.slot)).toEqual(['next', 'true', 'false']);
      expect(edges.into.get('a')!.map(r => r.id)).toEqual(['b/n_b/a', 'b/b1/true/a']);
      expect(edges.byId.get('b/b1/false/c')!.kind).toBe('action');
      expect(edges.slots.get('b/n_b/a')!.kind).toBe('block');
    });
  });

  describe('id tecnici', () => {
    it('assegna _tdActionId, _tdCaseId e uid dei bottoni mancanti, UUIDV4 o duplicati, e riferisce ogni cambio', () => {
      let n = 0; const uid = () => 'u' + (++n);
      const flusso = [blocco('i', [
        { _tdActionType: 'jsonconditionmulti', cases: [{ intent: '#x' }, { _tdCaseId: 'c', intent: '' }] },
        { _tdActionId: 'UUIDV4', _tdActionType: 'reply', attributes: { attachment: { buttons: [
          { type: 'action', action: '#x' }, { uid: 'dup', type: 'action', action: '#x' }, { uid: 'dup', type: 'action', action: '#y' }, { uid: 'UUIDV4', type: 'url' },
        ] } } },
        { _tdActionId: 'ok', _tdActionType: 'intent', intentName: '#x' },
      ])];
      const changes = ensureTechnicalIds(flusso, uid);
      expect(changes.map(c => c.kind)).toEqual(['action-id', 'case-id', 'action-id', 'button-uid', 'button-uid', 'button-uid']);
      const [multi, reply] = flusso[0].actions;
      expect(multi._tdActionId).toBe('u1');
      expect(multi.cases[0]._tdCaseId).toBe('u2');
      expect(multi.cases[1]._tdCaseId).toBe('c');
      expect(reply._tdActionId).toBe('u3');
      expect(reply.attributes.attachment.buttons.map((b: any) => b.uid)).toEqual(['u4', 'dup', 'u5', 'u6']);
      expect(ensureTechnicalIds(flusso, uid)).toEqual([]);
    });
  });

  describe('le action con uscite proprie (V3)', () => {
    it('coincidono con ACTIONS_WITH_OWN_OUTPUTS di utils-actions, che ora comprende invoke_subagent', () => {
      expect([...TYPES_WITH_OWN_OUTPUTS].sort()).toEqual([...ACTIONS_WITH_OWN_OUTPUTS].sort());
      expect(typeHasOwnOutputs(TYPE_ACTION.INVOKE_SUB_AGENT)).toBeTrue();
      expect(typeHasOwnOutputs(TYPE_ACTION.REPLYV2)).toBeFalse();
      expect(typeHasOwnOutputs(TYPE_ACTION.ITERATION)).toBeFalse();
      expect(typeHasOwnOutputs(TYPE_ACTION_VXML.DTMF_MENU)).toBeFalse();
      expect(typeHasOwnOutputs(TYPE_ACTION.CLOSE)).toBeFalse();
    });

    it('ogni tipo del catalogo ha almeno un\'uscita e ogni uscita un suffisso che comincia per / o e\' vuoto', () => {
      for (const [tipo, slots] of Object.entries(OUTPUT_CATALOG)) {
        expect(slots.length).withContext(tipo).toBeGreaterThan(0);
        for (const slot of slots) {
          const suffix = typeof slot.suffix === 'function' ? slot.suffix({ uid: 'u', _tdCaseId: 'c', label: 'l' }) : slot.suffix;
          expect(suffix === '' || suffix.startsWith('/')).withContext(tipo + ' ' + slot.key).toBeTrue();
        }
      }
    });
  });
});
