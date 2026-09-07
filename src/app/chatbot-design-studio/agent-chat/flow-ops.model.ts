/** What the agent may ask the canvas to do.
 *
 *  A small, explicit verb set rather than a JSON Patch: array indices are
 *  fragile against a canvas the user is also editing, and a diff of indices is
 *  not something a person can review. Every operation names what it acts on by
 *  `intent_id` -- the uuid, not the Mongo `id`. */
export type FlowOp =
  | { op: 'add_intent'; intent_display_name?: string; position?: FlowPosition }
  | { op: 'update_intent'; intent_id: string; intent_display_name?: string; question?: string }
  | { op: 'delete_intent'; intent_id: string }
  | { op: 'move'; intent_id: string; position: FlowPosition }
  | { op: 'add_action'; intent_id: string; type: string; fields?: Record<string, any>; index?: number }
  | { op: 'update_action'; intent_id: string; action_id: string; fields: Record<string, any> }
  | { op: 'delete_action'; intent_id: string; action_id: string }
  | { op: 'connect'; from_intent_id: string; to_intent_id: string };

export interface FlowPosition { x: number; y: number; }

export interface FlowOpResult {
  op: string;
  ok: boolean;
  /** Present when ok. The intent the operation created or acted on. */
  intent_id?: string;
  /** Present when an action was created. */
  action_id?: string;
  /** Present when not ok. States what was wrong, so the agent can correct it. */
  error?: string;
}

export interface FlowOpsReport {
  ok: boolean;
  /** True when validation refused the batch and nothing at all was applied. */
  rejected_before_applying: boolean;
  results: FlowOpResult[];
}

/** What `get_flow` returns. */
export interface FlowSnapshot {
  id_faq_kb: string;
  intents: any[];
}
