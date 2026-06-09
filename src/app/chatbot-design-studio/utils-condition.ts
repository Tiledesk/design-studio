import { TYPE_OPERATOR } from './utils';
import { Condition, Expression, Operator } from 'src/app/models/action-model';

/**
 * Serializzazione delle JSON Condition (AST `groups`) verso un'unica
 * rappresentazione stringa `when`, salvata a livello root dell'azione (fratello
 * di `groups`). Rappresenta TUTTE le condizioni su una sola riga.
 *
 * `when` è un campo DERIVATO: va sempre rigenerato da `groups` e mai editato a
 * mano, così l'AST (retrocompatibile) e la stringa non possono divergere.
 *
 * Grammatica di output (best practice, LLM-friendly, precedenza esplicita):
 *  - `&&` = AND, `||` = OR (precedenza standard: `&&` lega più di `||`)
 *  - letterale stringa tra doppi apici `"..."` (escape di `\` e `"`)
 *  - numero non quotato = numero; identificatore nudo = variabile di stato
 *  - operazioni su stringa espresse come funzioni: startsWith(a, "b"), ...
 *  - più gruppi → ognuno tra parentesi per preservare il raggruppamento
 */

const BOOLEAN_TOKENS = new Set<string>(['&&', '||']);

/** Operatori il cui RHS è un letterale numerico (niente apici). */
const NUMERIC_OPERATORS = new Set<string>([
  TYPE_OPERATOR.equalAsNumbers,
  TYPE_OPERATOR.notEqualAsNumbers,
  TYPE_OPERATOR.greaterThan,
  TYPE_OPERATOR.greaterThanOrEqual,
  TYPE_OPERATOR.lessThan,
  TYPE_OPERATOR.lessThanOrEqual,
]);

/** Operatori unari (nessun RHS). */
const UNARY_OPERATORS = new Set<string>([
  TYPE_OPERATOR.isEmpty,
  TYPE_OPERATOR.isNull,
  TYPE_OPERATOR.isUndefined,
]);

/** Escape per un letterale racchiuso tra doppi apici. */
export function escapeString(value: string): string {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function booleanToken(node: Operator): string {
  return node && node.operator === 'AND' ? '&&' : '||';
}

/** Rende l'operand2 come identificatore (var) o letterale (const). */
function renderOperand2(condition: Condition): string {
  const operand2: any = condition.operand2 || {};
  if (operand2.type === 'var') {
    // riferimento a variabile -> identificatore nudo
    return String(operand2.name || operand2.value || '').trim();
  }
  // costante
  const raw = operand2.value != null ? String(operand2.value) : '';
  if (NUMERIC_OPERATORS.has(condition.operator)) {
    return raw.trim(); // letterale numerico, senza apici
  }
  return `"${escapeString(raw)}"`; // letterale stringa
}

/** Traduce una singola Condition nella sua forma `when`. '' se incompleta. */
export function conditionToWhen(condition: Condition): string {
  if (!condition || !condition.operator) return '';
  const left = String(condition.operand1 || '').trim();
  if (!left) return '';
  const op = condition.operator;

  switch (op) {
    case TYPE_OPERATOR.isEmpty:     return `isEmpty(${left})`;
    case TYPE_OPERATOR.isNull:      return `isNull(${left})`;
    case TYPE_OPERATOR.isUndefined: return `isUndefined(${left})`;
  }

  const right = renderOperand2(condition);
  // RHS numerico vuoto -> condizione incompleta, da saltare
  if (right === '' && !UNARY_OPERATORS.has(op)) return '';

  switch (op) {
    case TYPE_OPERATOR.equalAsNumbers:
    case TYPE_OPERATOR.equalAsStrings:        return `${left} == ${right}`;
    case TYPE_OPERATOR.notEqualAsNumbers:
    case TYPE_OPERATOR.notEqualAsStrings:     return `${left} != ${right}`;
    case TYPE_OPERATOR.greaterThan:           return `${left} > ${right}`;
    case TYPE_OPERATOR.greaterThanOrEqual:    return `${left} >= ${right}`;
    case TYPE_OPERATOR.lessThan:              return `${left} < ${right}`;
    case TYPE_OPERATOR.lessThanOrEqual:       return `${left} <= ${right}`;
    case TYPE_OPERATOR.startsWith:            return `startsWith(${left}, ${right})`;
    case TYPE_OPERATOR.notStartsWith:         return `!startsWith(${left}, ${right})`;
    case TYPE_OPERATOR.startsWithIgnoreCase:  return `startsWithIgnoreCase(${left}, ${right})`;
    case TYPE_OPERATOR.contains:              return `contains(${left}, ${right})`;
    case TYPE_OPERATOR.containsIgnoreCase:    return `containsIgnoreCase(${left}, ${right})`;
    case TYPE_OPERATOR.endsWith:              return `endsWith(${left}, ${right})`;
    case TYPE_OPERATOR.matches:               return `matches(${left}, ${right})`;
    default:                                  return '';
  }
}

/**
 * Unisce i token in una stringa pulita: scarta token vuoti, operatori in testa
 * o in coda, e operatori consecutivi (es. quando una condizione è stata saltata).
 */
function joinTokens(tokens: string[]): string {
  const result: string[] = [];
  for (const token of tokens) {
    if (!token) continue;
    if (BOOLEAN_TOKENS.has(token)) {
      if (result.length === 0) continue;                            // operatore in testa
      if (BOOLEAN_TOKENS.has(result[result.length - 1])) continue;  // operatori consecutivi
    }
    result.push(token);
  }
  while (result.length && BOOLEAN_TOKENS.has(result[result.length - 1])) {
    result.pop(); // operatore in coda
  }
  return result.join(' ');
}

/** Traduce una Expression (conditions interlacciate con operatori) in `when`. */
export function serializeExpression(expression: Expression): string {
  if (!expression || !Array.isArray(expression.conditions)) return '';
  const tokens: string[] = [];
  expression.conditions.forEach((node: any) => {
    if (!node) return;
    if (node.type === 'operator') {
      tokens.push(booleanToken(node));
    } else {
      tokens.push(conditionToWhen(node as Condition));
    }
  });
  return joinTokens(tokens);
}

/**
 * Punto d'ingresso: traduce l'intero AST `groups` (Expression/Operator
 * interlacciati) nell'unica stringa `when`. Se ci sono più gruppi, ognuno è
 * racchiuso tra parentesi per preservare il raggruppamento dell'autore.
 */
export function serializeConditionToWhen(groups: Array<Expression | Operator>): string {
  if (!Array.isArray(groups) || groups.length === 0) return '';
  const expressionCount = groups.filter((n: any) => n && n.type === 'expression').length;
  const multi = expressionCount > 1;
  const tokens: string[] = [];
  groups.forEach((node: any) => {
    if (!node) return;
    if (node.type === 'operator') {
      tokens.push(booleanToken(node));
    } else {
      const exprStr = serializeExpression(node as Expression);
      tokens.push(exprStr ? (multi ? `(${exprStr})` : exprStr) : '');
    }
  });
  return joinTokens(tokens);
}
