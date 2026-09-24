import { computeFlowLayout, LayoutNode } from './flow-ops-layout';
import { FlowPosition } from './flow-ops.model';

const OPTIONS = { columnStep: 324, verticalGap: 40 };

function node(id: string, height = 100, position: FlowPosition | null = null): LayoutNode {
  return { id, height, position };
}

function edges(map: Record<string, string[]>): Map<string, string[]> {
  return new Map(Object.entries(map));
}

/** Where every block ends up: the moved ones from the result, the others where they were. */
function positions(nodes: LayoutNode[], changed: Map<string, FlowPosition>): Record<string, FlowPosition> {
  const out: Record<string, FlowPosition> = {};
  nodes.forEach(n => out[n.id] = changed.get(n.id) || n.position);
  return out;
}

function expectNoOverlap(nodes: LayoutNode[], at: Record<string, FlowPosition>) {
  for (const a of nodes) {
    for (const b of nodes) {
      if (a.id >= b.id || at[a.id].x !== at[b.id].x) { continue; }
      const [upper, lower] = at[a.id].y <= at[b.id].y ? [a, b] : [b, a];
      expect(at[lower.id].y).toBeGreaterThanOrEqual(at[upper.id].y + upper.height + 40,
        `${upper.id} and ${lower.id} overlap`);
    }
  }
}

describe('computeFlowLayout', () => {

  it('lays a chain out on one row, one column per step, anchored on start', () => {
    const nodes = [node('start', 100, { x: 50, y: 70 }), node('a'), node('b')];
    const at = positions(nodes, computeFlowLayout(nodes, edges({ start: ['a'], a: ['b'] }), ['start'], OPTIONS));
    expect(at['start']).toEqual({ x: 50, y: 70 });
    expect(at['a']).toEqual({ x: 374, y: 70 });
    expect(at['b']).toEqual({ x: 698, y: 70 });
  });

  it('keeps the first exit of a condition on its row and puts the second one below', () => {
    const nodes = [node('start', 100, { x: 0, y: 0 }), node('cond', 120), node('yes', 150), node('no', 90)];
    const at = positions(nodes, computeFlowLayout(nodes,
      edges({ start: ['cond'], cond: ['yes', 'no'] }), ['start'], OPTIONS));
    expect(at['yes']).toEqual({ x: 648, y: 0 });
    expect(at['no']).toEqual({ x: 648, y: 190 });
  });

  it('stacks a three-button menu without overlaps, whatever the heights', () => {
    const nodes = [node('start', 100, { x: 0, y: 0 }), node('menu', 300), node('b1', 260), node('b2', 80), node('b3', 400)];
    const at = positions(nodes, computeFlowLayout(nodes,
      edges({ start: ['menu'], menu: ['b1', 'b2', 'b3'] }), ['start'], OPTIONS));
    expect([at['b1'].x, at['b2'].x, at['b3'].x]).toEqual([648, 648, 648]);
    expect(at['b1'].y).toBe(0);
    expect(at['b2'].y).toBe(300);
    expect(at['b3'].y).toBe(420);
    expectNoOverlap(nodes, at);
  });

  it('puts the branches of a second exit below the whole first branch', () => {
    const nodes = [node('start', 100, { x: 0, y: 0 }), node('menu'), node('b1'), node('b1a', 500), node('b2'), node('b2a')];
    const at = positions(nodes, computeFlowLayout(nodes,
      edges({ start: ['menu'], menu: ['b1', 'b2'], b1: ['b1a'], b2: ['b2a'] }), ['start'], OPTIONS));
    expect(at['b2'].y).toBe(540);
    expect(at['b2a'].y).toBe(540);
    expectNoOverlap(nodes, at);
  });

  it('places a block two branches lead to after both of them', () => {
    const nodes = [node('start', 100, { x: 0, y: 0 }), node('cond'), node('long1'), node('long2'), node('short'), node('end')];
    const at = positions(nodes, computeFlowLayout(nodes, edges({
      start: ['cond'], cond: ['long1', 'short'], long1: ['long2'], long2: ['end'], short: ['end']
    }), ['start'], OPTIONS));
    expect(at['end'].x).toBe(4 * 324);
    expectNoOverlap(nodes, at);
  });

  it('ignores an edge back to an earlier block, so a cycle neither loops nor stretches the flow', () => {
    const nodes = [node('start', 100, { x: 0, y: 0 }), node('ask'), node('check')];
    const at = positions(nodes, computeFlowLayout(nodes,
      edges({ start: ['ask'], ask: ['check'], check: ['ask', 'start'] }), ['start'], OPTIONS));
    expect(at['ask'].x).toBe(324);
    expect(at['check'].x).toBe(648);
  });

  it('lays the default fallback out below the flow of start', () => {
    const nodes = [node('start', 100, { x: 0, y: 0 }), node('a', 200), node('defaultFallback', 100, { x: 900, y: -300 }), node('sorry')];
    const at = positions(nodes, computeFlowLayout(nodes,
      edges({ start: ['a'], defaultFallback: ['sorry'] }), ['start', 'defaultFallback'], OPTIONS));
    expect(at['defaultFallback']).toEqual({ x: 0, y: 240 });
    expect(at['sorry']).toEqual({ x: 324, y: 240 });
  });

  it('lays the blocks nothing reaches out at the bottom, each detached chain from its head', () => {
    const nodes = [node('start', 100, { x: 0, y: 0 }), node('a'), node('tail'), node('head')];
    const at = positions(nodes, computeFlowLayout(nodes,
      edges({ start: ['a'], head: ['tail'] }), ['start'], OPTIONS));
    expect(at['head']).toEqual({ x: 0, y: 140 });
    expect(at['tail']).toEqual({ x: 324, y: 140 });
  });

  it('returns nothing for a flow that is already laid out', () => {
    const first = computeFlowLayout(
      [node('start', 100, { x: 0, y: 0 }), node('a'), node('b')],
      edges({ start: ['a', 'b'] }), ['start'], OPTIONS);
    const nodes = [
      node('start', 100, { x: 0, y: 0 }),
      node('a', 100, first.get('a')),
      node('b', 100, first.get('b'))
    ];
    expect(computeFlowLayout(nodes, edges({ start: ['a', 'b'] }), ['start'], OPTIONS).size).toBe(0);
  });

  it('ignores destinations that are not blocks of the flow and edges to the block itself', () => {
    const nodes = [node('start', 100, { x: 0, y: 0 }), node('a')];
    const at = positions(nodes, computeFlowLayout(nodes,
      edges({ start: ['missing', 'a'], a: ['a'] }), ['start'], OPTIONS));
    expect(at['a']).toEqual({ x: 324, y: 0 });
  });

  it('works without a start block, anchoring on the origin', () => {
    const nodes = [node('a'), node('b')];
    const at = positions(nodes, computeFlowLayout(nodes, edges({ a: ['b'] }), ['start'], OPTIONS));
    expect(at['a']).toEqual({ x: 0, y: 0 });
    expect(at['b']).toEqual({ x: 324, y: 0 });
  });
});
