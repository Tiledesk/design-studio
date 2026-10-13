import { FlowPosition } from './flow-ops.model';

/** A block to lay out: its id and the height of its card on the canvas. */
export interface LayoutNode {
  id: string;
  height: number;
  position: FlowPosition | null;
}

export interface LayoutOptions {
  /** Distance between the left edges of two neighbouring columns. */
  columnStep: number;
  /** Clear air between two blocks stacked in the same column. */
  verticalGap: number;
}

/** Lays the whole flow out left to right, one column per step of the flow.
 *
 *  - The column of a block is its longest distance from a root over the forward
 *    edges; an edge back to a block that leads to it ("start again", a question that
 *    asks again) is ignored, so a cycle neither loops nor stretches the flow.
 *  - Rows follow the tree of first discoveries: the first exit of a block stays on its
 *    row, the next exits open a band below everything already placed to their right,
 *    so branches never cross each other and blocks never overlap in a column.
 *  - The flow of `roots[0]` keeps that root where it is; every other root (the default
 *    fallback), then the blocks nothing reaches, are laid out below it.
 *
 *  `edges` lists the exits of each block in the order the canvas draws them. Pure: no
 *  DOM, no services. Returns only the blocks whose position changes. */
export function computeFlowLayout(
  nodes: LayoutNode[],
  edges: Map<string, string[]>,
  roots: string[],
  options: LayoutOptions
): Map<string, FlowPosition> {
  const byId = new Map<string, LayoutNode>();
  nodes.forEach(node => byId.set(node.id, node));
  const targetsOf = (id: string): string[] =>
    (edges.get(id) || []).filter(target => target !== id && byId.has(target));

  // 1. Depth-first walk: tree children, back edges, finishing order.
  const state = new Map<string, 'open' | 'done'>();
  const treeChildren = new Map<string, string[]>();
  const backEdges = new Set<string>();
  const finished: string[] = [];
  const walkRoots: string[] = [];
  const walk = (rootId: string) => {
    walkRoots.push(rootId);
    const stack: Array<{ id: string, next: number }> = [{ id: rootId, next: 0 }];
    state.set(rootId, 'open');
    treeChildren.set(rootId, []);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const targets = targetsOf(frame.id);
      if (frame.next >= targets.length) {
        state.set(frame.id, 'done');
        finished.push(frame.id);
        stack.pop();
        continue;
      }
      const target = targets[frame.next++];
      const seen = state.get(target);
      if (seen === 'open') {
        backEdges.add(frame.id + '>' + target);
      } else if (!seen) {
        state.set(target, 'open');
        treeChildren.set(target, []);
        treeChildren.get(frame.id).push(target);
        stack.push({ id: target, next: 0 });
      }
    }
  };
  roots.filter(id => byId.has(id)).forEach(id => { if (!state.has(id)) { walk(id); } });
  // Blocks nothing reaches: start each group from a block no other unreached block
  // leads to, so a detached chain is walked from its head.
  while (state.size < nodes.length) {
    const pending = nodes.filter(node => !state.has(node.id));
    const reachedFromPending = new Set<string>();
    pending.forEach(node => targetsOf(node.id).forEach(target => reachedFromPending.add(target)));
    const head = pending.find(node => !reachedFromPending.has(node.id)) || pending[0];
    walk(head.id);
  }

  // 2. Columns: longest path over forward edges, in topological order.
  const level = new Map<string, number>();
  nodes.forEach(node => level.set(node.id, 0));
  for (const id of finished.slice().reverse()) {
    for (const target of targetsOf(id)) {
      if (backEdges.has(id + '>' + target)) { continue; }
      level.set(target, Math.max(level.get(target), level.get(id) + 1));
    }
  }

  // 3. Rows: tree order, with the lowest occupied point of every column.
  const anchor = byId.get(walkRoots[0])?.position || { x: 0, y: 0 };
  const bottom: number[] = [];
  const bottomFrom = (column: number): number => {
    let lowest = -Infinity;
    for (let i = column; i < bottom.length; i++) {
      if (bottom[i] !== undefined) { lowest = Math.max(lowest, bottom[i]); }
    }
    return lowest;
  };
  const y = new Map<string, number>();
  // Recursive: a flow is a few hundred blocks at most, far from any stack limit.
  const place = (id: string, desired: number) => {
    const column = level.get(id);
    const top = Math.max(desired, bottom[column] ?? -Infinity);
    y.set(id, top);
    bottom[column] = top + byId.get(id).height + options.verticalGap;
    (treeChildren.get(id) || []).forEach((child, i) => {
      // The first exit stays on this row; the next ones go below everything
      // already placed from their column rightwards, previous branches included.
      place(child, i === 0 ? top : Math.max(top, bottomFrom(level.get(child))));
    });
  };
  walkRoots.forEach((rootId, i) => place(rootId, i === 0 ? anchor.y : bottomFrom(0)));

  // 4. Only what moves.
  const changed = new Map<string, FlowPosition>();
  for (const node of nodes) {
    const target = {
      x: Math.round(anchor.x + level.get(node.id) * options.columnStep),
      y: Math.round(y.get(node.id))
    };
    if (!node.position || node.position.x !== target.x || node.position.y !== target.y) {
      changed.set(node.id, target);
    }
  }
  return changed;
}
