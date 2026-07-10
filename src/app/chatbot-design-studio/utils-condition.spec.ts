import { TYPE_OPERATOR_V2 } from './utils';
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

  it('save mode: filtro reply V2 (version=2) -> `when` valorizzato; in TEST `conditions` svuotate', () => {
    const tdJSONCondition: any = expr(cond('user_city', TYPE_OPERATOR_V2.equalAsStrings, { type: 'const', value: 'Roma' }));
    tdJSONCondition.version = 2; // marker V2 (scritto dall'editor appdashboard-filter2)
    const action: any = {
      _tdActionType: 'reply',
      attributes: { message: { _tdJSONCondition: tdJSONCondition } }
    };
    const payload = { operations: [{ type: 'put', intent: { actions: [action] } }] };
    applyConditionSaveModeToPayload(payload);
    expect(tdJSONCondition.when).toBe('user_city == "Roma"');
    if (SAVE_ONLY_WHEN) {
      expect(tdJSONCondition.conditions).toEqual([]);
    } else {
      expect(tdJSONCondition.conditions.length).toBe(1);
    }
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
    'isUndefined(a)', '!isUndefined(a)',
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

});
