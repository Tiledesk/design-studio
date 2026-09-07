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
            ?? { op: op.op, ok: true };
    }
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
        return violation ? fail(violation) : { op: op.op, ok: true };
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
        return violation ? fail(violation) : { op: op.op, ok: true };
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
    return { op: op.op, ok: true, intent_id: intent.intent_id };
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

  /** Link two blocks the way the studio's own canvas does: through the source
   *  block's connector dot, not a visible row in its `actions` list.
   *
   *  `attributes.nextBlockAction` -- an action of type `TYPE_ACTION.INTENT`
   *  -- IS the dot: this is `onChangeNextIntentSelect` in
   *  `cds-panel-intent-detail.component.ts`, done the same way it is done
   *  there -- ensure the action exists, point its `intentName` at the
   *  target, save, then draw the edge. A block has exactly one dot, so
   *  connecting an already-connected block retargets that one action rather
   *  than adding a second.
   *
   *  This deliberately never touches `from.actions`. A block whose `actions`
   *  carries its own `TYPE_ACTION.INTENT` entry has its dot suppressed
   *  outright -- see `isActionIntent` in `cds-intent.component.ts` -- so the
   *  two mechanisms are mutually exclusive by design; producing both here
   *  would silently defeat the one this operation is meant to set. */
  private async connect(op: Extract<FlowOp, { op: 'connect' }>): Promise<FlowOpResult> {
    const from = this.intentService.getIntentFromId(op.from_intent_id);
    const to = this.intentService.getIntentFromId(op.to_intent_id);
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
    // Unlike the old connect_block action, the dot is never labelled from
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

  /** Make the new edge visible now, the way the UI does.
   *
   *  Operations apply immediately, and a correct `intentName` alone leaves the
   *  user looking at an unchanged canvas until something rebuilds connectors.
   *  `createConnectorFromId(fromId, toId, true)` is the exact call
   *  `onChangeNextIntentSelect` makes in `cds-panel-intent-detail.component.ts`
   *  once it has set the dot's `intentName`, and it is safe to make before
   *  Angular has rendered the new action: like `createNewConnector` before it,
   *  it polls the stage for both elements for up to a second and gives up
   *  quietly if either never appears -- which is also what happens when the
   *  canvas is not on screen at all. It additionally no-ops when a connector
   *  with this exact id is already on the stage, rather than drawing a
   *  duplicate.
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
}
