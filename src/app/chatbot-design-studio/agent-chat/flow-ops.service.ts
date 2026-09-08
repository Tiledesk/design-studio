import { Injectable } from '@angular/core';
import { IntentService } from '../services/intent.service';
import { ConnectorService } from '../services/connector.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { Intent } from 'src/app/models/intent-model';
import { Command, Wait, Message } from 'src/app/models/action-model';
import { FlowOp, FlowOpResult, FlowOpsReport, FlowPosition, FlowSnapshot } from './flow-ops.model';
import { TYPE_ACTION } from '../utils-actions';
import { RESERVED_INTENT_NAMES, UNTITLED_BLOCK_PREFIX, TYPE_COMMAND, TYPE_BUTTON, generateShortUID } from '../utils';

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

/** Clear air between two blocks stacked one above the other in a branch
 *  column. Smaller than the horizontal gap because the cards are far taller
 *  than they are wide: the same 60px that reads as a comfortable gutter
 *  between two columns reads as a chasm between two stacked cards. */
const CANVAS_BLOCK_VERTICAL_GAP_PX = 40;

/** The height to assume for a block whose card cannot be measured -- it has
 *  not rendered yet, or there is no DOM at all (unit tests). Roughly a
 *  two-action block; the column still lays out, just on an estimate instead
 *  of the real card. */
const CANVAS_BLOCK_FALLBACK_HEIGHT_PX = 160;

/** The highest a branch column is allowed to start. Centring a tall column on
 *  a block near the top of the canvas would put its first arms at a negative
 *  y -- off the top of the canvas, where the studio's own blocks never go and
 *  the user has to hunt for them. A column that would overflow upwards starts
 *  here and grows downwards instead: no longer centred, but all of it
 *  reachable, which matters more. */
const CANVAS_MIN_Y = 0;

/** The id `cds-intent.component.html` puts on a block's card
 *  (`[id]="'intent-content-'+ intent?.intent_id"`) -- the only handle the
 *  canvas offers for measuring how tall a block actually turned out. */
const BLOCK_CARD_ELEMENT_ID_PREFIX = 'intent-content-';

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

  /** Where this service put each block it positioned itself, keyed by
   *  intent_id -- the blocks it is allowed to move again later.
   *
   *  Branch layout has to reposition blocks that were created before the
   *  branch existed: the agent builds the destinations first and wires them
   *  up afterwards (§1 of its prompt tells it to), so the fan-out is only
   *  knowable one call *after* the blocks were placed. Moving them is right;
   *  moving a block the *user* put somewhere is not. Comparing a block's
   *  current position against the one recorded here separates the two
   *  without needing a flag on the model: a block the user has dragged no
   *  longer sits where this service left it, and is left alone from then on.
   *  A block positioned by an explicit `position` (or `move`) never enters
   *  the register at all -- the caller said where it goes. */
  private autoPlacedPositions = new Map<string, FlowPosition>();

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
    // Blocks whose actions this batch actually wrote a destination field onto
    // -- collected as operations apply, redrawn once each after the batch is
    // done, rather than once per operation. A batch that touches the same
    // block from several update_action calls (the common shape of a
    // multi-action build) would otherwise redraw it several times over for a
    // repaint the user only ever sees once. Only an intent an operation
    // actually *applied* successfully is added here (see addAction /
    // updateAction / addIntent below), so a mid-batch throw -- the only way
    // this service ever partially applies a batch, since everything is
    // validated up front -- never leaves an unapplied block queued for
    // redraw: the loop below stops before reaching it.
    const blocksToRedraw = new Set<string>();
    let ok = true;
    for (const op of ops) {
      try {
        const result = await this.applyOne(op, blocksToRedraw);
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
    // Before the undo depth is taken, so a single Undo takes the layout back
    // with the operations that caused it -- moving the blocks is part of
    // applying the batch, not a separate thing done to the flow afterwards.
    for (const movedId of await this.relayoutBranches(blocksToRedraw)) {
      blocksToRedraw.add(movedId);
    }
    this.lastBatchUndoDepth = Math.max(this.undoStackDepth() - undoDepthBefore, 0);
    this.redrawBlocks(blocksToRedraw);
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

  /** Strips a leading `'#'` and surrounding whitespace from a destination
   *  string, the same shape `ConnectorService` strips before it looks a
   *  destination up (`action.trueIntent.replace("#", "")`, there without the
   *  trim). Trims first so a `'#'` wrapped in whitespace (`'  #  '`) is
   *  recognised as the prefix before the prefix check runs, then trims again
   *  in case whitespace sat between the `'#'` and the rest. The single place
   *  both `isAcceptableDestination` and `normalizeStoredDestinations` ask
   *  "what, if anything, does this actually name" -- so a bare `'#'`, `'#'`
   *  padded with whitespace, and plain whitespace all reduce to the same
   *  empty string as `''` itself, rather than each caller re-deriving its
   *  own idea of "nothing here". */
  private normalizedDestinationId(value: string): string {
    const trimmed = value.trim();
    const stripped = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    return stripped.trim();
  }

  /** Whether `value` is a destination `validateActionDestinations` accepts:
   *  unset or empty (a routing field with no branch chosen yet -- a normal
   *  intermediate state, never a refusal) -- which now includes a `'#'` with
   *  nothing meaningful after it, the form the agent itself writes for "not
   *  set yet" since every real destination already wears the same `'#'`
   *  prefix -- or a reference this batch can actually resolve on the canvas
   *  right now -- a `'#'`-prefixed `intent_id`, or a bare one, the same two
   *  forms `connect`'s own endpoints accept. Anything else -- an invented
   *  slug, a display name, a block that plain doesn't exist -- does not
   *  resolve and is refused. */
  private isAcceptableDestination(value: any): boolean {
    if (value === undefined || value === null || value === '') { return true; }
    if (typeof value !== 'string') { return false; }
    const id = this.normalizedDestinationId(value);
    if (id === '') { return true; }
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
    // A reply's buttons route the flow as much as any named field does; their
    // destination just sits nested in `attributes` under a per-button
    // `action`, so it has to be walked rather than looked up by name. Only
    // 'action' buttons route -- a url or text button's `action` means
    // something else entirely -- which is the same test the flow engine's
    // `allReplyButtons` applies before it treats a button as a branch.
    if (FlowOpsService.REPLY_LIKE_ACTION_TYPES.indexOf(actionType) !== -1) {
      const buttons = this.replyButtonsOf({ _tdActionType: actionType, attributes: fields.attributes });
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].type !== TYPE_BUTTON.ACTION) { continue; }
        const violation = this.validateDestinationField(
          actionType, `buttons[${i}].action`, buttons[i].action);
        if (violation) { return violation; }
      }
    }
    return null;
  }

  /** Whether `fields` writes at least one field `DESTINATION_FIELDS` lists for
   *  `actionType` -- the trigger for redrawing the block's connectors after
   *  the write, not just for validating it. Deliberately does not care what
   *  the field's *value* is: `validateActionDestinations` already proved
   *  every value here either resolves or is acceptably empty before this
   *  runs, and a destination cleared back to empty still means the block's
   *  drawn connector for that field has to disappear, the same as a newly set
   *  one has to appear -- both are "this field was touched", not "this field
   *  now points somewhere". Reuses `DESTINATION_FIELDS` (and, for
   *  `ai_condition`, the same dynamic `intents[].conditionIntentId` shape
   *  `validateActionDestinations` walks) rather than a third list of "fields
   *  that matter here", so a field added to one is a field the other already
   *  knows about. Called from every path that writes an action's `fields` --
   *  `add_action`, `update_action`, and `add_intent`'s inline actions -- right
   *  after the write, to decide whether the owning block belongs in this
   *  batch's redraw set. */
  private actionTouchesConnectors(actionType: string, fields?: Record<string, any>): boolean {
    if (!fields) { return false; }
    const destinationFields = FlowOpsService.DESTINATION_FIELDS[actionType] || [];
    if (destinationFields.some(field => field in fields)) { return true; }
    if (actionType === TYPE_ACTION.AI_CONDITION && Array.isArray(fields.intents)) {
      return fields.intents.some((entry: any) => entry && 'conditionIntentId' in entry);
    }
    // A reply's buttons are destinations too -- they route the flow and draw
    // their own connectors, they just live nested in `attributes` instead of
    // in a named field, so DESTINATION_FIELDS cannot list them. Any write
    // that touches the buttons counts, set or cleared, for the same reason
    // the named fields do.
    if (FlowOpsService.REPLY_LIKE_ACTION_TYPES.indexOf(actionType) !== -1
        && 'attributes' in fields) {
      return true;
    }
    return false;
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

  private async applyOne(op: FlowOp, blocksToRedraw: Set<string>): Promise<FlowOpResult> {
    switch (op.op) {
      case 'add_intent': return this.addIntent(op, blocksToRedraw);
      case 'update_intent': return this.updateIntent(op);
      case 'delete_intent': return this.deleteIntent(op);
      case 'move': return this.moveIntent(op);
      case 'add_action': return this.addAction(op, blocksToRedraw);
      case 'update_action': return this.updateAction(op, blocksToRedraw);
      case 'delete_action': return this.deleteAction(op);
      case 'connect': return this.connect(op, blocksToRedraw);
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

  private async addIntent(
    op: Extract<FlowOp, { op: 'add_intent' }>, blocksToRedraw: Set<string>
  ): Promise<FlowOpResult> {
    const position = op.position ?? this.computeNewBlockPosition();
    const intent: Intent = this.intentService.createNewIntent(
      this.dashboardService.id_faq_kb, null, position);
    if (!op.position) {
      // Placed by the studio, so the studio may place it again once the
      // branch it belongs to exists. A caller-supplied position is a
      // decision, and is never revisited.
      this.autoPlacedPositions.set(intent.intent_id, { x: position.x, y: position.y });
    }
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
      this.normalizeReplyCommands(action._tdActionType, action);
      this.normalizeReplyButtons(intent.intent_id, action);
      this.normalizeStoredDestinations(action, actionSpec.fields);
      intent.actions.push(action);
      // A destination set inline can only reach a block that already exists
      // on the canvas -- validateDestinationField refuses anything else, and
      // an id this same batch's add_intent is still creating has no intent_id
      // yet to be reached by. So the only new connector an inline action can
      // draw here is outbound, from the block this add_intent is building --
      // never inbound, since nothing else in this batch can already point at
      // an id that did not exist before this call ran.
      if (this.actionTouchesConnectors(action._tdActionType, actionSpec.fields)) {
        blocksToRedraw.add(intent.intent_id);
      }
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
   *  appeared" -- but it is wrapped the same way `redrawBlockConnectors`
   *  below wraps its own best-effort redraw, so a future change there cannot
   *  surface here as an unhandled promise rejection. */
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
    // Someone asked for this block to be *here*. Branch layout must not
    // second-guess that later, so the block leaves the auto-placed register.
    this.autoPlacedPositions.delete(op.intent_id);
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

  /** Puts `attributes.commands` back into the order the studio itself builds:
   *  every message command preceded by its own wait, `[Wait, Message, Wait,
   *  Message, ...]` -- which is how `createNewAction` scaffolds a reply and
   *  how `cds-action-reply` saves one back.
   *
   *  A caller supplying `fields.attributes` replaces that array wholesale and
   *  may hand back the same commands in a different order. Nothing on the
   *  canvas minds -- but the flow the canvas persists is run by
   *  tiledesk-tybot-connector, whose `DirReplyV2.go` reads
   *  `attributes.commands[1].message.text` by fixed index. Running a
   *  generated flow found it: a `replyv2` whose commands arrived as
   *  `[Message, Wait]` threw `Cannot read properties of undefined (reading
   *  'text')` there, killing the turn -- the block simply never answered.
   *  (That line only feeds a debug variable, so it is a bug upstream too; but
   *  the flow is ours to hand over correct, and the studio never produces
   *  that order itself.)
   *
   *  Nothing is dropped: waits already present are reused in order, a missing
   *  one is created, and any surplus wait keeps its data at the end of the
   *  array. An already-canonical array comes back element for element. */
  private normalizeReplyCommands(actionType: string, action: any): void {
    if (FlowOpsService.REPLY_LIKE_ACTION_TYPES.indexOf(actionType) === -1) { return; }
    const commands = action?.attributes?.commands;
    if (!Array.isArray(commands)) { return; }
    if (!commands.some((c: any) => c && c.message)) { return; }
    const waits = commands.filter((c: any) => c && c.type === TYPE_COMMAND.WAIT);
    const ordered: any[] = [];
    let nextWait = 0;
    for (const command of commands) {
      if (!command || command.type === TYPE_COMMAND.WAIT) { continue; }
      if (command.message) {
        ordered.push(waits[nextWait++] ?? new Wait());
        // A command that carries a `message` *is* a message command --
        // `Command(TYPE_COMMAND.MESSAGE)` is the only thing the studio ever
        // puts one on. Stamping the tag rather than trusting the caller to
        // remember it: the canvas finds the message by shape and renders such
        // a command perfectly either way, but the flow engine's
        // `allReplyButtons` walks `command.type === 'message'` and skips
        // anything else -- so a missing tag costs the block its buttons. A
        // run found it: the approval block rendered both buttons, then never
        // locked to wait for the choice, and the click fell through to
        // defaultFallback.
        command.type = TYPE_COMMAND.MESSAGE;
      }
      ordered.push(command);
    }
    ordered.push(...waits.slice(nextWait));
    action.attributes.commands = ordered;
  }

  /** Gives every reply button the identity and connection bookkeeping the
   *  studio itself maintains -- `uid`, `__idConnector`, `__idConnection`,
   *  `__isConnected` -- so a button the agent wrote is indistinguishable from
   *  one the author created in the panel.
   *
   *  The agent supplies the semantics, which are the only part it can know:
   *  `type: 'action'`, `value` (the label, and what a typed reply is matched
   *  against), and `action: '#<intent_id>'`. Everything here is derived from
   *  ids that do not exist until `createNewAction` has minted `_tdActionId`
   *  -- and, for `add_intent`, until `createNewIntent` has minted
   *  `intent_id` -- so no caller could produce them even in principle.
   *  Recomputed rather than trusted, so a value copied from another block
   *  cannot leave a button claiming to belong to a different action.
   *
   *  The one field that has to be right is `uid`: `createConnectorsOfIntent`
   *  builds the connector id as `<intent_id>/<action_id>/<uid>` and mints a
   *  uid on the spot when one is missing -- unsaved, so the same button would
   *  get a different id on the next load. Minting it here instead means the
   *  uid is persisted with the action, the way the panel's own
   *  `IntentService.patchButtons` persists it. The `__`-prefixed three are
   *  view state the panel recomputes on render and the server does not store;
   *  they are set anyway so the in-memory intent this batch hands to
   *  `redrawBlockConnectors` is already consistent.
   *
   *  Buttons with no destination (`action` empty, or a url/text button) are
   *  left disconnected -- identified, but pointing nowhere, exactly like a
   *  button the author has just created and not yet wired up. */
  private normalizeReplyButtons(intentId: string, action: any): void {
    if (FlowOpsService.REPLY_LIKE_ACTION_TYPES.indexOf(action?._tdActionType) === -1) { return; }
    for (const button of this.replyButtonsOf(action)) {
      if (typeof button.uid !== 'string' || !button.uid.trim()) {
        button.uid = generateShortUID();
      }
      button.__idConnector = `${intentId}/${action._tdActionId}/${button.uid}`;
      const target = this.buttonDestination(button);
      if (target) {
        button.__isConnected = true;
        button.__idConnection = `${button.__idConnector}/${target}`;
      } else {
        button.__isConnected = false;
        button.__idConnection = null;
      }
    }
  }

  /** Every button on a reply-like action, across all of its message commands
   *  -- the same walk `TiledeskChatbotUtil.allReplyButtons` does when the flow
   *  runs, minus its `type === 'action'` filter, because the bookkeeping is
   *  owed to url and text buttons too. */
  private replyButtonsOf(action: any): any[] {
    const commands = action?.attributes?.commands;
    if (!Array.isArray(commands)) { return []; }
    const buttons: any[] = [];
    for (const command of commands) {
      const found = command?.message?.attributes?.attachment?.buttons;
      if (Array.isArray(found)) {
        buttons.push(...found.filter((b: any) => b && typeof b === 'object'));
      }
    }
    return buttons;
  }

  /** The intent_id a button points at, or `''` when it points nowhere. Reads
   *  it the way `cds-panel-button-configuration` writes it: `'#<intent_id>'`,
   *  optionally followed by a JSON attributes blob. */
  private buttonDestination(button: any): string {
    if (typeof button.action !== 'string') { return ''; }
    const value = button.action.trim();
    if (value.indexOf('#') === -1) { return ''; }
    return value.split('#')[1].split('{')[0].trim();
  }

  /** Blanks any destination field `fields` just set on `action` to a plain
   *  `''` when it normalizes to empty -- a bare `'#'`, with or without
   *  surrounding whitespace, or plain whitespace. `isAcceptableDestination`
   *  already lets every one of those forms through as "unset"; without this,
   *  the raw value the agent sent (`'#'`, `'  #  '`, ...) would land on the
   *  action verbatim -- harmless to `ConnectorService`, which blanks it the
   *  same way on its own next refresh (see the doc comment on
   *  `DESTINATION_FIELDS` for that read path), but truthy in the meantime to
   *  this file's own `findConfiguredConditionalRouter` /
   *  `hasConfiguredAiConditionBranch`, both of which decide "already
   *  configured" by `!!action[field]` and would misread a stored `'#'` as a
   *  real branch. Storing `''` -- the same value every other unset
   *  destination already uses -- keeps that check honest and makes what is
   *  on disk agree with what `isAcceptableDestination` just accepted, rather
   *  than opening a second, inconsistent notion of "empty" alongside it.
   *
   *  Reuses `normalizedDestinationId`, the same resolution
   *  `isAcceptableDestination` validates against, rather than a second
   *  normalization path. Only touches fields `fields` actually supplied --
   *  an untouched destination already on the action (from a prior call) is
   *  left exactly as it was found. Mutates `action` in place; called once
   *  `assignFields` has already written `fields` onto it, from every path
   *  that writes an action's fields: `addAction`, `updateAction`,
   *  `add_intent`'s inline action loop. */
  private normalizeStoredDestinations(action: any, fields?: Record<string, any>): void {
    if (!action || !fields) { return; }
    const destinationFields = FlowOpsService.DESTINATION_FIELDS[action._tdActionType] || [];
    for (const field of destinationFields) {
      if (!(field in fields)) { continue; }
      if (typeof action[field] === 'string' && this.normalizedDestinationId(action[field]) === '') {
        action[field] = '';
      }
    }
    if (action._tdActionType === TYPE_ACTION.AI_CONDITION
        && Array.isArray(fields.intents) && Array.isArray(action.intents)) {
      for (let i = 0; i < action.intents.length; i++) {
        const entry = action.intents[i];
        if (entry && typeof entry.conditionIntentId === 'string'
            && this.normalizedDestinationId(entry.conditionIntentId) === '') {
          entry.conditionIntentId = '';
        }
      }
    }
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

  private async addAction(
    op: Extract<FlowOp, { op: 'add_action' }>, blocksToRedraw: Set<string>
  ): Promise<FlowOpResult> {
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
    this.normalizeReplyCommands(action._tdActionType, action);
    this.normalizeReplyButtons(op.intent_id, action);
    this.normalizeStoredDestinations(action, op.fields);
    intent.actions = intent.actions || [];
    if (typeof op.index === 'number' && op.index >= 0 && op.index <= intent.actions.length) {
      intent.actions.splice(op.index, 0, action);
    } else {
      intent.actions.push(action);
    }
    await this.intentService.updateIntent(intent);
    if (this.actionTouchesConnectors(action._tdActionType, op.fields)) {
      blocksToRedraw.add(op.intent_id);
    }
    return { op: op.op, ok: true, intent_id: op.intent_id, action_id: action._tdActionId };
  }

  private async updateAction(
    op: Extract<FlowOp, { op: 'update_action' }>, blocksToRedraw: Set<string>
  ): Promise<FlowOpResult> {
    const intent = this.intentService.getIntentFromId(op.intent_id);
    const action = intent.actions.find((a: any) => a._tdActionId === op.action_id);
    this.assignFields(action, op.fields);
    this.writeReplyText(action._tdActionType, action, op.fields);
    this.normalizeReplyCommands(action._tdActionType, action);
    this.normalizeReplyButtons(op.intent_id, action);
    this.normalizeStoredDestinations(action, op.fields);
    await this.intentService.updateIntent(intent);
    if (this.actionTouchesConnectors(action._tdActionType, op.fields)) {
      blocksToRedraw.add(op.intent_id);
    }
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
  private async connect(
    op: Extract<FlowOp, { op: 'connect' }>, blocksToRedraw: Set<string>
  ): Promise<FlowOpResult> {
    const from = this.intentService.getIntentFromId(op.from_intent_id);
    const to = this.intentService.getIntentFromId(op.to_intent_id);

    const actionIntent: any = (from.actions || [])
      .find((a: any) => a._tdActionType === TYPE_ACTION.INTENT);
    if (actionIntent) {
      return this.connectViaActionInList(op, from, to, actionIntent, blocksToRedraw);
    }
    return this.connectViaDot(op, from, to, blocksToRedraw);
  }

  /** The dot path: `attributes.nextBlockAction`. Live only for a block whose
   *  `actions` carries no `TYPE_ACTION.INTENT` entry of its own -- see
   *  `connect`'s doc comment for why that split exists.
   *
   *  `attributes.nextBlockAction` IS the dot: this is
   *  `onChangeNextIntentSelect` in `cds-panel-intent-detail.component.ts`,
   *  done the same way it is done there -- ensure the action exists, point
   *  its `intentName` at the target, save. A block has exactly one dot, so
   *  connecting an already-connected block retargets that one action rather
   *  than adding a second. */
  private async connectViaDot(
    op: Extract<FlowOp, { op: 'connect' }>, from: Intent, to: Intent, blocksToRedraw: Set<string>
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
    // Making the edge visible is `redrawBlockConnectors`'s job now, not a
    // create-only call of its own -- see that method's doc comment for why
    // retargeting an already-connected block needs the delete-then-rebuild
    // it does, not merely another create.
    blocksToRedraw.add(from.intent_id);
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
   *  -- so an existing custom title survives a retarget), save. */
  private async connectViaActionInList(
    op: Extract<FlowOp, { op: 'connect' }>, from: Intent, to: Intent, actionIntent: any,
    blocksToRedraw: Set<string>
  ): Promise<FlowOpResult> {
    actionIntent.intentName = '#' + to.intent_id;
    if (!actionIntent._tdActionTitle) {
      actionIntent._tdActionTitle = to.intent_display_name;
    }
    await this.intentService.updateIntent(from);
    // Same reasoning as connectViaDot above: redrawBlockConnectors covers
    // this mechanism too (createConnectorsOfIntent draws a TYPE_ACTION.INTENT
    // actions-list entry exactly the same way it draws the dot), and its
    // delete-then-rebuild is what actually clears the block's previous edge
    // on a retarget -- a create-only call here never did.
    blocksToRedraw.add(from.intent_id);
    return {
      op: op.op, ok: true,
      intent_id: op.from_intent_id, action_id: actionIntent._tdActionId
    };
  }

  /** Redraw every connector on `intentId`'s block from what its actions'
   *  fields say now -- the fix for the live defect this feature exists for:
   *  `update_action` (and `add_action`, and `add_intent`'s inline actions)
   *  write a routing field like `askgptv2.trueIntent` straight onto the
   *  model and persist it, but nothing about that write tells the canvas to
   *  paint the resulting edge. Without this, the destination is correct in
   *  the database and invisible on screen until a full reload rebuilds every
   *  connector from scratch -- exactly the report: two branches "not
   *  associated with any block" that were actually just never drawn.
   *
   *  `createConnectorsOfIntent(intent)`, not `updateConnectorsOfBlock` --
   *  reversed from this method's first version, which measured wrong. Both
   *  were tried against the real thing (an `askgptv2` given `trueIntent` /
   *  `falseIntent` through `update_action`) by counting the actual `path`
   *  elements a connector draws, not the block's own always-present endpoint
   *  dots: `updateConnectorsOfBlock` drew zero lines. It reads the DOM, not
   *  the model -- `elem.querySelectorAll('[connector]')`, then each found
   *  element's own `idConnection` *attribute* -- and that attribute is bound
   *  by Angular from the action's field, so it only carries the new
   *  destination once change detection has re-rendered the block from the
   *  mutated action. FlowOps calls this synchronously, right after mutating
   *  that same action in memory: nothing has re-rendered yet, so every
   *  anchor's `idConnection` is still whatever it was before this operation
   *  ran, and `updateConnectorsOfBlock` redraws exactly nothing new. Worse,
   *  when it does find a stale connector to clear first, it calls
   *  `deleteConnectorById`, which calls `ConnectorService.deleteConnector`
   *  with the arguments transposed against that method's own signature
   *  (`deleteConnector(intent, idConnection, save, notify)` vs. the two
   *  positional arguments `deleteConnectorById` actually passes) -- a
   *  pre-existing bug on `master`, unrelated to this feature, that throws
   *  `TypeError: idConnection.lastIndexOf is not a function` and aborts the
   *  loop before anything downstream of it runs. `createConnectorsOfIntent`
   *  has neither problem: it is the same builder `createConnectors` already
   *  calls once per intent on initial load, reading `intent.attributes.nextBlockAction`
   *  and walking `intent.actions` directly -- the model FlowOps just mutated,
   *  not a DOM attribute waiting on a render pass -- and it never calls the
   *  broken delete path at all.
   *
   *  Paired with `deleteConnectorsOutOfBlock(intentId, false, false)` first,
   *  the same pairing `IntentService.restoreIntent`'s undo/redo `put` path
   *  already uses around `updateConnectorsOfBlock`. `createConnectorsOfIntent`
   *  only ever adds: it has no delete step of its own, so redrawing a block
   *  whose destination was *retargeted* (an already-configured `trueIntent`
   *  pointed at a different block, not merely set from empty) would leave
   *  the old edge on screen alongside the new one -- correct in the model,
   *  wrong on the canvas, again, until a reload. `deleteConnectorsOutOfBlock`
   *  clears every connector already drawn *out of* this block first (it
   *  matches on `connectorId.startsWith(intentId)`, so an inbound connector
   *  from some other block is untouched); `createConnectorsOfIntent` then
   *  rebuilds all of them fresh from the current data, so nothing already
   *  correct is lost. This delete path is a different method entirely from
   *  the broken one above: `ConnectorService.deleteConnectorsOutOfBlock`
   *  forwards straight to `TiledeskConnectors.deleteConnectorsOutOfBlock`,
   *  which calls the connectors library's own three-argument
   *  `deleteConnector(connectorId, save, notify)` -- never the broken
   *  `ConnectorService.deleteConnector(intent, idConnection, save, notify)`
   *  wrapper `deleteConnectorById` misuses.
   *
   *  `createConnectorFromId` -- what `createConnectorsOfIntent` calls per
   *  edge, through the private `createConnector(intent, fromId, toId)` --
   *  opens with `document.getElementById(fromId + '/' + toId)` and, when
   *  that id is already on the stage, updates it in place and returns
   *  rather than adding a second line. Confirmed by reading the call chain,
   *  not assumed: `createConnectorsOfIntent` -> `createConnector` ->
   *  `createConnectorFromId` is a straight, unconditional call at each step,
   *  so this guard is always reached on the path this method uses. Calling
   *  this method twice in a row for the same, unchanged destination is
   *  therefore idempotent -- covered by a test below that calls it twice and
   *  asserts the DOM still holds exactly one `path`, not two.
   *
   *  Not awaited, and never allowed to fail the operation: both
   *  `deleteConnectorsOutOfBlock` and `createConnectorsOfIntent` are wrapped
   *  independently, so one failing never stops the other from being tried,
   *  and `createConnectorFromId` itself polls the DOM (`isElementOnTheStage`)
   *  for up to a second and resolves quietly either way, including when the
   *  canvas is not on screen at all -- a repaint failing must never turn a
   *  write that already succeeded and saved into a reported failure. Called
   *  once per affected block after a whole batch applies (see
   *  `blocksToRedraw` in `apply()`), not once per operation -- a batch of a
   *  dozen `update_action` calls across a few blocks would otherwise ask the
   *  DOM to redraw the same block a dozen times for a repaint the user only
   *  ever sees once.
   *
   *  This is also `connect`'s own redraw now, for both of its mechanisms
   *  (`connectViaDot`'s `attributes.nextBlockAction` and
   *  `connectViaActionInList`'s actions-list `TYPE_ACTION.INTENT` entry --
   *  `createConnectorsOfIntent` draws both straight from `intent`, see its
   *  own handling of each just above). `connect` used to call two
   *  create-only helpers of its own (`drawConnector`, `drawActionListConnector`,
   *  both since removed) that never cleared a block's previous edge first --
   *  fine for a block being connected for the first time, wrong for a
   *  retarget: `start`'s actions-list entry moved from the template's
   *  `welcome` to a new first block left the old `start -> welcome` line
   *  standing on screen, correct nowhere but the model, until the next
   *  reload. Folding `connect` into this same delete-then-rebuild closes
   *  that the same way a retargeted `update_action` destination already
   *  closes it. */
  private redrawBlockConnectors(intentId: string): void {
    const intent = this.intentService.getIntentFromId(intentId);
    if (!intent) { return; }
    try {
      this.connectorService.deleteConnectorsOutOfBlock(intentId, false, false);
    } catch {
      // Clearing stale edges first is best-effort, same as drawing new ones.
    }
    this.cleanupOrphanedHitboxes(intentId);
    try {
      const result: any = this.connectorService.createConnectorsOfIntent(intent);
      Promise.resolve(result).catch(() => {});
    } catch {
      // Drawing is best-effort; the model is already right either way.
    }
  }

  /** Works around a real, verified defect in the vendored connectors
   *  library (`src/assets/js/tiledesk-connectors.js`), a file this project
   *  does not own -- the same "workaround at our call site, not a patch to
   *  a file we don't own" the connect-retarget fix above already follows.
   *
   *  The retarget fix above still left a residual, measured live: a block
   *  with an old and a new outgoing edge counted `path` elements by id
   *  (deduplicated after stripping a trailing `_hitbox`) and still saw both,
   *  even though `deleteConnectorsOutOfBlock` genuinely runs and
   *  `document.getElementById` on the *old edge's own id* correctly returns
   *  null. Read against the library's own drawing code
   *  (`#drawConnector`, ~line 874) that is not a contradiction: every edge
   *  draws *two* `path` elements sharing a naming scheme -- the visible line
   *  at `id`, and an invisible, wider `id + "_hitbox"` sibling underneath it
   *  for easier clicking (`fill/stroke: transparent`, `pointer-events:
   *  stroke`). `deleteConnector` (~line 251), the method
   *  `deleteConnectorsOutOfBlock` calls per matching id, removes the main
   *  path plus its `label_`/`rect_` siblings -- but never looks up or
   *  removes `id + "_hitbox"`. So a deleted edge's invisible hit-area
   *  survives every delete, forever, orphaned: nothing points at it, it
   *  draws nothing a person can see, but it is still a real `<path>` element
   *  whose id -- once the `_hitbox` suffix is stripped, exactly the
   *  reduction the coordinator's own measurement used -- reads as "this
   *  connection still exists." That is the residual: not a stale *line*,
   *  but a stale, invisible *hit-area* an id-counting measurement cannot
   *  tell apart from a real one.
   *
   *  Confirmed directly, not inferred: a real-DOM test that counts distinct
   *  edges the same way (dedup by stripping `_hitbox`) failed against the
   *  code before this method existed -- `Expected 2 to be 1` for a block
   *  that should have had exactly one edge after a retarget, while a
   *  `document.getElementById` check on the deleted edge's own (non-hitbox)
   *  id already, correctly, returned null. See flow-ops.service.spec.ts's
   *  "rules out cause 2" / "rules out the plain form of cause 1" tests for
   *  the isolated proof, and the "connect actually draws" real-DOM suite's
   *  `countDistinctEdges` assertions for the end-to-end one.
   *
   *  The fix: after asking `deleteConnectorsOutOfBlock` to clear this
   *  block's edges, and *before* `createConnectorsOfIntent` redraws
   *  whatever the current data says, remove every `<id>_hitbox` element
   *  still claiming this block as its source. Safe to do unconditionally at
   *  this exact point, and only this point: nothing for this block has been
   *  (re)drawn yet, so every surviving `_hitbox` here is necessarily an
   *  orphan the library's own delete missed -- never one belonging to an
   *  edge this redraw is about to recreate, since that recreation hasn't
   *  run yet. `createConnectorsOfIntent`'s own `#drawConnector` will build a
   *  fresh, correctly-paired hitbox for every edge the current data still
   *  calls for, right after this runs. Not wrapped in the same try/catch as
   *  the delete call above: a `querySelectorAll` over a static id-prefix
   *  selector does not throw for an empty result, and this is optional
   *  hygiene layered on top of an already-best-effort delete, not a new
   *  point of failure worth its own guard. */
  private cleanupOrphanedHitboxes(intentId: string): void {
    try {
      document.querySelectorAll(`[id^="${intentId}/"][id$="_hitbox"]`)
        .forEach(el => el.remove());
    } catch {
      // Best-effort, same as everything else this redraw does.
    }
  }

  /** Redraw every block in `intentIds`, each independently best-effort: one
   *  block's redraw throwing (synchronously or via its settled promise) must
   *  not stop the others from being asked, the same "drawing never blocks or
   *  fails the operation" guarantee `redrawBlockConnectors` itself already
   *  gives for a single block. */
  private redrawBlocks(intentIds: Set<string>): void {
    intentIds.forEach(intentId => this.redrawBlockConnectors(intentId));
  }

  /** Lays a block's branches out as a vertical column instead of a row.
   *
   *  `computeNewBlockPosition` only knows how to go right, because when a
   *  block is created nothing points at it yet. That is fine for a chain and
   *  wrong for a fork: a menu with three buttons ends up as three blocks in a
   *  line, each one further right than the last, with three connectors
   *  reaching across the whole canvas to get there. What a fork wants is the
   *  destinations stacked in one column just right of the block that feeds
   *  them, centred on it -- and the chain out of each of them carrying on to
   *  the right from there, which is what the horizontal rule already does for
   *  every block placed afterwards.
   *
   *  Runs once per batch, over the blocks whose connectors this batch changed
   *  -- the same set `redrawBlocks` uses, which is exactly "blocks whose
   *  branching may have just changed". A block with fewer than two
   *  destinations is not a fork and is left alone.
   *
   *  Each destination keeps its own subtree: a moved block carries every
   *  auto-placed block downstream of it by the same delta, so an arm of the
   *  fork that is already three blocks long arrives intact rather than
   *  folding onto itself. The walk stops at any block the user has moved --
   *  that block, and everything behind it, stays where they put it.
   *
   *  Returns the ids it moved, so the caller can redraw their connectors:
   *  nothing about *which* connectors exist changed, but every path in and
   *  out of a moved block is now drawn to the wrong coordinates.
   *
   *  Heights are measured off the rendered cards, so the column spaces real
   *  blocks rather than assumed ones. The one card that can be measured stale
   *  is the source's own, when this same batch just added actions to it and
   *  the canvas has not repainted yet: the column is then centred a little
   *  high. Everything still lays out; only the centring is approximate. */
  private async relayoutBranches(sourceIds: Set<string>): Promise<Set<string>> {
    const moved = new Map<string, any>();
    for (const sourceId of sourceIds) {
      const source = this.intentService.getIntentFromId(sourceId);
      const sourcePosition = this.positionOf(source);
      if (!sourcePosition) { continue; }
      const children = this.outgoingTargets(source)
        .filter(id => id !== sourceId)
        .map(id => this.intentService.getIntentFromId(id))
        .filter(child => !!this.positionOf(child));
      if (children.length < 2) { continue; }
      // All or nothing. Arranging only the blocks this service happens to own
      // would drop them on top of the ones it does not, which is worse than
      // the row it was trying to improve on.
      if (!children.every(child => this.isAutoPlaced(child))) { continue; }

      const heights = children.map(child => this.blockHeightPx(child.intent_id));
      const columnHeight = heights.reduce((total, h) => total + h, 0)
        + CANVAS_BLOCK_VERTICAL_GAP_PX * (children.length - 1);
      const x = sourcePosition.x + NEW_BLOCK_HORIZONTAL_STEP_PX;
      // Centre the column on the middle of the source card, not on its top
      // edge, so the connectors leave the block symmetrically -- unless that
      // would push the top of the column off the canvas.
      let y = Math.max(
        sourcePosition.y + this.blockHeightPx(sourceId) / 2 - columnHeight / 2,
        CANVAS_MIN_Y);
      const siblings = new Set<string>(children.map(child => child.intent_id));
      siblings.add(sourceId);
      for (let i = 0; i < children.length; i++) {
        this.moveWithSubtree(children[i], x, Math.round(y), siblings, moved);
        y += heights[i] + CANVAS_BLOCK_VERTICAL_GAP_PX;
      }
    }
    for (const intent of moved.values()) {
      await this.intentService.updateIntent(intent);
    }
    return new Set<string>(moved.keys());
  }

  /** Moves `intent` to (`x`, `y`) and carries its auto-placed subtree along by
   *  the same delta. `excluded` names the blocks the subtree walk must not
   *  claim -- the fork's own source and its other arms, which have their own
   *  place in the column. */
  private moveWithSubtree(
    intent: any, x: number, y: number, excluded: Set<string>, moved: Map<string, any>
  ): void {
    const position = this.positionOf(intent);
    const dx = x - position.x;
    const dy = y - position.y;
    const subtree = (dx === 0 && dy === 0)
      ? [] : this.autoPlacedSubtreeOf(intent.intent_id, excluded);
    this.placeBlock(intent, x, y, moved);
    for (const descendant of subtree) {
      const p = this.positionOf(descendant);
      this.placeBlock(descendant, p.x + dx, p.y + dy, moved);
    }
  }

  /** Every auto-placed block reachable from `rootId`, breadth first. A block
   *  the user has moved is not returned *and* is not walked through: the
   *  layout stops at the first thing someone placed by hand rather than
   *  reaching past it to rearrange what is behind it. Already-seen ids are
   *  skipped, so a cycle terminates and a block two arms converge on is
   *  carried by the first arm only. */
  private autoPlacedSubtreeOf(rootId: string, excluded: Set<string>): any[] {
    const seen = new Set<string>(excluded);
    seen.add(rootId);
    const subtree: any[] = [];
    const queue: string[] = [rootId];
    while (queue.length > 0) {
      const current = this.intentService.getIntentFromId(queue.shift() as string);
      if (!current) { continue; }
      for (const targetId of this.outgoingTargets(current)) {
        if (seen.has(targetId)) { continue; }
        seen.add(targetId);
        const target = this.intentService.getIntentFromId(targetId);
        if (!target || !this.positionOf(target) || !this.isAutoPlaced(target)) { continue; }
        subtree.push(target);
        queue.push(targetId);
      }
    }
    return subtree;
  }

  /** Every block `intent` routes to, in the order the canvas draws those exits
   *  -- the block's own dot first, then each action's destinations in action
   *  order, so a column laid out in this order has connectors that do not
   *  cross. Reads exactly what `ConnectorService.createConnectorsOfIntent`
   *  reads, through the same field lists this service already validates
   *  against, so "has a connector" and "counts as a branch" cannot drift
   *  apart. Deduplicated: two exits onto the same block are one destination
   *  to place. */
  private outgoingTargets(intent: any): string[] {
    const targets: string[] = [];
    const push = (value: any) => {
      if (typeof value !== 'string') { return; }
      const id = this.normalizedDestinationId(value);
      if (id && targets.indexOf(id) === -1) { targets.push(id); }
    };
    push(intent?.attributes?.nextBlockAction?.intentName);
    for (const action of intent?.actions || []) {
      if (!action) { continue; }
      const type = action._tdActionType;
      if (type === TYPE_ACTION.INTENT || type === TYPE_ACTION.CONNECT_BLOCK) {
        push(action.intentName);
      }
      for (const field of FlowOpsService.DESTINATION_FIELDS[type] || []) {
        push(action[field]);
      }
      if (type === TYPE_ACTION.AI_CONDITION) {
        for (const branch of action.intents || []) { push(branch?.conditionIntentId); }
      }
      if (FlowOpsService.REPLY_LIKE_ACTION_TYPES.indexOf(type) !== -1) {
        for (const button of this.replyButtonsOf(action)) {
          if (button.type === TYPE_BUTTON.ACTION) { push(this.buttonDestination(button)); }
        }
      }
    }
    return targets;
  }

  /** `intent`'s position, or null when it has none this layout can reason
   *  about. */
  private positionOf(intent: any): FlowPosition | null {
    const position = intent?.attributes?.position;
    return position && typeof position.x === 'number' && typeof position.y === 'number'
      ? position : null;
  }

  /** Whether this service placed `intent` and it has not been moved since --
   *  see `autoPlacedPositions`. */
  private isAutoPlaced(intent: any): boolean {
    const assigned = this.autoPlacedPositions.get(intent?.intent_id);
    const position = this.positionOf(intent);
    return !!assigned && !!position && position.x === assigned.x && position.y === assigned.y;
  }

  private placeBlock(intent: any, x: number, y: number, moved: Map<string, any>): void {
    intent.attributes = intent.attributes || {};
    intent.attributes.position = { x, y };
    this.autoPlacedPositions.set(intent.intent_id, { x, y });
    moved.set(intent.intent_id, intent);
  }

  /** How tall a block's card actually is, measured off the canvas. Uses
   *  `offsetHeight` rather than `getBoundingClientRect`: the canvas scales its
   *  content, and positions are in unscaled canvas coordinates, which is what
   *  `offsetHeight` reports. Falls back to an estimate when there is nothing
   *  to measure -- the block has not rendered yet, or there is no DOM. */
  private blockHeightPx(intentId: string): number {
    if (typeof document === 'undefined') { return CANVAS_BLOCK_FALLBACK_HEIGHT_PX; }
    const card = document.getElementById(BLOCK_CARD_ELEMENT_ID_PREFIX + intentId);
    const height = card ? card.offsetHeight : 0;
    return height > 0 ? height : CANVAS_BLOCK_FALLBACK_HEIGHT_PX;
  }
}
