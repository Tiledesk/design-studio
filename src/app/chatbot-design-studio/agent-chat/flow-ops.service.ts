import { Injectable } from '@angular/core';
import { IntentService } from '../services/intent.service';
import { ConnectorService } from '../services/connector.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { Intent } from 'src/app/models/intent-model';
import { FlowOp, FlowOpResult, FlowOpsReport, FlowSnapshot } from './flow-ops.model';
import { TYPE_ACTION } from '../utils-actions';
import { RESERVED_INTENT_NAMES, UNTITLED_BLOCK_PREFIX } from '../utils';

const KNOWN_OPS = [
  'add_intent', 'update_intent', 'delete_intent', 'move',
  'add_action', 'update_action', 'delete_action', 'connect'
];

/** The characters a block name may contain, copied from the studio's own
 *  rename validator in `panel-intent-header.component.ts`. Anything the UI
 *  refuses to type must also be refused here, or the agent becomes a way
 *  around the invariant rather than another user of it. */
const INTENT_NAME_REGEX = /^[ _0-9a-zA-Z]+$/;

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
      case 'add_intent':
        return op.intent_display_name === undefined
          ? { op: op.op, ok: true }
          : (this.validateDisplayName(op, op.intent_display_name) ?? { op: op.op, ok: true });
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
      case 'add_action':
        return typeof op.type === 'string' && op.type
          ? { op: op.op, ok: true }
          : fail('add_action needs a type.');
      case 'update_action':
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

  private async addIntent(op: Extract<FlowOp, { op: 'add_intent' }>): Promise<FlowOpResult> {
    const position = op.position ?? { x: 0, y: 0 };
    const intent: Intent = this.intentService.createNewIntent(
      this.dashboardService.id_faq_kb, null, position);
    // createNewIntent pushes the action it is handed; a null one leaves an
    // empty slot behind, so start from a clean list.
    intent.actions = [];
    if (op.intent_display_name) {
      intent.intent_display_name = op.intent_display_name;
    }
    this.intentService.addNewIntentToListOfIntents(intent);
    await this.intentService.saveNewIntent(intent, intent, null);
    return { op: op.op, ok: true, intent_id: intent.intent_id };
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
    await this.intentService.updateIntent(intent);
    return { op: op.op, ok: true, intent_id: op.intent_id, action_id: op.action_id };
  }

  private async deleteAction(op: Extract<FlowOp, { op: 'delete_action' }>): Promise<FlowOpResult> {
    const intent = this.intentService.getIntentFromId(op.intent_id);
    intent.actions = intent.actions.filter((a: any) => a._tdActionId !== op.action_id);
    await this.intentService.updateIntent(intent);
    return { op: op.op, ok: true, intent_id: op.intent_id, action_id: op.action_id };
  }

  private async connect(op: Extract<FlowOp, { op: 'connect' }>): Promise<FlowOpResult> {
    const from = this.intentService.getIntentFromId(op.from_intent_id);
    const to = this.intentService.getIntentFromId(op.to_intent_id);
    // An edge is not its own object here: an action of type connect_block that
    // names another block by display name IS the edge, and the connector the
    // user sees is drawn from it.
    const action: any = this.intentService.createNewAction(TYPE_ACTION.CONNECT_BLOCK);
    // The studio's contract for `intentName` is '#' + intent_id, never the
    // display name. `IntentService.getListOfIntents()` offers exactly that as
    // the value the UI assigns, and `ConnectorService` strips the '#' and looks
    // the id up on every connector refresh -- blanking `intentName` outright
    // when it does not resolve. A display name here therefore draws no
    // connector and then silently erases itself, having reported success.
    action.intentName = '#' + to.intent_id;
    // An id is not readable, so the action would render unlabelled without
    // this. The UI sets the same pair together in
    // `cds-action-connect-block.component.ts`.
    action._tdActionTitle = to.intent_display_name;
    from.actions = from.actions || [];
    from.actions.push(action);
    await this.intentService.updateIntent(from);
    this.drawConnector(from.intent_id, action._tdActionId, to.intent_id);
    return {
      op: op.op, ok: true,
      intent_id: op.from_intent_id, action_id: action._tdActionId
    };
  }

  /** Make the new edge visible now, the way the UI does.
   *
   *  Operations apply immediately, and a correct `intentName` alone leaves the
   *  user looking at an unchanged canvas until something rebuilds connectors.
   *  `createNewConnector` is the same call the UI makes from
   *  `cds-panel-action-detail`'s `onConnectorChange`, and it is safe to make
   *  before Angular has rendered the new action: it polls the stage for both
   *  elements for up to a second and gives up quietly if either never appears
   *  -- which is also what happens when the canvas is not on screen at all.
   *
   *  Not awaited, and never allowed to fail the operation: the flow is already
   *  correct and saved by this point, and a repaint is not something the
   *  agent's tool result should wait on or be refused over. */
  private drawConnector(fromIntentId: string, actionId: string, toIntentId: string): void {
    try {
      const result: any = this.connectorService
        .createNewConnector(`${fromIntentId}/${actionId}`, toIntentId);
      Promise.resolve(result).catch(() => {});
    } catch {
      // Drawing is best-effort; the model is already right either way.
    }
  }
}
