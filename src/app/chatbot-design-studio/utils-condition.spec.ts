import { TYPE_OPERATOR_V2, OPERATORS_LIST_REPLY_FILTER, isReplyFilterOperatorSupported } from './utils';
import { Condition, Expression, Operator } from 'src/app/models/action-model';
import {
  serializeConditionToWhen,
  serializeExpression,
  conditionToWhen,
  escapeString,
  applyConditionSaveModeToPayload,
  SAVE_ONLY_WHEN,
  parseWhenToGroups,
  parseCondition,
  hasFilter,
  ensureConditionsFromWhen,
  ensureCaseConditionsFromWhen,
} from './utils-condition';

/** Helpers di costruzione AST */
function cond(operand1: string, operator: TYPE_OPERATOR_V2, operand2?: { type: 'const' | 'var', value?: string, name?: string }): Condition {
  const c = new Condition();
  c.operand1 = operand1;
  c.operator = operator as any; // Condition.operator resta tipato col TYPE_OPERATOR legacy
  c.operand2 = (operand2 || { type: 'const', value: '', name: '' }) as any;
  return c;
}
function op(operator: 'AND' | 'OR'): Operator {
  const o = new Operator();
  o.operator = operator;
  return o;
}
function expr(...conditions: Array<Condition | Operator>): Expression {
  const e = new Expression();
  e.conditions = conditions;
  return e;
}

describe('utils-condition · serializeConditionToWhen', () => {

  it('filtro reply (_tdJSONCondition: Expression) -> popola `when` dentro l\'expression', () => {
    // Caso delle action con filtri (reply, ecc.): l'expression è il _tdJSONCondition stesso
    const tdJSONCondition = expr(
      cond('lastUserText', TYPE_OPERATOR_V2.equalAsNumbers, { type: 'const', value: '1', name: '' }),
      op('AND'),
      cond('user_city', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Roma', name: '' }),
    );
    tdJSONCondition.when = serializeExpression(tdJSONCondition);
    expect(tdJSONCondition.when).toBe('lastUserText == 1 && user_city == "Roma"');
  });

  it('riproduce l\'esempio utente: 2 gruppi (uno vuoto) + RHS variabile => "(kb_chunks == u)"', () => {
    const groups = [
      expr(cond('kb_chunks', TYPE_OPERATOR_V2.equalAsStrings, { type: 'var', name: 'u', value: 'u' })),
      op('AND'),
      expr(), // secondo gruppo vuoto -> scartato, l'AND pendente viene rimosso
    ];
    expect(serializeConditionToWhen(groups)).toBe('(kb_chunks == u)');
  });

  it('riproduce esattamente l\'esempio del brief (singolo gruppo, AND/OR misti)', () => {
    const groups = [
      expr(
        cond('ai_reply', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Ciao', name: '' }),
        op('AND'),
        cond('user_city', TYPE_OPERATOR_V2.notEqualAsStrings, { type: 'const', value: 'Roma', name: '' }),
        op('OR'),
        cond('user_language', TYPE_OPERATOR_V2.startsWith, { type: 'const', value: 'it', name: '' }),
      ),
    ];
    expect(serializeConditionToWhen(groups))
      .toBe('ai_reply == "Ciao" && user_city != "Roma" || startsWith(user_language, "it")');
  });

  it('numeri non quotati per gli operatori numerici', () => {
    expect(conditionToWhen(cond('age', TYPE_OPERATOR_V2.equalAsNumbers, { type: 'const', value: '1' }))).toBe('age == 1');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR_V2.notEqualAsNumbers, { type: 'const', value: '0' }))).toBe('age != 0');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR_V2.greaterThan, { type: 'const', value: '18' }))).toBe('age > 18');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR_V2.greaterThanOrEqual, { type: 'const', value: '18' }))).toBe('age >= 18');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR_V2.lessThan, { type: 'const', value: '65' }))).toBe('age < 65');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR_V2.lessThanOrEqual, { type: 'const', value: '65' }))).toBe('age <= 65');
  });

  it('stringhe quotate per gli operatori stringa', () => {
    expect(conditionToWhen(cond('city', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Roma' }))).toBe('city == "Roma"');
    expect(conditionToWhen(cond('city', TYPE_OPERATOR_V2.notEqualAsStrings, { type: 'const', value: 'Roma' }))).toBe('city != "Roma"');
  });

  it('operatori-funzione su stringa', () => {
    expect(conditionToWhen(cond('lang', TYPE_OPERATOR_V2.startsWith, { type: 'const', value: 'it' }))).toBe('startsWith(lang, "it")');
    expect(conditionToWhen(cond('lang', TYPE_OPERATOR_V2.notStartsWith, { type: 'const', value: 'it' }))).toBe('!startsWith(lang, "it")');
    expect(conditionToWhen(cond('msg', TYPE_OPERATOR_V2.contains, { type: 'const', value: 'hi' }))).toBe('contains(msg, "hi")');
    expect(conditionToWhen(cond('file', TYPE_OPERATOR_V2.endsWith, { type: 'const', value: '.pdf' }))).toBe('endsWith(file, ".pdf")');
    // Legacy ignore-case operators (removed) are normalized to case-sensitive.
    expect(conditionToWhen(cond('lang', 'startsWithIgnoreCase' as any, { type: 'const', value: 'IT' }))).toBe('startsWith(lang, "IT")');
    expect(conditionToWhen(cond('msg', 'containsIgnoreCase' as any, { type: 'const', value: 'HI' }))).toBe('contains(msg, "HI")');
    expect(conditionToWhen(cond('email', TYPE_OPERATOR_V2.matches, { type: 'const', value: '^.+@.+$' }))).toBe('matches(email, "^.+@.+$")');
  });

  it('operatori unari senza RHS', () => {
    expect(conditionToWhen(cond('x', TYPE_OPERATOR_V2.isEmpty))).toBe('isEmpty(x)');
    expect(conditionToWhen(cond('x', TYPE_OPERATOR_V2.isNull))).toBe('isNull(x)');
    expect(conditionToWhen(cond('x', TYPE_OPERATOR_V2.isUndefined))).toBe('isUndefined(x)');
  });

  it('RHS variabile = identificatore nudo (niente apici)', () => {
    expect(conditionToWhen(cond('city', TYPE_OPERATOR_V2.equalAsStrings, { type: 'var', name: 'user_city', value: 'user_city' }))).toBe('city == user_city');
    expect(conditionToWhen(cond('lang', TYPE_OPERATOR_V2.startsWith, { type: 'var', name: 'pref_lang', value: 'pref_lang' }))).toBe('startsWith(lang, pref_lang)');
  });

  it('escape dei caratteri speciali nelle stringhe', () => {
    expect(escapeString('say "hi"')).toBe('say \\"hi\\"');
    expect(conditionToWhen(cond('q', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'a"b' }))).toBe('q == "a\\"b"');
  });

  it('più gruppi: ogni gruppo tra parentesi, uniti dall\'operatore di gruppo', () => {
    const groups = [
      expr(
        cond('a', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'x' }),
        op('AND'),
        cond('b', TYPE_OPERATOR_V2.notEqualAsStrings, { type: 'const', value: 'y' }),
      ),
      op('OR'),
      expr(
        cond('c', TYPE_OPERATOR_V2.startsWith, { type: 'const', value: 'z' }),
      ),
    ];
    expect(serializeConditionToWhen(groups))
      .toBe('(a == "x" && b != "y") || (startsWith(c, "z"))');
  });

  it('singola condizione, singolo gruppo: nessuna parentesi', () => {
    const groups = [expr(cond('ai_reply', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Ciao' }))];
    expect(serializeConditionToWhen(groups)).toBe('ai_reply == "Ciao"');
  });

  it('save mode: azione jsoncondition2 -> `when` valorizzato; in TEST `groups` svuotato', () => {
    const action: any = {
      _tdActionType: 'jsoncondition2',
      groups: [ expr(cond('ai_reply', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Ciao' })) ],
      when: ''
    };
    const payload = { operations: [{ type: 'put', intent: { actions: [action] } }] };
    applyConditionSaveModeToPayload(payload);
    expect(action.when).toBe('ai_reply == "Ciao"');
    if (SAVE_ONLY_WHEN) {
      expect(action.groups).toEqual([]);
    } else {
      expect(action.groups.length).toBe(1); // modalità "entrambi": AST preservato
    }
  });

  it('save mode: azione LEGACY jsoncondition -> payload NON modificato (retrocompatibilità)', () => {
    const action: any = {
      _tdActionType: 'jsoncondition',
      groups: [ expr(cond('ai_reply', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Ciao' })) ]
    };
    const payload = { operations: [{ type: 'put', intent: { actions: [action] } }] };
    applyConditionSaveModeToPayload(payload);
    expect(action.when).toBeUndefined(); // nessun `when` scritto sulla vecchia azione
    expect(action.groups.length).toBe(1);
  });

  it('save mode: filtro reply V2 (version=2) -> `when` valorizzato ACCANTO alle `conditions`', () => {
    const tdJSONCondition: any = expr(cond('user_city', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Roma' }));
    tdJSONCondition.version = 2; // marker V2 (scritto dall'editor appdashboard-filter2)
    const action: any = {
      _tdActionType: 'reply',
      attributes: { message: { _tdJSONCondition: tdJSONCondition } }
    };
    const payload = { operations: [{ type: 'put', intent: { actions: [action] } }] };
    applyConditionSaveModeToPayload(payload);
    expect(tdJSONCondition.when).toBe('user_city == "Roma"');
    // le conditions restano: sono il nodo che il server valuta per i filtri reply
    expect(tdJSONCondition.conditions.length).toBe(1);
  });

  it('save mode: filtro reply LEGACY (senza version) -> NON modificato (retrocompatibilità)', () => {
    const tdJSONCondition: any = expr(cond('user_city', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Roma' }));
    delete tdJSONCondition.when; // il filtro legacy non ha `when`
    const action: any = {
      _tdActionType: 'reply',
      attributes: { message: { _tdJSONCondition: tdJSONCondition } }
    };
    const payload = { operations: [{ type: 'put', intent: { actions: [action] } }] };
    applyConditionSaveModeToPayload(payload);
    expect(tdJSONCondition.when).toBeUndefined();
    expect(tdJSONCondition.version).toBeUndefined();
    expect(tdJSONCondition.conditions.length).toBe(1);
  });

  it('save mode: payload nullo/malformato non lancia', () => {
    expect(() => applyConditionSaveModeToPayload(null)).not.toThrow();
    expect(() => applyConditionSaveModeToPayload({})).not.toThrow();
    expect(() => applyConditionSaveModeToPayload({ operations: [{ intent: {} }] })).not.toThrow();
  });

  it('casi vuoti / malformati non lanciano e producono stringa vuota o pulita', () => {
    expect(serializeConditionToWhen([])).toBe('');
    expect(serializeConditionToWhen(null as any)).toBe('');
    expect(serializeConditionToWhen([expr()])).toBe('');
    // operatore pendente perché una condizione è incompleta (manca operand1)
    const e = expr(
      cond('a', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'x' }),
      op('AND'),
      cond('', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'y' }),
    );
    expect(serializeExpression(e)).toBe('a == "x"');
  });

});

describe('utils-condition · parseWhenToGroups (round-trip when-preserving)', () => {

  // Per ogni `when` canonico: serialize(parse(when)) deve riprodurre lo stesso `when`.
  const CANONICAL_WHENS = [
    'user_city == "Roma"',
    'score == 10',
    'x != "y"',
    'x != myvar',
    'n > 5', 'n >= 5', 'n < 5', 'n <= 5',
    'x == myvar',
    'flag == true', 'flag == false',
    'startsWith(name, "dar")', '!startsWith(name, "dar")',
    'contains(text, "abc")', '!contains(text, "abc")',
    'endsWith(text, "z")', '!endsWith(text, "z")',
    'matches(text, "^a.*")', '!matches(text, "^a.*")',
    'isEmpty(a)', '!isEmpty(a)',
    'isNull(a)',
    'isUndefined(a)',
    'exists(a)', '!exists(a)',
    'dateEqual(d, "2024-01-01")', '!dateEqual(d, "2024-01-01")',
    'isAfter(d, "2024-01-01")', 'isBefore(d, "2024-01-01")',
    'isAfterOrEqual(d, "2024-01-01")', 'isBeforeOrEqual(d, "2024-01-01")',
    'arrayContains(list, "x")', '!arrayContains(list, "x")',
    'length(list) == 3', 'length(list) != 3',
    'length(list) > 2', 'length(list) < 2', 'length(list) >= 2', 'length(list) <= 2',
    'a == 1 && b == "x"',
    'a == 1 || b == "x"',
    'user_city == "Roma" && startsWith(name, "dar") || score >= 1',
    '(a == 1) || (b == "x" && c > 2)',
    'user.city == "Roma"',
    'people[0].name == "Anna"',
  ];

  CANONICAL_WHENS.forEach((when) => {
    it(`round-trip: ${when}`, () => {
      expect(serializeConditionToWhen(parseWhenToGroups(when))).toBe(when);
    });
  });

  it('escape stringhe (apici e backslash) preservati nel round-trip', () => {
    const when = 'msg == "he said \\"hi\\" \\\\ done"';
    expect(serializeConditionToWhen(parseWhenToGroups(when))).toBe(when);
  });

  it('input vuoto/nullo -> []', () => {
    expect(parseWhenToGroups('')).toEqual([]);
    expect(parseWhenToGroups(null as any)).toEqual([]);
  });

  it('normalizza le parentesi ridondanti di un singolo gruppo (caso degenere multi-gruppo con gruppo vuoto)', () => {
    // `(kb_chunks == u)` deriva da un AST a 2 gruppi con uno vuoto; il parse lo interpreta come
    // singolo gruppo e il re-serialize toglie le parentesi ridondanti: semanticamente identico, idempotente.
    expect(serializeConditionToWhen(parseWhenToGroups('(kb_chunks == u)'))).toBe('kb_chunks == u');
    // idempotenza: dal secondo giro in poi è stabile
    const once = serializeConditionToWhen(parseWhenToGroups('(kb_chunks == u)'));
    expect(serializeConditionToWhen(parseWhenToGroups(once))).toBe(once);
  });

  it('multi-gruppo: struttura Expression | Operator(OR) | Expression, con marker version=2', () => {
    const groups: any[] = parseWhenToGroups('(a == 1) || (b == "x")');
    expect(groups.length).toBe(3);
    expect(groups[0].type).toBe('expression');
    expect(groups[0].version).toBe(2);
    expect(groups[1].type).toBe('operator');
    expect(groups[1].operator).toBe('OR');
    expect(groups[2].type).toBe('expression');
  });

  it('parseCondition: numero->equalAsNumbers, stringa->equalAsStrings, var->equalAsStrings+var', () => {
    expect(parseCondition('n == 10')?.operator as any).toBe(TYPE_OPERATOR_V2.equalAsNumbers);
    expect(parseCondition('s == "x"')?.operator as any).toBe(TYPE_OPERATOR_V2.equalAsStrings);
    const v: any = parseCondition('s == myvar');
    expect(v.operator).toBe(TYPE_OPERATOR_V2.equalAsStrings);
    expect(v.operand2.type).toBe('var');
    expect(v.operand2.name).toBe('myvar');
  });

  it('parseCondition: unari e negazioni mappano agli operatori giusti', () => {
    expect(parseCondition('isEmpty(a)')?.operator as any).toBe(TYPE_OPERATOR_V2.isEmpty);
    expect(parseCondition('!isEmpty(a)')?.operator as any).toBe(TYPE_OPERATOR_V2.isNotEmpty);
    expect(parseCondition('!isUndefined(a)')?.operator as any).toBe(TYPE_OPERATOR_V2.exists);
    expect(parseCondition('a == true')?.operator as any).toBe(TYPE_OPERATOR_V2.isTrue);
    expect(parseCondition('a == false')?.operator as any).toBe(TYPE_OPERATOR_V2.isFalse);
  });

  it('esiste / non esiste: un termine solo, che torna indietro intero', () => {
    // Scritto come `!isUndefined(a)`, "esiste" era vero anche su una variabile messa a null.
    expect(conditionToWhen(cond('a', TYPE_OPERATOR_V2.exists))).toBe('exists(a)');
    expect(conditionToWhen(cond('a', TYPE_OPERATOR_V2.doesNotExist))).toBe('!exists(a)');
    // Riaperta, la condizione deve tornare l'operatore da cui e' nata. `doesNotExist` non ce la
    // faceva: veniva salvato come `isUndefined(a)` e si rileggeva come `isUndefined`, cambiando
    // operatore sotto le mani di chi l'aveva scritto.
    expect(parseCondition('exists(a)')?.operator as any).toBe(TYPE_OPERATOR_V2.exists);
    expect(parseCondition('!exists(a)')?.operator as any).toBe(TYPE_OPERATOR_V2.doesNotExist);
    // I filtri salvati prima restano leggibili.
    expect(parseCondition('isUndefined(a)')?.operator as any).toBe(TYPE_OPERATOR_V2.isUndefined);
  });

  it('un filtro salvato con la vecchia forma viene riscritto al primo salvataggio', () => {
    // `!isUndefined(a)` si rilegge come "esiste" e si riscrive `exists(a)`: non e' un ritorno
    // identico, ed e' voluto. La vecchia forma diceva che una variabile messa a null esiste, e
    // riscriverla e' il modo in cui la correzione raggiunge i filtri gia' salvati. Finche'
    // nessuno li riapre continuano a comportarsi come prima, perche' il motore legge la loro
    // formula cosi' com'e'.
    const riletta = parseCondition('!isUndefined(a)');
    expect(riletta?.operator as any).toBe(TYPE_OPERATOR_V2.exists);
    expect(conditionToWhen(riletta!)).toBe('exists(a)');
  });

});

/* ============================================================================
 * Filtri reply V2: il server valuta l'AST `conditions` (semantica V1).
 * Il contratto "solo `when`" vale unicamente per l'AZIONE jsoncondition2.
 * ==========================================================================*/
describe('utils-condition · filtri reply V2', () => {

  /** Costruisce il payload di salvataggio attorno a un _tdJSONCondition. */
  function payloadWith(tdJSONCondition: any) {
    const action: any = { _tdActionType: 'reply', attributes: { message: { _tdJSONCondition: tdJSONCondition } } };
    return { operations: [{ type: 'put', intent: { actions: [action] } }] };
  }

  it('il nodo `conditions` sopravvive al salvataggio: è quello che il server valuta', () => {
    const td: any = expr(
      cond('user_city', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Roma' }),
      op('AND'),
      cond('age', TYPE_OPERATOR_V2.greaterThan, { type: 'const', value: '18' }),
    );
    td.version = 2;
    applyConditionSaveModeToPayload(payloadWith(td));
    expect(td.conditions.length).toBe(3);
    expect(td.when).toBe('user_city == "Roma" && age > 18');
  });

  it('salvataggio idempotente: `when` rigenerato identico, AST invariato', () => {
    const td: any = expr(cond('user_city', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Roma' }));
    td.version = 2;
    applyConditionSaveModeToPayload(payloadWith(td));
    const first = td.when;
    applyConditionSaveModeToPayload(payloadWith(td));
    expect(td.when).toBe(first);
    expect(td.conditions.length).toBe(1);
  });

  it('filtro V2 senza AST (salvato da una build intermedia): `when` non viene azzerato', () => {
    const td: any = { type: 'expression', version: 2, conditions: [], when: '!isUndefined(kb_chunks)' };
    applyConditionSaveModeToPayload(payloadWith(td));
    expect(td.when).toBe('!isUndefined(kb_chunks)');
  });

  it('filtro svuotato dall\'utente: hasFilter() è false', () => {
    const td: any = { type: 'expression', version: 2, conditions: [], when: '' };
    applyConditionSaveModeToPayload(payloadWith(td));
    expect(hasFilter(td)).toBe(false);
  });

  it('filtro LEGACY: il payload resta byte-identico', () => {
    const td: any = expr(
      cond('user_city', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Roma' }),
      op('AND'),
      cond('age', TYPE_OPERATOR_V2.greaterThan, { type: 'const', value: '18' }),
    );
    delete td.when;
    const payload = payloadWith(td);
    const before = JSON.stringify(payload);
    applyConditionSaveModeToPayload(payload);
    expect(JSON.stringify(payload)).toBe(before);
  });

  it('condizione non serializzabile (RHS vuoto): AST conservato, `when` non azzerato', () => {
    const td: any = expr(cond('age', TYPE_OPERATOR_V2.greaterThan, { type: 'const', value: '' }));
    td.version = 2;
    applyConditionSaveModeToPayload(payloadWith(td));
    expect(td.conditions.length).toBe(1);
    expect(td.when).toBeUndefined();
  });

  it('il picker dei filtri reply espone tutti gli operatori del catalogo', () => {
    // Il picker e' DERIVATO: tiene le chiavi di OPERATORS_LIST_V2 presenti nell'enum legacy.
    // Restringerlo non e' piu' il modo di proteggere l'utente da un operatore che il motore
    // non sa valutare: quella protezione vive nel motore, che ora li implementa tutti.
    const prima = ['equalAsStrings', 'notEqualAsStrings', 'contains', 'startsWith', 'endsWith',
                   'matches', 'isEmpty', 'isNull', 'isUndefined', 'greaterThan', 'lessThanOrEqual'];
    const rimessi = ['exists', 'doesNotExist', 'isNotEmpty', 'notContains', 'notEndsWith',
                     'notMatches', 'isTrue', 'isFalse', 'equalAsDate', 'notEqualAsDate', 'isAfter',
                     'isBefore', 'isAfterOrEqual', 'isBeforeOrEqual', 'arrayContains',
                     'arrayNotContains', 'lengthEqualTo', 'lengthNotEqualTo', 'lengthGreaterThan',
                     'lengthLessThan', 'lengthGreaterThanOrEqual', 'lengthLessThanOrEqual'];
    [...prima, ...rimessi].forEach(o => {
      expect(isReplyFilterOperatorSupported(o)).toBe(true);
      expect(OPERATORS_LIST_REPLY_FILTER[o]).toBeDefined();
    });
    expect(rimessi.length).toBe(22);
    expect(Object.keys(OPERATORS_LIST_REPLY_FILTER).length).toBe(38);
  });

  it('hasFilter: riconosce entrambe le forme ed è null-safe', () => {
    expect(hasFilter(null)).toBe(false);
    expect(hasFilter(undefined)).toBe(false);
    expect(hasFilter({})).toBe(false);
    expect(hasFilter({ conditions: [] })).toBe(false);
    expect(hasFilter({ conditions: [cond('a', TYPE_OPERATOR_V2.isEmpty)] })).toBe(true);
    expect(hasFilter({ conditions: [], when: 'a == "x"' })).toBe(true);
    expect(hasFilter({ conditions: [], when: '   ' })).toBe(false);
    expect(hasFilter({ when: 'a == "x"' })).toBe(true);
  });

  it('ensureConditionsFromWhen: ripara i filtri salvati senza AST, no-op sui legacy', () => {
    // auto-riparazione di un filtro salvato da una build intermedia (solo `when`)
    const orphan: any = { type: 'expression', version: 2, conditions: [], when: 'user_city == "Roma"' };
    ensureConditionsFromWhen(orphan);
    expect(orphan.conditions.length).toBe(1);

    // legacy: mai toccato
    const legacy: any = { type: 'expression', conditions: [], when: 'a == "x"' };
    ensureConditionsFromWhen(legacy);
    expect(legacy.conditions).toEqual([]);

    // AST già presente: non sovrascritto
    const withAst: any = expr(cond('a', TYPE_OPERATOR_V2.isEmpty));
    withAst.version = 2;
    withAst.when = 'b == "y"';
    ensureConditionsFromWhen(withAst);
    expect((withAst.conditions[0] as Condition).operand1).toBe('a');

    // `when` non parsabile: AST vuoto, dato preservato
    const bad: any = { type: 'expression', version: 2, conditions: [], when: 'weirdFunc(a)' };
    ensureConditionsFromWhen(bad);
    expect(bad.conditions).toEqual([]);
    applyConditionSaveModeToPayload(payloadWith(bad));
    expect(bad.when).toBe('weirdFunc(a)');
  });

});

/** Confronti di testo che ignorano maiuscole e minuscole.
 *
 *  La forma scelta abbassa di caso ENTRAMBI i lati con `lowerCase`, una funzione che il
 *  motore gia' conosce: nessun operatore nuovo, nessuna versione del motore da attendere.
 *  Il rischio vero non e' generare male, e' rileggere male -- il `when` e' l'unica cosa
 *  salvata, quindi se la rilettura non riconosce la forma la casella si ripresenta spenta
 *  e il salvataggio successivo cancella l'impostazione in silenzio. Per questo qui si
 *  prova soprattutto l'andata e ritorno. */
describe('utils-condition · ignora maiuscole e minuscole', () => {

  function ignoring(operand1: string, operator: TYPE_OPERATOR_V2, value: string): Condition {
    const c = cond(operand1, operator, { type: 'const', value });
    (c as any).ignoreCase = true;
    return c;
  }

  it('abbassa di caso entrambi i lati, non solo la variabile', () => {
    expect(conditionToWhen(ignoring('nome', TYPE_OPERATOR_V2.contains, 'Mario')))
      .toBe('contains(lowerCase(nome), lowerCase("Mario"))');
  });

  it('vale per ogni confronto di testo, negazioni comprese', () => {
    expect(conditionToWhen(ignoring('a', TYPE_OPERATOR_V2.equalAsStrings, 'x'))).toBe('lowerCase(a) == lowerCase("x")');
    expect(conditionToWhen(ignoring('a', TYPE_OPERATOR_V2.notEqualAsStrings, 'x'))).toBe('lowerCase(a) != lowerCase("x")');
    expect(conditionToWhen(ignoring('a', TYPE_OPERATOR_V2.notContains, 'x'))).toBe('!contains(lowerCase(a), lowerCase("x"))');
    expect(conditionToWhen(ignoring('a', TYPE_OPERATOR_V2.startsWith, 'x'))).toBe('startsWith(lowerCase(a), lowerCase("x"))');
    expect(conditionToWhen(ignoring('a', TYPE_OPERATOR_V2.notStartsWith, 'x'))).toBe('!startsWith(lowerCase(a), lowerCase("x"))');
    expect(conditionToWhen(ignoring('a', TYPE_OPERATOR_V2.endsWith, 'x'))).toBe('endsWith(lowerCase(a), lowerCase("x"))');
    expect(conditionToWhen(ignoring('a', TYPE_OPERATOR_V2.notEndsWith, 'x'))).toBe('!endsWith(lowerCase(a), lowerCase("x"))');
  });

  it('non tocca una condizione sensibile: il when e\' quello di sempre', () => {
    expect(conditionToWhen(cond('nome', TYPE_OPERATOR_V2.contains, { type: 'const', value: 'Mario' })))
      .toBe('contains(nome, "Mario")');
  });

  it('ignora il flag dove non ha senso: numeri e regex', () => {
    // Su un numero non c'e' caso da ignorare.
    expect(conditionToWhen(ignoring('eta', TYPE_OPERATOR_V2.greaterThan, '18'))).toBe('eta > 18');
    // Abbassare di caso una regex la cambia: `\D` diventerebbe `\d`, il suo opposto.
    // `escapeString` protegge la barra rovesciata: nel when arriva raddoppiata, ed e'
    // giusto cosi'. Quel che conta qui e' che NON sia stata abbassata di caso.
    expect(conditionToWhen(ignoring('a', TYPE_OPERATOR_V2.matches, '\\D+'))).toBe('matches(a, "\\\\D+")');
  });

  it('riapre la condizione come l\'utente l\'aveva lasciata', () => {
    const parsed: any = parseCondition('contains(lowerCase(nome), lowerCase("Mario"))');
    expect(parsed.operator).toBe(TYPE_OPERATOR_V2.contains);
    expect(parsed.operand1).toBe('nome');
    expect(parsed.operand2.value).toBe('Mario');
    expect(parsed.ignoreCase).toBeTrue();
  });

  it('riapre anche la forma con ==', () => {
    const parsed: any = parseCondition('lowerCase(citta) == lowerCase("Roma")');
    expect(parsed.operator).toBe(TYPE_OPERATOR_V2.equalAsStrings);
    expect(parsed.operand1).toBe('citta');
    expect(parsed.operand2.value).toBe('Roma');
    expect(parsed.ignoreCase).toBeTrue();
  });

  it('andata e ritorno: rigenerare dopo aver riletto da lo stesso when', () => {
    for (const when of [
      'contains(lowerCase(nome), lowerCase("Mario"))',
      '!contains(lowerCase(nome), lowerCase("Mario"))',
      'lowerCase(citta) == lowerCase("Roma")',
      'lowerCase(citta) != lowerCase("Roma")',
      'startsWith(lowerCase(a), lowerCase("x"))',
      'endsWith(lowerCase(a), lowerCase("x"))'
    ]) {
      expect(conditionToWhen(parseCondition(when) as Condition)).toBe(when);
    }
  });

  it('una condizione sensibile non diventa insensibile riaprendola', () => {
    const parsed: any = parseCondition('contains(nome, "Mario")');
    expect(parsed.ignoreCase).toBeUndefined();
  });

  it('lascia stare un lowerCase scritto a mano su un lato solo', () => {
    // Non e' la forma che generiamo: e' roba scritta da qualcuno, e va conservata
    // com'e' invece di essere reinterpretata.
    const parsed: any = parseCondition('contains(lowerCase(nome), "Mario")');
    expect(parsed.ignoreCase).toBeUndefined();
    expect(parsed.operand1).toBe('lowerCase(nome)');
  });
});

/* ============================================================================
 * Condition a piu' uscite (`jsonconditionmulti`)
 * ==========================================================================*/

describe('jsonconditionmulti — casi indipendenti', () => {

  const branch = (id: string, conditions: any[], intent: string) =>
    ({ type: 'expression', _tdCaseId: id, conditions, intent } as any);

  const save = (action: any) => {
    const payload = { operations: [{ type: 'put', intent: { actions: [action] } }] };
    applyConditionSaveModeToPayload(payload);
    return action;
  };

  it('ogni caso esce con il PROPRIO `when` e le conditions svuotate', () => {
    const action: any = {
      _tdActionType: 'jsonconditionmulti',
      cases: [
        branch('c1', [cond('x', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: '1' })], '#B1'),
        branch('c2', [cond('y', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: '2' })], '#B2'),
      ],
      elseIntent: '#ELSE',
    };
    save(action);
    expect(action.cases[0].when).toBe('x == "1"');
    expect(action.cases[1].when).toBe('y == "2"');
    if (SAVE_ONLY_WHEN) {
      expect(action.cases[0].conditions).toEqual([]);
      expect(action.cases[1].conditions).toEqual([]);
    }
    // id, destinazione e ramo else non vengono toccati dal salvataggio
    expect(action.cases[0]._tdCaseId).toBe('c1');
    expect(action.cases[0].intent).toBe('#B1');
    expect(action.elseIntent).toBe('#ELSE');
  });

  it('dentro un caso AND/OR continuano a funzionare', () => {
    const action: any = {
      _tdActionType: 'jsonconditionmulti',
      cases: [branch('c1', [
        cond('lastUserText', TYPE_OPERATOR_V2.isNotEmpty),
        { type: 'operator', operator: 'AND' },
        cond('user_city', TYPE_OPERATOR_V2.contains, { type: 'const', value: 'new' }),
      ], '#B1')],
    };
    save(action);
    expect(action.cases[0].when).toBe('!isEmpty(lastUserText) && contains(user_city, "new")');
  });

  it('un caso NON aperto in questa sessione conserva il suo `when`', () => {
    // Arriva dal server in forma solo-`when`: rigenerare da un AST vuoto lo cancellerebbe.
    const action: any = {
      _tdActionType: 'jsonconditionmulti',
      cases: [{ type: 'expression', _tdCaseId: 'c1', conditions: [], when: 'x == "1"', intent: '#B1' }],
    };
    save(action);
    expect(action.cases[0].when).toBe('x == "1"');
  });

  it('R1 — un payload misto lascia intatte V1 e V2', () => {
    const v1: any = {
      _tdActionType: 'jsoncondition',
      groups: [expr(cond('a', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: '1' }))],
    };
    const v2: any = {
      _tdActionType: 'jsoncondition2',
      groups: [expr(cond('b', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: '2' }))],
      when: '',
    };
    const multi: any = {
      _tdActionType: 'jsonconditionmulti',
      cases: [branch('c1', [cond('c', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: '3' })], '#B1')],
    };
    const payload = { operations: [{ type: 'put', intent: { actions: [v1, v2, multi] } }] };
    applyConditionSaveModeToPayload(payload);

    // V1: nessun `when`, AST intatto — come prima che la action nuova esistesse
    expect(v1.when).toBeUndefined();
    expect(v1.groups.length).toBe(1);
    // V2: una sola stringa, dai suoi `groups`
    expect(v2.when).toBe('b == "2"');
    expect((v2 as any).cases).toBeUndefined();
    // Multi: il suo caso
    expect(multi.cases[0].when).toBe('c == "3"');
    expect((multi as any).groups).toBeUndefined();
  });

  it('riapertura: i casi si ricostruiscono da `when`, nell ordine', () => {
    const action: any = {
      _tdActionType: 'jsonconditionmulti',
      cases: [
        { type: 'expression', _tdCaseId: 'c1', conditions: [], when: 'x == "1"', intent: '#B1' },
        { type: 'expression', _tdCaseId: 'c2', conditions: [], when: 'contains(user_city, "new")', intent: '#B2' },
      ],
    };
    ensureCaseConditionsFromWhen(action);
    expect(action.cases[0].conditions.length).toBe(1);
    expect(action.cases[0].conditions[0].operand1).toBe('x');
    expect(action.cases[1].conditions[0].operand1).toBe('user_city');
    expect(action.cases[1].conditions[0].operator).toBe(TYPE_OPERATOR_V2.contains);
  });

  it('giro completo: salva, riapri, risalva -> stesso `when`', () => {
    const action: any = {
      _tdActionType: 'jsonconditionmulti',
      cases: [branch('c1', [
        cond('x', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: '1' }),
        { type: 'operator', operator: 'OR' },
        cond('y', TYPE_OPERATOR_V2.greaterThan, { type: 'const', value: '10' }),
      ], '#B1')],
    };
    save(action);
    const primo = action.cases[0].when;
    ensureCaseConditionsFromWhen(action);
    save(action);
    expect(action.cases[0].when).toBe(primo);
  });

  it('un caso vuoto resta vuoto: nessun `when` inventato', () => {
    const action: any = {
      _tdActionType: 'jsonconditionmulti',
      cases: [{ type: 'expression', _tdCaseId: 'c1', conditions: [], intent: '' }],
    };
    save(action);
    expect(action.cases[0].when).toBeUndefined();
    ensureCaseConditionsFromWhen(action);
    expect(action.cases[0].conditions).toEqual([]);
  });

  it('azione senza `cases` non fa esplodere il salvataggio', () => {
    const action: any = { _tdActionType: 'jsonconditionmulti', elseIntent: '#ELSE' };
    expect(() => save(action)).not.toThrow();
    expect(() => ensureCaseConditionsFromWhen(action)).not.toThrow();
  });

});

describe('round-trip dei letterali numerici (V2 e multi)', () => {

  it('`x == "1"` resta un confronto di TESTO dopo riapertura e risalvataggio', () => {
    const groups = parseWhenToGroups('x == "1"');
    expect(serializeConditionToWhen(groups)).toBe('x == "1"');
    const c: any = (groups[0] as any).conditions[0];
    expect(c.operator).toBe(TYPE_OPERATOR_V2.equalAsStrings);
  });

  it('`x == 1` resta un confronto di NUMERI', () => {
    const groups = parseWhenToGroups('x == 1');
    expect(serializeConditionToWhen(groups)).toBe('x == 1');
    const c: any = (groups[0] as any).conditions[0];
    expect(c.operator).toBe(TYPE_OPERATOR_V2.equalAsNumbers);
  });

  it('vale anche per il diverso', () => {
    expect(serializeConditionToWhen(parseWhenToGroups('x != "2"'))).toBe('x != "2"');
    expect(serializeConditionToWhen(parseWhenToGroups('x != 2'))).toBe('x != 2');
  });

});
