/** The structural rules of a Design Studio V3 agent, worded for the agent chat.
 *
 *  Reference document: docs/V3/v3-agent-rules.md. Every rule carries the code it
 *  has there (V3-S1, V3-U5, ...): change a rule in both places, and regenerate
 *  the runtime prompt from this file.
 *
 *  They apply ONLY to V3 agents (`attributes.dsVersion === 'v3'`); a legacy agent
 *  follows the legacy rules of the runtime prompt. `get_flow` returns them for V3
 *  agents, and `FlowOpsService.validateV3Batch` refuses any batch that breaks the
 *  ones that can be checked, with an error that names the rule. */
export const V3_FLOW_RULES: string[] = [
  'This agent is a V3 agent (ds_version "v3"). The rules below apply to it and OVERRIDE any ' +
  'contrary instruction you were given for legacy agents.',
  'V3-S1: every block holds exactly ONE action. To do several things, create one block per action ' +
  'and join them with `connect`.',
  'V3-D1: to ask the user something use TWO blocks: a block with one `reply` (buttons allowed), ' +
  'connected to a block with one `capture_user_reply`, which is then connected to the next step.',
  'V3-U5: `capture_user_reply` has no connector of its own: never set its `goToIntent`. The flow ' +
  'continues from the BLOCK connector, so `connect` the capture block to the next block.',
  'V3-S2: connect `start` to the first block of the flow.',
  'V3-S3: `defaultFallback` stays empty: never add actions to it. To handle a message the agent did ' +
  'not understand, `connect` `defaultFallback` to a block that holds the fallback message.',
  'V3-S4: `start` and `defaultFallback` are never deleted, renamed or used as a destination: nothing ' +
  'connects to them.',
  'V3-U2: a block whose action has its own exits (conditions, AI, knowledge base, web request, data ' +
  'table, iteration, ...) is routed through the destination fields of that action, never with `connect`.',
  'V3-U3: a block that ends the flow (`close`, `agent`, `move_to_unassigned`, `replacebot`, ' +
  '`replacebotv2`, `replacebotv3`, or `department` unless `triggerBot` is false) has no exit: never ' +
  '`connect` from it.',
  'V3-T3: a flow ends with its last useful block (a message the user can read, or a handoff) and ' +
  'WITHOUT a `close` block. Add a `close` block only when the user explicitly asks to end the ' +
  'conversation with a button (e.g. "Do you want to close the conversation?" -> "Yes, close"): the ' +
  'close block is the destination of that button only, and nothing comes after it.',
  'V3-P1: build the fewest blocks that do the job. V3-P2: prefer AI blocks (one `askgptv2` for many ' +
  'questions on documents, one `ai_condition` instead of a tree of conditions, `ai_prompt` to write ' +
  'or summarise). V3-P3: an open question followed by `ai_condition` beats a deep menu.'
];

/** Prefix of every refusal that comes from a V3 rule, so the agent can tell
 *  them apart from the checks every flow gets. */
export const V3_RULE_ERROR_PREFIX = 'V3 rule';

/** A refusal naming the rule it enforces, e.g. `V3 rule V3-S1: ...`. */
export function v3RuleError(code: string, message: string): string {
  return `${V3_RULE_ERROR_PREFIX} ${code}: ${message}`;
}
