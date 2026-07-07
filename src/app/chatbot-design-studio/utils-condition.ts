import { TYPE_OPERATOR_V2, OPERATORS_LIST_V2 } from './utils';
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
  TYPE_OPERATOR_V2.equalAsNumbers,
  TYPE_OPERATOR_V2.notEqualAsNumbers,
  TYPE_OPERATOR_V2.greaterThan,
  TYPE_OPERATOR_V2.greaterThanOrEqual,
  TYPE_OPERATOR_V2.lessThan,
  TYPE_OPERATOR_V2.lessThanOrEqual,
  // Array length: il RHS è la lunghezza (numero, senza apici)
  TYPE_OPERATOR_V2.lengthEqualTo,
  TYPE_OPERATOR_V2.lengthNotEqualTo,
  TYPE_OPERATOR_V2.lengthGreaterThan,
  TYPE_OPERATOR_V2.lengthLessThan,
  TYPE_OPERATOR_V2.lengthGreaterThanOrEqual,
  TYPE_OPERATOR_V2.lengthLessThanOrEqual,
]);

/** Operatori unari (nessun RHS). Esportato per riuso lato UI (mostra/nascondi Value). */
export const UNARY_OPERATORS = new Set<string>([
  TYPE_OPERATOR_V2.isEmpty,
  TYPE_OPERATOR_V2.isNotEmpty,
  TYPE_OPERATOR_V2.isNull,
  TYPE_OPERATOR_V2.isUndefined,
  TYPE_OPERATOR_V2.exists,
  TYPE_OPERATOR_V2.doesNotExist,
  TYPE_OPERATOR_V2.isTrue,
  TYPE_OPERATOR_V2.isFalse,
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
  if (op === 'containsIgnoreCase') return TYPE_OPERATOR_V2.contains;
  if (op === 'startsWithIgnoreCase') return TYPE_OPERATOR_V2.startsWith;
  return op;
}

/**
 * Etichetta i18n dell'operatore, robusta ai formati legacy/sconosciuti (mai crash).
 * Normalizza prima gli operatori legacy (es. *IgnoreCase) e, se la chiave non è nel
 * catalogo, ritorna la chiave grezza (il translate pipe la mostra invariata).
 * Usata dai renderer al posto di `OPERATORS_LIST_V2[op].name` (che lancia su op sconosciuto).
 */
export function operatorLabelKey(operator: string): string {
  if (!operator) return '';
  const key = normalizeLegacyOperator(operator);
  return OPERATORS_LIST_V2[key]?.name || key;
}

/**
 * Rappresentazione del lato destro (operand2) robusta a formati vecchi/nuovi (mai crash):
 *  - null/undefined -> ''
 *  - stringa/numero (formato molto vecchio) -> String(o2)
 *  - { type:'var' } -> name ?? value
 *  - { type:'const' } o altro oggetto -> value ?? name
 */
export function operandRightDisplay(condition: any): string {
  const o2 = condition?.operand2;
  if (o2 === null || o2 === undefined) return '';
  if (typeof o2 !== 'object') return String(o2);
  if (o2.type === 'var') return o2.name ?? o2.value ?? '';
  return o2.value ?? o2.name ?? '';
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
    case TYPE_OPERATOR_V2.isEmpty:      return `isEmpty(${left})`;
    case TYPE_OPERATOR_V2.isNotEmpty:   return `!isEmpty(${left})`;
    case TYPE_OPERATOR_V2.isNull:       return `isNull(${left})`;
    case TYPE_OPERATOR_V2.isUndefined:  return `isUndefined(${left})`;
    case TYPE_OPERATOR_V2.exists:       return `!isUndefined(${left})`;
    case TYPE_OPERATOR_V2.doesNotExist: return `isUndefined(${left})`;
    case TYPE_OPERATOR_V2.isTrue:       return `${left} == true`;
    case TYPE_OPERATOR_V2.isFalse:      return `${left} == false`;
  }

  const right = renderOperand2(condition);
  // RHS numerico vuoto -> condizione incompleta, da saltare
  if (right === '' && !UNARY_OPERATORS.has(op)) return '';

  switch (op) {
    case TYPE_OPERATOR_V2.equalAsNumbers:
    case TYPE_OPERATOR_V2.equalAsStrings:        return `${left} == ${right}`;
    case TYPE_OPERATOR_V2.notEqualAsNumbers:
    case TYPE_OPERATOR_V2.notEqualAsStrings:     return `${left} != ${right}`;
    case TYPE_OPERATOR_V2.greaterThan:           return `${left} > ${right}`;
    case TYPE_OPERATOR_V2.greaterThanOrEqual:    return `${left} >= ${right}`;
    case TYPE_OPERATOR_V2.lessThan:              return `${left} < ${right}`;
    case TYPE_OPERATOR_V2.lessThanOrEqual:       return `${left} <= ${right}`;
    case TYPE_OPERATOR_V2.startsWith:            return `startsWith(${left}, ${right})`;
    case TYPE_OPERATOR_V2.notStartsWith:         return `!startsWith(${left}, ${right})`;
    case TYPE_OPERATOR_V2.contains:              return `contains(${left}, ${right})`;
    case TYPE_OPERATOR_V2.notContains:           return `!contains(${left}, ${right})`;
    case TYPE_OPERATOR_V2.endsWith:              return `endsWith(${left}, ${right})`;
    case TYPE_OPERATOR_V2.notEndsWith:           return `!endsWith(${left}, ${right})`;
    case TYPE_OPERATOR_V2.matches:               return `matches(${left}, ${right})`;
    case TYPE_OPERATOR_V2.notMatches:            return `!matches(${left}, ${right})`;
    // --- Date & Time (RHS stringa ISO quotata) ---
    case TYPE_OPERATOR_V2.equalAsDate:           return `dateEqual(${left}, ${right})`;
    case TYPE_OPERATOR_V2.notEqualAsDate:        return `!dateEqual(${left}, ${right})`;
    case TYPE_OPERATOR_V2.isAfter:               return `isAfter(${left}, ${right})`;
    case TYPE_OPERATOR_V2.isBefore:              return `isBefore(${left}, ${right})`;
    case TYPE_OPERATOR_V2.isAfterOrEqual:        return `isAfterOrEqual(${left}, ${right})`;
    case TYPE_OPERATOR_V2.isBeforeOrEqual:       return `isBeforeOrEqual(${left}, ${right})`;
    // --- Array ---
    case TYPE_OPERATOR_V2.arrayContains:         return `arrayContains(${left}, ${right})`;
    case TYPE_OPERATOR_V2.arrayNotContains:      return `!arrayContains(${left}, ${right})`;
    case TYPE_OPERATOR_V2.lengthEqualTo:         return `length(${left}) == ${right}`;
    case TYPE_OPERATOR_V2.lengthNotEqualTo:      return `length(${left}) != ${right}`;
    case TYPE_OPERATOR_V2.lengthGreaterThan:     return `length(${left}) > ${right}`;
    case TYPE_OPERATOR_V2.lengthLessThan:        return `length(${left}) < ${right}`;
    case TYPE_OPERATOR_V2.lengthGreaterThanOrEqual: return `length(${left}) >= ${right}`;
    case TYPE_OPERATOR_V2.lengthLessThanOrEqual: return `length(${left}) <= ${right}`;
    default:
      // Operatore non riconosciuto: la condizione verrebbe esclusa dal `when`.
      // Segnaliamo invece di scartarla silenziosamente (l'AST `groups` resta integro).
      console.warn('[JSON-Condition] operatore non riconosciuto, escluso dal when:', condition.operator);
      return '';
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

/** type-id dell'azione JSON Condition V2 (hardcoded per evitare import circolari da utils-actions). */
const JSON_CONDITION_TYPE = 'jsoncondition2';

/**
 * Filtro reply LEGACY = ha condizioni MA non è marcato `version: 2`.
 * Regola UI: i filtri legacy si aprono col vecchio editor (appdashboard-filter, congelato a master);
 * filtri vuoti o marcati V2 usano il nuovo editor (appdashboard-filter2).
 */
export function isLegacyFilter(expression: any): boolean {
  return !!(expression && Array.isArray(expression.conditions) && expression.conditions.length > 0)
    && expression.version !== 2;
}

/**
 * Genera `when` su un'Expression e, in modalità TEST, ne svuota `conditions`.
 * SOLO per i filtri V2 (`version === 2`): i filtri legacy devono passare nel
 * payload byte-identici (niente `when`, niente marker) per retrocompatibilità.
 */
function applyExpressionSaveMode(expr: any): void {
  if (!expr || typeof expr !== 'object' || !Array.isArray(expr.conditions)) return;
  if (expr.version !== 2) return; // filtro legacy: non toccare
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
