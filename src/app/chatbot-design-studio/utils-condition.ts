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
  // Array length: il RHS è la lunghezza (numero, senza apici)
  TYPE_OPERATOR.lengthEqualTo,
  TYPE_OPERATOR.lengthNotEqualTo,
  TYPE_OPERATOR.lengthGreaterThan,
  TYPE_OPERATOR.lengthLessThan,
  TYPE_OPERATOR.lengthGreaterThanOrEqual,
  TYPE_OPERATOR.lengthLessThanOrEqual,
]);

/** Operatori unari (nessun RHS). Esportato per riuso lato UI (mostra/nascondi Value). */
export const UNARY_OPERATORS = new Set<string>([
  TYPE_OPERATOR.isEmpty,
  TYPE_OPERATOR.isNotEmpty,
  TYPE_OPERATOR.isNull,
  TYPE_OPERATOR.isUndefined,
  TYPE_OPERATOR.exists,
  TYPE_OPERATOR.doesNotExist,
  TYPE_OPERATOR.isTrue,
  TYPE_OPERATOR.isFalse,
]);

/** Escape per un letterale racchiuso tra doppi apici. */
export function escapeString(value: string): string {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * L'attributo (operand1) può essere inserito via picker come `{{attr}}` (formato liquidjs
 * standard del Design Studio) oppure digitato nudo. Nel `when` il left è un identificatore
 * nudo, quindi togliamo un eventuale wrapper `{{ ... }}` completo. Lascia invariato il resto.
 */
export function stripLiquidWrapper(value: string): string {
  const m = String(value || '').trim().match(/^\{\{\s*([\s\S]*?)\s*\}\}$/);
  return m ? m[1].trim() : String(value || '').trim();
}

/**
 * Operatori legacy rimossi (ignore-case): mappati ai corrispettivi case-sensitive.
 * Da ora tutte le condizioni sono case sensitive; le condizioni già salvate con
 * `containsIgnoreCase`/`startsWithIgnoreCase` continuano a funzionare come `contains`/`startsWith`.
 */
export function normalizeLegacyOperator(op: string): string {
  if (op === 'containsIgnoreCase') return TYPE_OPERATOR.contains;
  if (op === 'startsWithIgnoreCase') return TYPE_OPERATOR.startsWith;
  return op;
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
  const left = stripLiquidWrapper(condition.operand1);
  if (!left) return '';
  const op = normalizeLegacyOperator(condition.operator);

  // --- Unari (nessun RHS) ---
  switch (op) {
    case TYPE_OPERATOR.isEmpty:      return `isEmpty(${left})`;
    case TYPE_OPERATOR.isNotEmpty:   return `!isEmpty(${left})`;
    case TYPE_OPERATOR.isNull:       return `isNull(${left})`;
    case TYPE_OPERATOR.isUndefined:  return `isUndefined(${left})`;
    case TYPE_OPERATOR.exists:       return `!isUndefined(${left})`;
    case TYPE_OPERATOR.doesNotExist: return `isUndefined(${left})`;
    case TYPE_OPERATOR.isTrue:       return `${left} == true`;
    case TYPE_OPERATOR.isFalse:      return `${left} == false`;
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
    case TYPE_OPERATOR.contains:              return `contains(${left}, ${right})`;
    case TYPE_OPERATOR.notContains:           return `!contains(${left}, ${right})`;
    case TYPE_OPERATOR.endsWith:              return `endsWith(${left}, ${right})`;
    case TYPE_OPERATOR.notEndsWith:           return `!endsWith(${left}, ${right})`;
    case TYPE_OPERATOR.matches:               return `matches(${left}, ${right})`;
    case TYPE_OPERATOR.notMatches:            return `!matches(${left}, ${right})`;
    // --- Date & Time (RHS stringa ISO quotata) ---
    case TYPE_OPERATOR.equalAsDate:           return `dateEqual(${left}, ${right})`;
    case TYPE_OPERATOR.notEqualAsDate:        return `!dateEqual(${left}, ${right})`;
    case TYPE_OPERATOR.isAfter:               return `isAfter(${left}, ${right})`;
    case TYPE_OPERATOR.isBefore:              return `isBefore(${left}, ${right})`;
    case TYPE_OPERATOR.isAfterOrEqual:        return `isAfterOrEqual(${left}, ${right})`;
    case TYPE_OPERATOR.isBeforeOrEqual:       return `isBeforeOrEqual(${left}, ${right})`;
    // --- Array ---
    case TYPE_OPERATOR.arrayContains:         return `arrayContains(${left}, ${right})`;
    case TYPE_OPERATOR.arrayNotContains:      return `!arrayContains(${left}, ${right})`;
    case TYPE_OPERATOR.lengthEqualTo:         return `length(${left}) == ${right}`;
    case TYPE_OPERATOR.lengthNotEqualTo:      return `length(${left}) != ${right}`;
    case TYPE_OPERATOR.lengthGreaterThan:     return `length(${left}) > ${right}`;
    case TYPE_OPERATOR.lengthLessThan:        return `length(${left}) < ${right}`;
    case TYPE_OPERATOR.lengthGreaterThanOrEqual: return `length(${left}) >= ${right}`;
    case TYPE_OPERATOR.lengthLessThanOrEqual: return `length(${left}) <= ${right}`;
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

/* ============================================================================
 * Modalità di salvataggio delle condizioni
 * ==========================================================================*/

/**
 * Modalità di salvataggio (TEST).
 * - true  (TEST attuale): le condizioni sono salvate SOLO in `when`; l'AST
 *   (`groups` / `_tdJSONCondition.conditions`) viene svuotato nel payload persistito.
 * - false (retrocompatibilità): salva ENTRAMBI (AST + `when`).
 *
 * NB: la trasformazione agisce solo sul payload inviato al backend (un clone),
 * MAI sul modello in memoria → l'interfaccia del Design Studio resta invariata.
 */
export const SAVE_ONLY_WHEN = false;

/** type-id dell'azione JSON Condition (hardcoded per evitare import circolari da utils-actions). */
const JSON_CONDITION_TYPE = 'jsoncondition';

/** Genera `when` su un'Expression (filtri reply, ecc.) e, in modalità TEST, ne svuota `conditions`. */
function applyExpressionSaveMode(expr: any): void {
  if (!expr || typeof expr !== 'object' || !Array.isArray(expr.conditions)) return;
  expr.when = serializeExpression(expr as Expression);
  if (SAVE_ONLY_WHEN) expr.conditions = [];
}

/** Cerca ricorsivamente `_tdJSONCondition` (Expression) dentro un nodo e vi applica la modalità di salvataggio. */
function applyNestedExpressionSaveMode(node: any): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(applyNestedExpressionSaveMode); return; }
  if (node._tdJSONCondition && typeof node._tdJSONCondition === 'object') {
    applyExpressionSaveMode(node._tdJSONCondition);
  }
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (value && typeof value === 'object') applyNestedExpressionSaveMode(value);
  }
}

/** Applica la modalità di salvataggio a una singola action (JSON Condition + eventuali filtri annidati). */
function applyConditionSaveModeToAction(action: any): void {
  if (!action || typeof action !== 'object') return;
  // Azione JSON Condition: condizioni in `groups` -> `when` (root azione)
  if (action._tdActionType === JSON_CONDITION_TYPE && Array.isArray(action.groups)) {
    action.when = serializeConditionToWhen(action.groups);
    if (SAVE_ONLY_WHEN) action.groups = [];
  }
  // Filtri (reply, ecc.): `_tdJSONCondition` annidato a qualsiasi profondità
  applyNestedExpressionSaveMode(action);
}

/**
 * Trasforma il payload di salvataggio (già clonato) applicando la modalità di salvataggio
 * delle condizioni a tutte le action di tutti gli intent. Non lancia MAI: in caso di errore
 * ritorna il payload invariato (un errore qui non deve rompere il salvataggio).
 * Da invocare nel chokepoint di invio al backend (opsUpdate).
 */
export function applyConditionSaveModeToPayload(payload: any): any {
  try {
    if (!payload || !Array.isArray(payload.operations)) return payload;
    payload.operations.forEach((op: any) => {
      const intent = op && op.intent;
      if (intent && Array.isArray(intent.actions)) {
        intent.actions.forEach((action: any) => applyConditionSaveModeToAction(action));
      }
    });
  } catch (_e) {
    // Sicurezza: non interrompere mai il salvataggio.
  }
  return payload;
}
