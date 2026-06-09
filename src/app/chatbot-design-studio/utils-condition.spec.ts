import { TYPE_OPERATOR } from './utils';
import { Condition, Expression, Operator } from 'src/app/models/action-model';
import {
  serializeConditionToWhen,
  serializeExpression,
  conditionToWhen,
  escapeString,
} from './utils-condition';

/** Helpers di costruzione AST */
function cond(operand1: string, operator: TYPE_OPERATOR, operand2?: { type: 'const' | 'var', value?: string, name?: string }): Condition {
  const c = new Condition();
  c.operand1 = operand1;
  c.operator = operator;
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
      cond('lastUserText', TYPE_OPERATOR.equalAsNumbers, { type: 'const', value: '1', name: '' }),
      op('AND'),
      cond('user_city', TYPE_OPERATOR.equalAsStrings, { type: 'const', value: 'Roma', name: '' }),
    );
    tdJSONCondition.when = serializeExpression(tdJSONCondition);
    expect(tdJSONCondition.when).toBe('lastUserText == 1 && user_city == "Roma"');
  });

  it('riproduce l\'esempio utente: 2 gruppi (uno vuoto) + RHS variabile => "(kb_chunks == u)"', () => {
    const groups = [
      expr(cond('kb_chunks', TYPE_OPERATOR.equalAsStrings, { type: 'var', name: 'u', value: 'u' })),
      op('AND'),
      expr(), // secondo gruppo vuoto -> scartato, l'AND pendente viene rimosso
    ];
    expect(serializeConditionToWhen(groups)).toBe('(kb_chunks == u)');
  });

  it('riproduce esattamente l\'esempio del brief (singolo gruppo, AND/OR misti)', () => {
    const groups = [
      expr(
        cond('ai_reply', TYPE_OPERATOR.equalAsStrings, { type: 'const', value: 'Ciao', name: '' }),
        op('AND'),
        cond('user_city', TYPE_OPERATOR.notEqualAsStrings, { type: 'const', value: 'Roma', name: '' }),
        op('OR'),
        cond('user_language', TYPE_OPERATOR.startsWith, { type: 'const', value: 'it', name: '' }),
      ),
    ];
    expect(serializeConditionToWhen(groups))
      .toBe('ai_reply == "Ciao" && user_city != "Roma" || startsWith(user_language, "it")');
  });

  it('numeri non quotati per gli operatori numerici', () => {
    expect(conditionToWhen(cond('age', TYPE_OPERATOR.equalAsNumbers, { type: 'const', value: '1' }))).toBe('age == 1');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR.notEqualAsNumbers, { type: 'const', value: '0' }))).toBe('age != 0');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR.greaterThan, { type: 'const', value: '18' }))).toBe('age > 18');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR.greaterThanOrEqual, { type: 'const', value: '18' }))).toBe('age >= 18');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR.lessThan, { type: 'const', value: '65' }))).toBe('age < 65');
    expect(conditionToWhen(cond('age', TYPE_OPERATOR.lessThanOrEqual, { type: 'const', value: '65' }))).toBe('age <= 65');
  });

  it('stringhe quotate per gli operatori stringa', () => {
    expect(conditionToWhen(cond('city', TYPE_OPERATOR.equalAsStrings, { type: 'const', value: 'Roma' }))).toBe('city == "Roma"');
    expect(conditionToWhen(cond('city', TYPE_OPERATOR.notEqualAsStrings, { type: 'const', value: 'Roma' }))).toBe('city != "Roma"');
  });

  it('operatori-funzione su stringa', () => {
    expect(conditionToWhen(cond('lang', TYPE_OPERATOR.startsWith, { type: 'const', value: 'it' }))).toBe('startsWith(lang, "it")');
    expect(conditionToWhen(cond('lang', TYPE_OPERATOR.notStartsWith, { type: 'const', value: 'it' }))).toBe('!startsWith(lang, "it")');
    expect(conditionToWhen(cond('lang', TYPE_OPERATOR.startsWithIgnoreCase, { type: 'const', value: 'IT' }))).toBe('startsWithIgnoreCase(lang, "IT")');
    expect(conditionToWhen(cond('msg', TYPE_OPERATOR.contains, { type: 'const', value: 'hi' }))).toBe('contains(msg, "hi")');
    expect(conditionToWhen(cond('msg', TYPE_OPERATOR.containsIgnoreCase, { type: 'const', value: 'HI' }))).toBe('containsIgnoreCase(msg, "HI")');
    expect(conditionToWhen(cond('file', TYPE_OPERATOR.endsWith, { type: 'const', value: '.pdf' }))).toBe('endsWith(file, ".pdf")');
    expect(conditionToWhen(cond('email', TYPE_OPERATOR.matches, { type: 'const', value: '^.+@.+$' }))).toBe('matches(email, "^.+@.+$")');
  });

  it('operatori unari senza RHS', () => {
    expect(conditionToWhen(cond('x', TYPE_OPERATOR.isEmpty))).toBe('isEmpty(x)');
    expect(conditionToWhen(cond('x', TYPE_OPERATOR.isNull))).toBe('isNull(x)');
    expect(conditionToWhen(cond('x', TYPE_OPERATOR.isUndefined))).toBe('isUndefined(x)');
  });

  it('RHS variabile = identificatore nudo (niente apici)', () => {
    expect(conditionToWhen(cond('city', TYPE_OPERATOR.equalAsStrings, { type: 'var', name: 'user_city', value: 'user_city' }))).toBe('city == user_city');
    expect(conditionToWhen(cond('lang', TYPE_OPERATOR.startsWith, { type: 'var', name: 'pref_lang', value: 'pref_lang' }))).toBe('startsWith(lang, pref_lang)');
  });

  it('escape dei caratteri speciali nelle stringhe', () => {
    expect(escapeString('say "hi"')).toBe('say \\"hi\\"');
    expect(conditionToWhen(cond('q', TYPE_OPERATOR.equalAsStrings, { type: 'const', value: 'a"b' }))).toBe('q == "a\\"b"');
  });

  it('più gruppi: ogni gruppo tra parentesi, uniti dall\'operatore di gruppo', () => {
    const groups = [
      expr(
        cond('a', TYPE_OPERATOR.equalAsStrings, { type: 'const', value: 'x' }),
        op('AND'),
        cond('b', TYPE_OPERATOR.notEqualAsStrings, { type: 'const', value: 'y' }),
      ),
      op('OR'),
      expr(
        cond('c', TYPE_OPERATOR.startsWith, { type: 'const', value: 'z' }),
      ),
    ];
    expect(serializeConditionToWhen(groups))
      .toBe('(a == "x" && b != "y") || (startsWith(c, "z"))');
  });

  it('singola condizione, singolo gruppo: nessuna parentesi', () => {
    const groups = [expr(cond('ai_reply', TYPE_OPERATOR.equalAsStrings, { type: 'const', value: 'Ciao' }))];
    expect(serializeConditionToWhen(groups)).toBe('ai_reply == "Ciao"');
  });

  it('casi vuoti / malformati non lanciano e producono stringa vuota o pulita', () => {
    expect(serializeConditionToWhen([])).toBe('');
    expect(serializeConditionToWhen(null as any)).toBe('');
    expect(serializeConditionToWhen([expr()])).toBe('');
    // operatore pendente perché una condizione è incompleta (manca operand1)
    const e = expr(
      cond('a', TYPE_OPERATOR.equalAsStrings, { type: 'const', value: 'x' }),
      op('AND'),
      cond('', TYPE_OPERATOR.equalAsStrings, { type: 'const', value: 'y' }),
    );
    expect(serializeExpression(e)).toBe('a == "x"');
  });

});
