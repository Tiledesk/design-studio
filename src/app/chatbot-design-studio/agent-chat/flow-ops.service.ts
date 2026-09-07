import { Injectable } from '@angular/core';
import { IntentService } from '../services/intent.service';
import { ConnectorService } from '../services/connector.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { Intent } from 'src/app/models/intent-model';
import { Command, Wait, Message } from 'src/app/models/action-model';
import { FlowOp, FlowOpResult, FlowOpsReport, FlowPosition, FlowSnapshot } from './flow-ops.model';
import { TYPE_ACTION } from '../utils-actions';
import { RESERVED_INTENT_NAMES, UNTITLED_BLOCK_PREFIX, TYPE_COMMAND } from '../utils';

const KNOWN_OPS = [
  'add_intent', 'update_intent', 'delete_intent', 'move',
  'add_action', 'update_action', 'delete_action', 'connect'
];

/** The characters a block name may contain, copied from the studio's own
 *  rename validator in `panel-intent-header.component.ts`. Anything the UI
 *  refuses to type must also be refused here, or the agent becomes a way
 *  around the invariant rather than another user of it. */
const INTENT_NAME_REGEX = /^[ _0-9a-zA-Z]+$/;

/** The block card's own on-canvas width -- the only place this size is
 *  defined is `.panel-intent-content { width: 264px; }` in
 *  `cds-intent.component.scss`. There is no shared TS constant for it, so
 *  this names that CSS value rather than picking a fresh magic number. */
const CANVAS_BLOCK_WIDTH_PX = 264;

/** Clear air between two blocks placed left to right, on top of the block's
 *  own width, so a new block never sits edge to edge with the one before
 *  it. */
const CANVAS_BLOCK_GAP_PX = 60;

/** How far right of one block the next one lands when `add_intent` has to
 *  invent a position. */
const NEW_BLOCK_HORIZONTAL_STEP_PX = CANVAS_BLOCK_WIDTH_PX + CANVAS_BLOCK_GAP_PX;

const RESERVED_NAMES: string[] = Object.values(RESERVED_INTENT_NAMES);

/** Applies the agent's operations to the open flow.
 *
 *  Two rules shape everything here. Every operation is validated before any is
 *  applied, so a batch with one bad operation changes nothing rather than half
 *  the flow. And a refusal is returned, never thrown: a refused operation is
 *  something the agent can read and correct, while an exception just ends the
 *  turn with the user none the wiser. */
@Injectable({ providedIn: 'root' })
export class FlowOpsService {

  /** How many entries the last applied batch pushed onto the studio's undo
   *  stack. `restoreLastUNDO()` pops exactly one, so undoing a batch of N
   *  operations means popping N times -- otherwise a single Undo takes back
   *  one operation and leaves the other N-1 applied, with the offer withdrawn
   *  and no way back. */
  private lastBatchUndoDepth = 0;

  constructor(
    private intentService: IntentService,
    private connectorService: ConnectorService,
    private dashboardService: DashboardService
  ) {}

  public readFlow(): FlowSnapshot {
    return {
      id_faq_kb: this.dashboardService.id_faq_kb,
      intents: JSON.parse(JSON.stringify(this.intentService.listOfIntents || []))
    };
  }

  public async apply(ops: FlowOp[]): Promise<FlowOpsReport> {
    if (!Array.isArray(ops) || ops.length === 0) {
      return {
        ok: false,
        rejected_before_applying: true,
        results: [{ op: '(none)', ok: false, error: 'No operations were supplied.' }]
      };
    }

    const validation = ops.map(op => this.validate(op));
    if (validation.some(r => !r.ok)) {
      // Nothing was applied, so nothing from this batch is on the undo stack.
      // Leaving a previous batch's depth in place would make the next Undo
      // pop entries this batch never pushed.
      this.lastBatchUndoDepth = 0;
      return { ok: false, rejected_before_applying: true, results: validation };
    }

    // Measured rather than assumed: each of updateIntent / saveNewIntent /
    // deleteIntentNew pushes exactly one entry today, but the honest count of
    // "what this batch put on the stack" is the stack's own growth, which
    // stays right if an operation ever pushes none or two.
    const undoDepthBefore = this.undoStackDepth();
    const results: FlowOpResult[] = [];
    let ok = true;
    for (const op of ops) {
      try {
        const result = await this.applyOne(op);
        results.push(result);
        // An operation can refuse without throwing -- an action type the
        // studio cannot build, for one. Stop either way: continuing past a
        // failure would apply later operations that assumed it succeeded.
        if (!result.ok) { ok = false; break; }
      } catch (err) {
        ok = false;
        results.push({ op: op.op, ok: false, error: String(err?.message ?? err) });
        break;
      }
    }
    this.lastBatchUndoDepth = Math.max(this.undoStackDepth() - undoDepthBefore, 0);
    return { ok, rejected_before_applying: false, results };
  }

  private undoStackDepth(): number {
    const stack = this.intentService.arrayUNDO;
    return Array.isArray(stack) ? stack.length : 0;
  }

  /** Take back the whole of the last applied batch.
   *
   *  Not "the most recent change": the panel offers one Undo for a batch of N
   *  operations, and each of those pushed its own entry. Popping one would
   *  leave N-1 applied while the button disappears, so the user is told the
   *  flow was restored when most of it was not. */
  public undoLast(): void {
    for (let i = 0; i < this.lastBatchUndoDepth; i++) {
      this.intentService.restoreLastUNDO();
    }
    this.lastBatchUndoDepth = 0;
  }

  private validate(op: FlowOp): FlowOpResult {
    if (!op || typeof (op as any).op !== 'string' || KNOWN_OPS.indexOf(op.op) === -1) {
      return {
        op: String((op as any)?.op),
        ok: false,
        error: `Unknown operation "${(op as any)?.op}". Valid operations are: ${KNOWN_OPS.join(', ')}.`
      };
    }
    const needsIntent = (id: string): FlowOpResult | null =>
      this.intentService.getIntentFromId(id)
        ? null
        : { op: op.op, ok: false, error: `No intent with intent_id "${id}" is on the canvas.` };

    switch (op.op) {
      case 'add_intent': {
        const nameError = op.intent_display_name === undefined
          ? null
          : this.validateDisplayName(op, op.intent_display_name);
        return nameError ?? this.validateAddIntentActions(op) ?? { op: op.op, ok: true };
      }
      case 'update_intent':
      case 'delete_intent':
      case 'move':
      case 'add_action':
      case 'update_action':
      case 'delete_action':
        return needsIntent((op as any).intent_id) ?? this.validateShape(op);
      case 'connect':
        return needsIntent(op.from_intent_id)
            ?? needsIntent(op.to_intent_id)
            ?? this.validateConnectRouting(op)
            ?? { op: op.op, ok: true };
    }
  }

  /** Action types whose own fields already decide where the block they live
   *  on goes next, and the field(s) on each that hold the destination(s).
   *
   *  Sourced from two places, cross-checked against each other: each class's
   *  own fields in `action-model.ts`, and `connector.service.ts`'s
   *  `createListOfConnectorsByIntent2` -- the studio's own (and only) list of
   *  which field names it draws a real canvas connector from
   *  (`trueIntent`/`falseIntent`, `goToIntent`/`fallbackIntent`, ...). A field
   *  not in that list is not a destination the canvas renders, whatever it is
   *  named. Every entry here was also confirmed against its own
   *  `cds-action-*` component: each sets the field to `'#' + intent_id` from
   *  an `onConnectorChange`/`onChangeBlockSelect`-style handler, the same
   *  contract `connectViaDot` and `connectViaActionInList` already use.
   *
   *  `ai_condition` carries its branch destinations differently from every
   *  other entry here -- one static pair (`fallbackIntent`, `errorIntent`)
   *  plus a variable number of dynamic ones (`intents[].conditionIntentId`,
   *  one per AI-classified branch the block author added). The static pair is
   *  covered here like any other entry; the dynamic ones are checked
   *  separately in `findConfiguredConditionalRouter`, which is why this map's
   *  own value for it does not mention `conditionIntentId`.
   *
   *  Two field-name families that exist in `action-model.ts` under these same
   *  names are deliberately left out, because they do not carry this
   *  block-level meaning:
   *   - `ActionReplyV2.noInputIntent` / `.noMatchIntent`. These are fallback
   *     branches for a reply that carries quick-reply buttons -- gated on
   *     `attributes.commands` holding a message with
   *     `message.attributes.attachment.buttons.length > 0`, see
   *     `checkButtonsInCommands` in `cds-action-reply-settings.component.ts`
   *     -- not an exhaustive pair the way a condition's `trueIntent`/
   *     `falseIntent` is. A clicked button still routes through its own
   *     destination (or the block's own dot, when nothing else claims it);
   *     configuring `noInputIntent`/`noMatchIntent` alone does not exhaust the
   *     block's outbound routing, so it must not block `connect`.
   *   - The VXML voice actions' `trueIntent`/`falseIntent`/`noInputIntent`
   *     (`blind_transfer`, the DTMF actions, ...): `intent.service.ts`'s
   *     `createNewAction` builds these fields nested inside a `Command`'s
   *     `settings` (`command_form.settings = { trueIntent: null, ... }`),
   *     never as a field on the action object itself the way every entry
   *     below is. They also render through the separate voice component set
   *     this feature does not target -- the same reasoning
   *     `REPLY_LIKE_ACTION_TYPES` above already excludes voice actions by.
   *     Reading `action[field]` below never sees a nested `settings` value
   *     regardless, so no explicit exclusion is needed for these to be
   *     correctly ignored; they are named here for the record. */
  private static readonly CONDITIONAL_ROUTER_FIELDS: Record<string, string[]> = {
    [TYPE_ACTION.JSON_CONDITION]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.JSON_CONDITION2]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.CONDITION]: ['trueIntent'],
    [TYPE_ACTION.AI_CONDITION]: ['fallbackIntent', 'errorIntent'],
    [TYPE_ACTION.ONLINE_AGENTS]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.ONLINE_AGENTSV2]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.OPEN_HOURS]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.WEB_REQUESTV2]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.ASKGPT]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.ASKGPTV2]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.GPT_TASK]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.GPT_ASSISTANT]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.AI_PROMPT]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.SEND_WHATSAPP]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.QAPLA]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.MAKE]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.HUBSPOT]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.CUSTOMERIO]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.BREVO]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.N8N]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.DATA_TABLE]: ['trueIntent', 'falseIntent'],
    [TYPE_ACTION.CAPTURE_USER_REPLY]: ['goToIntent'],
    [TYPE_ACTION.ITERATION]: ['goToIntent', 'fallbackIntent'],
  };

  /** Every destination-carrying field this feature validates, wherever an
   *  action's `fields` are applied -- `add_action`, `update_action`, and
   *  `add_intent`'s inline `actions`. Built on top of
   *  `CONDITIONAL_ROUTER_FIELDS` rather than a second, hand-typed list, so
   *  the two features that both care about "which fields point at another
   *  block" read one definition.
   *
   *  The one addition `CONDITIONAL_ROUTER_FIELDS` itself doesn't carry:
   *  `ActionReplyV2`'s `noInputIntent` / `noMatchIntent`. That map
   *  deliberately leaves `REPLYV2` out -- see its own doc comment -- because
   *  those two fields, even both configured, don't decide the block's
   *  outbound routing exhaustively enough to refuse `connect` over (a
   *  clicked button still routes through its own destination, or the dot).
   *  That reasoning is about whether `connect` should be blocked; it says
   *  nothing about whether the field itself is a destination that must
   *  resolve to a real block -- it still is one, so destination validation
   *  covers it even though the connect guard doesn't.
   *
   *  `ai_condition`'s dynamic `intents[].conditionIntentId` is not listed
   *  here for the same reason it is not in `CONDITIONAL_ROUTER_FIELDS`: it
   *  lives at a variable index in an array, not a fixed field name. It is
   *  validated separately in `validateActionDestinations`. */
  private static readonly DESTINATION_FIELDS: Record<string, string[]> = {
    ...FlowOpsService.CONDITIONAL_ROUTER_FIELDS,
    [TYPE_ACTION.REPLYV2]: ['noInputIntent', 'noMatchIntent'],
  };

  /** Whether `value` is a destination `validateActionDestinations` accepts:
   *  unset or empty (a routing field with no branch chosen yet -- a normal
   *  intermediate state, never a refusal), or a reference this batch can
   *  actually resolve on the canvas right now -- a `'#'`-prefixed
   *  `intent_id`, or a bare one, the same two forms `connect`'s own
   *  endpoints accept. Anything else -- an invented slug, a display name, a
   *  block that plain doesn't exist -- does not resolve and is refused. */
  private isAcceptableDestination(value: any): boolean {
    if (value === undefined || value === null || value === '') { return true; }
    if (typeof value !== 'string') { return false; }
    const id = value.startsWith('#') ? value.slice(1) : value;
    return !!this.intentService.getIntentFromId(id);
  }

  /** The refusal for one bad destination field -- named so the agent can
   *  read exactly what to fix, and, critically, so it learns the fix a
   *  batch can't apply by itself: a block `add_intent` creates in the same
   *  batch has no `intent_id` yet, so nothing in that same batch can
   *  legitimately route to it. That has to be a second call, once the
   *  first one's result hands back the real id -- this message says so, in
   *  the language the agent already responds to, rather than leaving it to
   *  guess why a perfectly-formed-looking flow was refused. Returns null
   *  when `value` is acceptable. */
  private validateDestinationField(actionType: string, field: string, value: any): string | null {
    if (this.isAcceptableDestination(value)) { return null; }
    return `"${actionType}" action's "${field}" points at "${value}", which is not an ` +
      `intent_id on the canvas. A destination must be an existing block's intent_id, with or ` +
      `without the leading '#' -- never an invented slug or a display name. If "${value}" was ` +
      `meant to reach a block this same batch's add_intent is creating, that block has no ` +
      `intent_id yet: add_intent returns the new intent_id in its result, so set this ` +
      `destination in a second call, once you have it.`;
  }

  /** Every destination field `fields` sets on an action of `actionType`,
   *  checked against `DESTINATION_FIELDS` -- plus, for `ai_condition`, every
   *  configured entry of the dynamic `intents[].conditionIntentId` array,
   *  which `DESTINATION_FIELDS` cannot list by fixed field name. Returns the
   *  first violation found, or null when every destination `fields` sets is
   *  either empty or resolves. Called wherever an action's `fields` are
   *  applied, before anything is written -- `add_action`, `update_action`,
   *  and `add_intent`'s inline `actions` all route through this. */
  private validateActionDestinations(actionType: string, fields?: Record<string, any>): string | null {
    if (!fields) { return null; }
    for (const field of FlowOpsService.DESTINATION_FIELDS[actionType] || []) {
      if (!(field in fields)) { continue; }
      const violation = this.validateDestinationField(actionType, field, fields[field]);
      if (violation) { return violation; }
    }
    if (actionType === TYPE_ACTION.AI_CONDITION && Array.isArray(fields.intents)) {
      for (let i = 0; i < fields.intents.length; i++) {
        const value = fields.intents[i]?.conditionIntentId;
        const violation = this.validateDestinationField(
          actionType, `intents[${i}].conditionIntentId`, value);
        if (violation) { return violation; }
      }
    }
    return null;
  }

  /** Whether `action` is an `ai_condition` action carrying at least one
   *  configured dynamic branch -- `intents[].conditionIntentId` for some
   *  AI-classified intent the author already pointed somewhere. Split out
   *  from `CONDITIONAL_ROUTER_FIELDS` because that map holds only fixed field
   *  names, and this destination lives at a variable index in an array
   *  instead. `connector.service.ts` draws a connector from exactly this
   *  shape -- `key === 'conditionIntentId' && obj.label` -- so this checks
   *  the same condition the canvas itself does. */
  private hasConfiguredAiConditionBranch(action: any): boolean {
    if (!action || action._tdActionType !== TYPE_ACTION.AI_CONDITION) { return false; }
    return Array.isArray(action.intents) && action.intents.some((i: any) => !!i?.conditionIntentId);
  }

  /** The first action in `actions` that already routes the block by itself --
   *  present, and carrying at least one non-empty destination among its entry
   *  in `CONDITIONAL_ROUTER_FIELDS` (or, for `ai_condition`, a configured
   *  dynamic branch). An action of a routing type with every destination
   *  still empty is not yet a router -- an unconfigured `askgpt` action, say,
   *  decides nothing, so it must not block `connect` from also setting the
   *  dot. Returns null when no action on the block is both a routing type and
   *  configured. */
  private findConfiguredConditionalRouter(
    actions: any[] | undefined
  ): { action: any; fields: string[] } | null {
    for (const action of actions || []) {
      if (!action) { continue; }
      const fields = FlowOpsService.CONDITIONAL_ROUTER_FIELDS[action._tdActionType];
      if (!fields) { continue; }
      const configured = fields.some(f => !!action[f]) || this.hasConfiguredAiConditionBranch(action);
      if (configured) { return { action, fields }; }
    }
    return null;
  }

  /** Refuses a `connect` whose source block already routes itself through one
   *  of its own actions -- a condition, or any other action type in
   *  `CONDITIONAL_ROUTER_FIELDS` -- with at least one destination already set.
   *  `connect` only ever adds an *unconditional* link (the dot, or the
   *  actions-list intent action); writing one onto a block whose routing is
   *  already fully decided by, say, a `jsoncondition2`'s `trueIntent` /
   *  `falseIntent` would give the block two contradictory outbound semantics
   *  -- the live defect this guards against. Refusing here, before anything
   *  is applied, is what lets the agent read the message and fix its own
   *  call rather than the studio silently drawing a third, spurious
   *  connector. Returns null when the source block is not currently routed
   *  this way, in which case `connect` proceeds exactly as before. */
  private validateConnectRouting(op: Extract<FlowOp, { op: 'connect' }>): FlowOpResult | null {
    const from = this.intentService.getIntentFromId(op.from_intent_id);
    const router = this.findConfiguredConditionalRouter(from.actions);
    if (!router) { return null; }
    const fieldList = router.fields.join(' / ');
    return {
      op: op.op, ok: false,
      error: `"${from.intent_display_name}" already routes conditionally, through its ` +
        `"${router.action._tdActionType}" action -- connect would give the block a second, ` +
        `contradictory destination. Set the branch destinations on that action's ${fieldList} ` +
        `field(s) instead of connecting the block itself.`
    };
  }

  /** The studio's own rules for a block's display name, applied to whatever
   *  the agent sends.
   *
   *  These are not cosmetic. `setDefaultIntentSelected` and `cds-header`'s
   *  Test-it-out both find the start block by `intent_display_name.trim() ===
   *  'start'`, so an agent tidying names could rename the start block and
   *  break flow selection outright. The UI enforces all of this in
   *  `panel-intent-header.component.ts`; the agent has to meet the same bar.
   *
   *  Returns null when the name is acceptable. */
  private validateDisplayName(
    op: FlowOp, name: string, ownIntentId?: string
  ): FlowOpResult | null {
    const fail = (error: string): FlowOpResult => ({ op: op.op, ok: false, error });
    if (typeof name !== 'string' || name.trim().length === 0) {
      return fail('intent_display_name cannot be empty.');
    }
    if (name === UNTITLED_BLOCK_PREFIX) {
      return fail(`"${UNTITLED_BLOCK_PREFIX}" is the studio's placeholder prefix, not a name.`);
    }
    if (!INTENT_NAME_REGEX.test(name)) {
      return fail(
        `"${name}" is not a valid block name: only letters, digits, spaces and ` +
        `underscores are allowed.`);
    }
    if (RESERVED_NAMES.indexOf(name.trim()) !== -1) {
      return fail(
        `"${name.trim()}" is a reserved block name. The studio creates those blocks ` +
        `itself and finds them by name, so nothing else may take one.`);
    }
    if (ownIntentId) {
      const current = this.intentService.getIntentFromId(ownIntentId);
      const currentName = (current?.intent_display_name ?? '').trim();
      if (RESERVED_NAMES.indexOf(currentName) !== -1) {
        return fail(
          `"${currentName}" is a reserved block and cannot be renamed: the studio ` +
          `finds it by name, and Test it out stops working without it.`);
      }
    }
    const clash = (this.intentService.listOfIntents || []).some((i: Intent) =>
      i.intent_display_name === name && i.intent_id !== ownIntentId);
    if (clash) {
      return fail(`Another block is already called "${name}". Block names must be unique.`);
    }
    return null;
  }

  /** `add_intent`'s optional `actions` get the same buildability check
   *  `add_action` gets -- and one more that `add_action` does not need.
   *  `add_action` fails safely at apply time: `createNewAction` returning
   *  `undefined` is caught before anything is pushed onto an already-real
   *  intent, so a bad type there costs nothing but the one operation.
   *  `add_intent` has no such luxury: creating the block and populating it
   *  are the same operation, so an unbuildable type discovered mid-`addIntent`
   *  would leave a block already saved with only the actions built before it.
   *  That is exactly the half-populated result this feature exists to
   *  prevent, so every action's type is proven buildable here, before
   *  `addIntent` creates anything. `createNewAction` only constructs a plain
   *  object -- no DOM, no network, no list mutation -- so calling it here to
   *  check and then discarding the result is safe. Returns null when every
   *  action (or no `actions` at all) is fine. */
  private validateAddIntentActions(op: Extract<FlowOp, { op: 'add_intent' }>): FlowOpResult | null {
    if (op.actions === undefined) { return null; }
    if (!Array.isArray(op.actions)) {
      return { op: op.op, ok: false, error: 'add_intent actions must be an array.' };
    }
    for (const action of op.actions) {
      if (!action || typeof action.type !== 'string' || !action.type) {
        return { op: op.op, ok: false, error: 'Every action in add_intent.actions needs a type.' };
      }
      const scaffold = this.intentService.createNewAction(action.type as any);
      if (!scaffold) {
        return {
          op: op.op, ok: false,
          error: `"${action.type}" is not an action type this design studio can create.`
        };
      }
      const violation = this.findScaffoldViolation(action.type, scaffold, action.fields);
      if (violation) {
        return { op: op.op, ok: false, error: violation };
      }
      const destinationViolation = this.validateActionDestinations(action.type, action.fields);
      if (destinationViolation) {
        return { op: op.op, ok: false, error: destinationViolation };
      }
    }
    return null;
  }

  /** Per-operation required fields, beyond the intent existing. */
  private validateShape(op: FlowOp): FlowOpResult {
    const fail = (error: string): FlowOpResult => ({ op: op.op, ok: false, error });
    switch (op.op) {
      case 'update_intent':
        return op.intent_display_name === undefined
          ? { op: op.op, ok: true }
          : (this.validateDisplayName(op, op.intent_display_name, op.intent_id)
              ?? { op: op.op, ok: true });
      case 'move':
        return (op.position && typeof op.position.x === 'number' && typeof op.position.y === 'number')
          ? { op: op.op, ok: true }
          : fail('move needs a position with numeric x and y.');
      case 'add_action': {
        if (typeof op.type !== 'string' || !op.type) {
          return fail('add_action needs a type.');
        }
        // Built and discarded here the same way validateAddIntentActions
        // already does it: createNewAction only constructs a plain object, so
        // calling it to check shape costs nothing. A type the studio cannot
        // build comes back undefined -- that failure is reported by addAction
        // itself at apply time, as it always has been, not here.
        const scaffold = this.intentService.createNewAction(op.type as any);
        const violation = scaffold
          ? this.findScaffoldViolation(op.type, scaffold, op.fields)
          : null;
        if (violation) { return fail(violation); }
        const destinationViolation = this.validateActionDestinations(op.type, op.fields);
        return destinationViolation ? fail(destinationViolation) : { op: op.op, ok: true };
      }
      case 'update_action': {
        const intent = this.intentService.getIntentFromId((op as any).intent_id);
        const action = (intent.actions || [])
          .find((a: any) => a._tdActionId === (op as any).action_id);
        if (!action) {
          return fail(`Intent "${(op as any).intent_id}" has no action with _tdActionId "${(op as any).action_id}".`);
        }
        // Compared against the action as it already exists, not a fresh
        // createNewAction() scaffold: the action may carry sub-keys a user
        // legitimately added since it was created (ActionAssignVariableV2's
        // operation can grow a `type` key once configured in the panel), and
        // those are not damage for update_action to flag.
        const violation = this.findScaffoldViolation(action._tdActionType, action, (op as any).fields);
        if (violation) { return fail(violation); }
        const destinationViolation =
          this.validateActionDestinations(action._tdActionType, (op as any).fields);
        return destinationViolation ? fail(destinationViolation) : { op: op.op, ok: true };
      }
      case 'delete_action': {
        const intent = this.intentService.getIntentFromId((op as any).intent_id);
        const found = (intent.actions || [])
          .some((a: any) => a._tdActionId === (op as any).action_id);
        return found
          ? { op: op.op, ok: true }
          : fail(`Intent "${(op as any).intent_id}" has no action with _tdActionId "${(op as any).action_id}".`);
      }
      default:
        return { op: op.op, ok: true };
    }
  }

  private async applyOne(op: FlowOp): Promise<FlowOpResult> {
    switch (op.op) {
      case 'add_intent': return this.addIntent(op);
      case 'update_intent': return this.updateIntent(op);
      case 'delete_intent': return this.deleteIntent(op);
      case 'move': return this.moveIntent(op);
      case 'add_action': return this.addAction(op);
      case 'update_action': return this.updateAction(op);
      case 'delete_action': return this.deleteAction(op);
      case 'connect': return this.connect(op);
      default:
        // Unreachable: `validate` already restricts `op.op` to KNOWN_OPS, and
        // every known op is handled above. Kept so TypeScript can see that
        // every code path returns.
        throw new Error(`Operation "${(op as any).op}" is recognised but not yet implemented.`);
    }
  }

  /** Where a new block lands when `add_intent` doesn't say where.
   *
   *  `op.position ?? { x: 0, y: 0 }` put every position-less block at the
   *  same point -- stacking them -- and the agent omits `position` often.
   *  This instead looks at every block already on the canvas and places the
   *  new one to the right of the rightmost one, on that block's own y: a
   *  left-to-right layout instead of a pile at the origin.
   *
   *  Reads `listOfIntents` fresh rather than caching the rightmost block for
   *  the whole batch: `addIntent` pushes the new intent onto `listOfIntents`
   *  (via `addNewIntentToListOfIntents`) before this method could be called
   *  again, so the next position-less `add_intent` in the same batch sees
   *  the block just placed and lands further right still, instead of
   *  landing on top of it. */
  private computeNewBlockPosition(): FlowPosition {
    const intents: Intent[] = this.intentService.listOfIntents || [];
    let rightmost: FlowPosition | null = null;
    for (const intent of intents) {
      const pos = intent?.attributes?.position;
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') { continue; }
      if (!rightmost || pos.x > rightmost.x) { rightmost = pos; }
    }
    return rightmost
      ? { x: rightmost.x + NEW_BLOCK_HORIZONTAL_STEP_PX, y: rightmost.y }
      : { x: 0, y: 0 };
  }

  private async addIntent(op: Extract<FlowOp, { op: 'add_intent' }>): Promise<FlowOpResult> {
    const position = op.position ?? this.computeNewBlockPosition();
    const intent: Intent = this.intentService.createNewIntent(
      this.dashboardService.id_faq_kb, null, position);
    // createNewIntent pushes the action it is handed; a null one leaves an
    // empty slot behind, so start from a clean list.
    intent.actions = [];
    if (op.intent_display_name) {
      intent.intent_display_name = op.intent_display_name;
    }
    // Built the same way addAction builds one -- createNewAction plus
    // assignFields -- and pushed onto the clean list above, in the order the
    // caller gave. validate() already proved every type here is buildable,
    // so this cannot leave the block half-populated; it either arrives here
    // fully specified or the whole batch was refused before addIntent ran.
    for (const actionSpec of op.actions ?? []) {
      const action = this.intentService.createNewAction(actionSpec.type as any);
      this.assignFields(action, actionSpec.fields);
      this.writeReplyText(action._tdActionType, action, actionSpec.fields);
      intent.actions.push(action);
    }
    this.intentService.addNewIntentToListOfIntents(intent);
    await this.intentService.saveNewIntent(intent, intent, null);
    this.registerDrag(intent.intent_id);
    const result: FlowOpResult = { op: op.op, ok: true, intent_id: intent.intent_id };
    // Only when actions were actually created inline -- see FlowOpResult's own
    // doc comment for why this is the direct path for wiring them up
    // afterwards, and why it stays absent rather than an empty array when
    // add_intent built no actions.
    if (intent.actions.length > 0) {
      result.action_ids = intent.actions.map((action: any) => action._tdActionId);
    }
    return result;
  }

  /** Register the studio's own drag handler on a newly created block, the way
   *  both of its own creation paths do it: `settingAndSaveNewIntent` in
   *  cds-canvas.component.ts and `pasteIntentOntoStage` in IntentService both
   *  call `setDragAndListnerEventToElement` right after adding the intent to
   *  the list. Without it the block sits on the canvas un-draggable until a
   *  full page reload runs `setDragAndListnerEventToElements`, which
   *  re-registers every block on the stage from scratch.
   *
   *  Deliberately not `setIntentSelected`: the studio's own paths select the
   *  new block because a person just created exactly one and expects it
   *  focused. An agent batch can create several in a row, and selecting each
   *  in turn would yank the canvas around and change what a mid-batch
   *  `get_canvas_selection` reports. Only the drag registration is needed
   *  here.
   *
   *  Not awaited: `setDragAndListnerEventToElement` polls the DOM for the new
   *  node for up to a second before giving up quietly. Awaiting it serially
   *  would add up to a second per created block to a multi-block batch's
   *  result, for a UI convenience the caller never sees. The studio's own
   *  `settingAndSaveNewIntent` does not await it either. The call cannot
   *  reject in practice -- the poll always resolves, even to "never
   *  appeared" -- but it is wrapped the same way `drawConnector` below wraps
   *  its own best-effort redraw, so a future change there cannot surface here
   *  as an unhandled promise rejection. */
  private registerDrag(intentId: string): void {
    try {
      Promise.resolve(this.intentService.setDragAndListnerEventToElement(intentId))
        .catch(() => {});
    } catch {
      // Registration is best-effort; the block is already created and saved.
    }
  }

  private async updateIntent(op: Extract<FlowOp, { op: 'update_intent' }>): Promise<FlowOpResult> {
    const intent = this.intentService.getIntentFromId(op.intent_id);
    if (op.intent_display_name !== undefined) {
      intent.intent_display_name = op.intent_display_name;
    }
    if (op.question !== undefined) {
      intent.question = op.question;
    }
    await this.intentService.updateIntent(intent);
    return { op: op.op, ok: true, intent_id: intent.intent_id };
  }

  private async deleteIntent(op: Extract<FlowOp, { op: 'delete_intent' }>): Promise<FlowOpResult> {
    const intent = this.intentService.getIntentFromId(op.intent_id);
    await this.intentService.deleteIntentNew(intent);
    return { op: op.op, ok: true, intent_id: op.intent_id };
  }

  private async moveIntent(op: Extract<FlowOp, { op: 'move' }>): Promise<FlowOpResult> {
    const intent = this.intentService.getIntentFromId(op.intent_id);
    intent.attributes = intent.attributes || ({} as any);
    intent.attributes.position = { x: op.position.x, y: op.position.y };
    await this.intentService.updateIntent(intent);
    return { op: op.op, ok: true, intent_id: op.intent_id };
  }

  /** Fields the agent may never set: they are the action's identity, and the
   *  studio owns them. Letting `fields` carry them would let a forged id
   *  collide with a real one, or make an action lie about its own type. */
  private static readonly PROTECTED_FIELDS = ['_tdActionId', '_tdActionType'];

  private assignFields(action: any, fields?: Record<string, any>): void {
    if (!fields) { return; }
    Object.keys(fields)
      .filter(key => FlowOpsService.PROTECTED_FIELDS.indexOf(key) === -1)
      .forEach(key => { action[key] = fields[key]; });
  }

  /** The three action types `createNewAction` scaffolds with the same
   *  reply-command shape: `ActionReply`, `ActionReplyV2` and
   *  `ActionRandomReply` are each built as a top-level `text?: string` that
   *  nothing reads, plus `attributes.commands = [Wait, Command(MESSAGE)]`
   *  whose `command.message.text` -- seeded to the placeholder "A chat
   *  message will be sent to the visitor" -- is what `cds-action-reply` /
   *  `-v2` actually render and save
   *  (`this.arrayResponses = this.action.attributes.commands`, and
   *  `cds-action-reply-text`'s `@Input() response: Message` bound to that
   *  command's `.message`). Voice actions (`TYPE_ACTION_VXML`) scaffold a
   *  similar-looking `commands` array, but they render through a separate
   *  set of components for a separate (voice) flow type this feature does
   *  not target, so they are deliberately left out of this list rather than
   *  matched structurally. */
  private static readonly REPLY_LIKE_ACTION_TYPES: string[] = [
    TYPE_ACTION.REPLY, TYPE_ACTION.REPLYV2, TYPE_ACTION.RANDOM_REPLY
  ];

  /** `assignFields` already writes `fields.text` onto the action's top-level
   *  `text` -- harmless, but for the three reply-like types above that is
   *  not where the studio reads it, so the agent's requested wording would
   *  never appear on the canvas. This writes the same `fields.text` into the
   *  scaffolded message command too, wherever it currently is in
   *  `attributes.commands` (found by shape, not a fixed index, so it keeps
   *  working if a caller's `fields.attributes` or index-affecting edit
   *  changed where the message command sits). A no-op for every other
   *  action type, and a no-op when `fields.text` was not supplied.
   *
   *  Self-sufficient, not merely opportunistic: a live run showed
   *  `attributes.commands` arriving empty (`findScaffoldViolation`'s array
   *  rule let a caller keep both of `attributes`'s keys while replacing
   *  `commands` with `[]`) -- with no message command to find, the text was
   *  silently dropped back onto the ignored top-level field. That specific
   *  hole is now refused at validation too (see `findScaffoldViolation`),
   *  but this method does not depend on that guard, or on `createNewAction`
   *  always scaffolding correctly, or on nothing further ever emptying the
   *  array again: when no message command exists, it builds one -- the same
   *  `Wait` + `Command(MESSAGE)` pair `createNewAction` itself builds -- so
   *  the text always ends up where the studio reads it, whatever state
   *  `commands` was actually found in. */
  private writeReplyText(actionType: string, action: any, fields?: Record<string, any>): void {
    if (!fields || typeof fields.text !== 'string') { return; }
    if (FlowOpsService.REPLY_LIKE_ACTION_TYPES.indexOf(actionType) === -1) { return; }
    if (!action.attributes || typeof action.attributes !== 'object') {
      action.attributes = { disableInputMessage: false, commands: [] };
    }
    if (!Array.isArray(action.attributes.commands)) {
      action.attributes.commands = [];
    }
    const commands = action.attributes.commands;
    const messageCommand = commands.find((c: any) => c && c.message);
    if (messageCommand) {
      if (!messageCommand.message) {
        messageCommand.message = new Message('text', fields.text);
      } else {
        messageCommand.message.text = fields.text;
      }
      return;
    }
    // No message command survived, whatever the reason: build the missing
    // pair from scratch, the same shape createNewAction scaffolds a fresh
    // reply with.
    const wait = new Wait();
    const command = new Command(TYPE_COMMAND.MESSAGE);
    command.message = new Message('text', fields.text);
    commands.push(wait, command);
  }

  /** `assignFields` overwrites wholesale: `action[key] = fields[key]`. For a
   *  scalar, or an object that is only ever a bag of scalar defaults, that is
   *  exactly the flexibility the agent needs -- `ActionWebRequestV2`'s
   *  `headersString` scaffolds four default header strings a person can
   *  freely delete or replace through the panel, and an agent doing the same
   *  through `fields.headersString` is not damaging anything. But
   *  `createNewAction` also scaffolds *structure* the renderer depends on --
   *  `ActionAssignVariableV2.operation`, for one, built as
   *  `{ operands: [...], operators: [] }` -- and
   *  cds-action-assign-variable-v2.component.html reads
   *  `action?.operation?.operands.length` straight through: the optional
   *  chain stops at `operation?.`, so a caller's `operation` that lacks
   *  `operands` renders as a hard `TypeError` forever, with the broken action
   *  already saved.
   *
   *  The distinction: a scaffolded object is protected only when it itself
   *  holds at least one container value (an array or a nested object) --
   *  `operation.operands` is an array, so `operation` is protected; so is
   *  `ActionReply.attributes`, whose `commands` is an array that
   *  cds-action-reply.component.ts dereferences the same hard way
   *  (`this.action.attributes.commands`, no `?.` at all). By contrast
   *  `headersString`'s values are all strings, `settings: { timeout: 20000 }`
   *  holds only a number, and `ActionHideMessage.attributes: { subtype: "info" }`
   *  -- an unrelated, differently-shaped field that happens to share the name
   *  -- holds only a string, so none of those are protected. This is derived
   *  from what the constructor actually built, not a hand-maintained list of
   *  which keys matter, so an action type added later is classified
   *  correctly without touching this method.
   *
   *  Checked one level deep against `scaffold`, which is either a freshly
   *  built action (`add_action`, `add_intent`'s inline actions) or the action
   *  as it already exists (`update_action` -- see that call site for why).
   *  For each of the scaffold's *protected* keys, if `fields` supplies that
   *  key: an array may be replaced by any array, but not an empty one if the
   *  scaffold's own array was non-empty (see the array clause below); an
   *  object must still carry every key the scaffold's object had, and is
   *  then walked one level further for the same array rule (see `nested`
   *  below). A scalar field, an unprotected (defaults-only) object, or a key
   *  the scaffold never had, is untouched by this check -- assignFields is
   *  free to do what it already does there. Returns the refusal message, or
   *  null when `fields` is safe to apply.
   *
   *  `pathPrefix` is bookkeeping only, for readable messages when this
   *  recurses one level into a protected object (`"attributes.commands"`
   *  rather than a bare `"commands"` that doesn't say where it lives) -- it
   *  is never passed by a call site, only by this method calling itself. */
  private findScaffoldViolation(
    actionType: string, scaffold: any, fields?: Record<string, any>, pathPrefix: string = ''
  ): string | null {
    if (!fields || !scaffold) { return null; }
    for (const key of Object.keys(scaffold)) {
      if (!(key in fields)) { continue; }
      const path = pathPrefix ? `${pathPrefix}.${key}` : key;
      const scaffolded = scaffold[key];
      if (scaffolded === null || typeof scaffolded !== 'object') { continue; }
      const supplied = fields[key];
      if (Array.isArray(scaffolded)) {
        if (!Array.isArray(supplied)) {
          return `"${actionType}" action's "${path}" is an array; fields.${path} must be an ` +
            `array too, not ${JSON.stringify(supplied)}.`;
        }
        // The live defect this array clause missed: a scaffolded array that
        // starts non-empty is structure the studio renders from (ActionReply's
        // attributes.commands, for one) -- replacing it with `[]` removes that
        // structure just as surely as dropping the key would, even though the
        // key itself is still present and still an array. A scaffolded array
        // that starts *empty* (ActionWebRequestV2.formData, for one) is a
        // default with nothing in it yet, so filling it in -- with anything,
        // including staying empty -- is the normal, unrestricted case.
        if (scaffolded.length > 0 && supplied.length === 0) {
          return `"${actionType}" action's "${path}" is a non-empty array by default; ` +
            `fields.${path} cannot replace it with an empty array -- that leaves the ` +
            `action with nothing to render.`;
        }
        continue;
      }
      // A plain object: protected only if it holds structure of its own --
      // otherwise its keys are defaults, not something fields must preserve.
      const holdsAContainer = Object.values(scaffolded)
        .some(v => v !== null && typeof v === 'object');
      if (!holdsAContainer) { continue; }
      if (supplied === null || typeof supplied !== 'object' || Array.isArray(supplied)) {
        return `"${actionType}" action's "${path}" is an object; fields.${path} must be an ` +
          `object too, not ${JSON.stringify(supplied)}.`;
      }
      const missing = Object.keys(scaffolded).filter(k => !(k in supplied));
      if (missing.length > 0) {
        return `"${actionType}" action's "${path}" needs ${Object.keys(scaffolded).join(', ')}; ` +
          `fields.${path} is missing ${missing.join(', ')}. assignFields replaces "${path}" ` +
          `wholesale rather than merging into it, so include every existing key alongside ` +
          `whatever you're changing.`;
      }
      // Every key survived, but a kept key's own array value may still have
      // been hollowed out -- exactly the reported defect: `attributes` kept
      // both `disableInputMessage` and `commands`, with `commands` emptied.
      // The missing-keys check above only ever looked at presence; recurse
      // the same rule one level in so a kept-but-emptied array isn't a
      // separate loophole from a dropped key.
      const nested = this.findScaffoldViolation(actionType, scaffolded, supplied, path);
      if (nested) { return nested; }
    }
    return null;
  }

  private async addAction(op: Extract<FlowOp, { op: 'add_action' }>): Promise<FlowOpResult> {
    const intent = this.intentService.getIntentFromId(op.intent_id);
    // createNewAction owns every action type the studio can build -- including
    // the nested scaffolding an agent would never guess, like the Wait command
    // an ActionReply is born with. An unbuildable type comes back undefined,
    // which is the same refusal the UI would give.
    const action = this.intentService.createNewAction(op.type as any);
    if (!action) {
      return {
        op: op.op, ok: false,
        error: `"${op.type}" is not an action type this design studio can create.`
      };
    }
    this.assignFields(action, op.fields);
    this.writeReplyText(action._tdActionType, action, op.fields);
    intent.actions = intent.actions || [];
    if (typeof op.index === 'number' && op.index >= 0 && op.index <= intent.actions.length) {
      intent.actions.splice(op.index, 0, action);
    } else {
      intent.actions.push(action);
    }
    await this.intentService.updateIntent(intent);
    return { op: op.op, ok: true, intent_id: op.intent_id, action_id: action._tdActionId };
  }

  private async updateAction(op: Extract<FlowOp, { op: 'update_action' }>): Promise<FlowOpResult> {
    const intent = this.intentService.getIntentFromId(op.intent_id);
    const action = intent.actions.find((a: any) => a._tdActionId === op.action_id);
    this.assignFields(action, op.fields);
    this.writeReplyText(action._tdActionType, action, op.fields);
    await this.intentService.updateIntent(intent);
    return { op: op.op, ok: true, intent_id: op.intent_id, action_id: op.action_id };
  }

  private async deleteAction(op: Extract<FlowOp, { op: 'delete_action' }>): Promise<FlowOpResult> {
    const intent = this.intentService.getIntentFromId(op.intent_id);
    intent.actions = intent.actions.filter((a: any) => a._tdActionId !== op.action_id);
    await this.intentService.updateIntent(intent);
    return { op: op.op, ok: true, intent_id: op.intent_id, action_id: op.action_id };
  }

  /** Link two blocks the way the studio's own canvas does -- which mechanism
   *  that is depends on the source block's current state, because the two
   *  are mutually exclusive.
   *
   *  A block's own connector dot (`attributes.nextBlockAction`, an action of
   *  type `TYPE_ACTION.INTENT`) is suppressed outright the moment `actions`
   *  contains an entry of that same type -- see `isActionIntent` in
   *  `cds-intent.component.ts`. Every `start` block ships with exactly that
   *  action already in its `actions`, so writing `nextBlockAction` on `start`
   *  (or any block in the same state) changes a field nothing reads: the
   *  live connector for such a block is the one embedded in `actions`,
   *  rendered and edited through `cds-action-intent.component.ts`, not the
   *  dot. So `connect` first looks for that embedded action and, if one is
   *  there, retargets it instead -- the same choice `cds-action-intent`'s own
   *  `onChangeSelect` makes for it. Only when `actions` carries none does
   *  this fall back to the dot, exactly as before.
   *
   *  If a block somehow carries more than one `TYPE_ACTION.INTENT` entry --
   *  not a shape the UI itself can produce, since `cds-intent.component.ts`
   *  only ever adds one -- the first one in `actions` order is retargeted.
   *  That keeps the choice deterministic and independent of anything about
   *  the operation itself (its target, when it runs), rather than picking
   *  "last" and having the result depend on append order a caller cannot see. */
  private async connect(op: Extract<FlowOp, { op: 'connect' }>): Promise<FlowOpResult> {
    const from = this.intentService.getIntentFromId(op.from_intent_id);
    const to = this.intentService.getIntentFromId(op.to_intent_id);

    const actionIntent: any = (from.actions || [])
      .find((a: any) => a._tdActionType === TYPE_ACTION.INTENT);
    if (actionIntent) {
      return this.connectViaActionInList(op, from, to, actionIntent);
    }
    return this.connectViaDot(op, from, to);
  }

  /** The dot path: `attributes.nextBlockAction`. Live only for a block whose
   *  `actions` carries no `TYPE_ACTION.INTENT` entry of its own -- see
   *  `connect`'s doc comment for why that split exists.
   *
   *  `attributes.nextBlockAction` IS the dot: this is
   *  `onChangeNextIntentSelect` in `cds-panel-intent-detail.component.ts`,
   *  done the same way it is done there -- ensure the action exists, point
   *  its `intentName` at the target, save, then draw the edge. A block has
   *  exactly one dot, so connecting an already-connected block retargets
   *  that one action rather than adding a second. */
  private async connectViaDot(
    op: Extract<FlowOp, { op: 'connect' }>, from: Intent, to: Intent
  ): Promise<FlowOpResult> {
    from.attributes = from.attributes || ({} as any);
    if (!from.attributes.nextBlockAction) {
      from.attributes.nextBlockAction = this.intentService.createNewAction(TYPE_ACTION.INTENT);
    }
    const nextBlockAction: any = from.attributes.nextBlockAction;
    // The studio's contract for `intentName` is '#' + intent_id, never the
    // display name. `ConnectorService` strips the '#' and looks the id up on
    // every connector refresh -- blanking `intentName` outright when it does
    // not resolve. A display name here therefore draws no connector and then
    // silently erases itself, having reported success.
    //
    // Unlike the actions-list path below, the dot is never labelled from
    // `_tdActionTitle` -- `onChangeNextIntentSelect` never sets it either,
    // so there is nothing equivalent to set here.
    nextBlockAction.intentName = '#' + to.intent_id;
    await this.intentService.updateIntent(from);
    this.drawConnector(from.intent_id, nextBlockAction._tdActionId, to.intent_id);
    return {
      op: op.op, ok: true,
      intent_id: op.from_intent_id, action_id: nextBlockAction._tdActionId
    };
  }

  /** The actions-list path: retargets an existing `TYPE_ACTION.INTENT` entry
   *  in `from.actions`. Live only for a block that already has one -- most
   *  commonly `start`, which ships with this action out of the box.
   *
   *  Mirrors `cds-action-intent.component.ts`'s own `onChangeSelect`: set
   *  `intentName`, set `_tdActionTitle` when the action does not already
   *  have one (that component's own guard -- `if (!this.action._tdActionTitle)`
   *  -- so an existing custom title survives a retarget), save, then draw
   *  the edge the same way `cds-panel-action-detail.component.ts`'s
   *  `onConnectorChange` does for this action type. */
  private async connectViaActionInList(
    op: Extract<FlowOp, { op: 'connect' }>, from: Intent, to: Intent, actionIntent: any
  ): Promise<FlowOpResult> {
    actionIntent.intentName = '#' + to.intent_id;
    if (!actionIntent._tdActionTitle) {
      actionIntent._tdActionTitle = to.intent_display_name;
    }
    await this.intentService.updateIntent(from);
    this.drawActionListConnector(from.intent_id, actionIntent._tdActionId, to.intent_id);
    return {
      op: op.op, ok: true,
      intent_id: op.from_intent_id, action_id: actionIntent._tdActionId
    };
  }

  /** Make the dot's new edge visible now, the way the UI does.
   *
   *  Operations apply immediately, and a correct `intentName` alone leaves the
   *  user looking at an unchanged canvas until something rebuilds connectors.
   *  `createConnectorFromId(fromId, toId, true)` is the exact call
   *  `onChangeNextIntentSelect` makes in `cds-panel-intent-detail.component.ts`
   *  once it has set the dot's `intentName`, and it is safe to make before
   *  Angular has rendered the new action: it polls the stage for both
   *  elements for up to a second and gives up quietly if either never appears
   *  -- which is also what happens when the canvas is not on screen at all.
   *  It additionally no-ops when a connector with this exact id is already
   *  on the stage, rather than drawing a duplicate.
   *
   *  Not awaited, and never allowed to fail the operation: the flow is already
   *  correct and saved by this point, and a repaint is not something the
   *  agent's tool result should wait on or be refused over. */
  private drawConnector(fromIntentId: string, actionId: string, toIntentId: string): void {
    try {
      const result: any = this.connectorService
        .createConnectorFromId(`${fromIntentId}/${actionId}`, toIntentId, true);
      Promise.resolve(result).catch(() => {});
    } catch {
      // Drawing is best-effort; the model is already right either way.
    }
  }

  /** Make the actions-list action's new edge visible now, the way the UI
   *  does for that mechanism specifically.
   *
   *  `cds-panel-action-detail.component.ts`'s `onConnectorChange('create', ...)`
   *  -- the handler `cds-action-intent`'s own `onConnectorChange` output
   *  feeds -- first clears any connector already drawn from this action
   *  (`deleteConnectorWithIDStartingWith`, itself a no-op when none is on the
   *  stage) and only then calls `createNewConnector`. Without that clear,
   *  retargeting this action would leave the old edge on screen alongside the
   *  new one: unlike the dot's `createConnectorFromId`, `createNewConnector`
   *  has no built-in "already exists" check of its own, and the connector's
   *  DOM id changes with the target (`fromId/toId`), so the old one is never
   *  found and overwritten -- it has to be deleted explicitly, the same as
   *  the UI does. Both calls are safe before Angular has rendered anything:
   *  `deleteConnectorWithIDStartingWith` no-ops when its element is not on
   *  the stage, and `createNewConnector` polls for up to a second and gives
   *  up quietly, exactly like `createConnectorFromId` above.
   *
   *  Not awaited, and never allowed to fail the operation, for the same
   *  reason as `drawConnector`. */
  private drawActionListConnector(fromIntentId: string, actionId: string, toIntentId: string): void {
    const fromId = `${fromIntentId}/${actionId}`;
    try {
      this.connectorService.deleteConnectorWithIDStartingWith(fromId, false, true);
    } catch {
      // Clearing the old edge is best-effort, same as drawing the new one.
    }
    try {
      const result: any = this.connectorService.createNewConnector(fromId, toIntentId);
      Promise.resolve(result).catch(() => {});
    } catch {
      // Drawing is best-effort; the model is already right either way.
    }
  }
}
