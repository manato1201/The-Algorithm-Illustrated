import type {
  GraphDataset,
  GraphEdge,
  GraphEdgeState,
  GraphFrame,
  GraphNode,
  GraphNodeState,
} from "./graph-visualizers";

/**
 * グラフkindの可視化のうち、graph-visualizers.ts(巨大)の外に置いたもの。
 * graph-visualizers.ts が GRAPH_VISUALIZERS / GRAPH_DATASETS にまとめて登録する(型だけをimportして循環を避けている)。
 *  - コサラジュ法(強連結成分): 元のグラフのDFSで終了順を記録 → 辺を逆向きにたどるDFSで成分を塗りつぶす
 *  - ブロン・ケルボッシュ法(極大クリーク): R(作成中のクリーク)・P(候補)・X(処理済み)を持つ再帰
 */

function circleLayout(ids: string[]): GraphNode[] {
  const n = ids.length;
  return ids.map((id, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { id, label: id, x: 0.5 + 0.4 * Math.cos(angle), y: 0.5 + 0.42 * Math.sin(angle) };
  });
}

function snapshot(
  nodeStates: Record<string, GraphNodeState>,
  edgeStates: Record<string, GraphEdgeState>,
  description: string,
): GraphFrame {
  return { nodeStates: { ...nodeStates }, edgeStates: { ...edgeStates }, distances: {}, description };
}

// ===========================================================================
// コサラジュ法(強連結成分分解)
// ===========================================================================

export const KOSARAJU_NODES: GraphNode[] = circleLayout(["A", "B", "C", "D", "E", "F", "G"]);
/** 強連結成分は {A,B,C}・{D,E}・{F,G}。成分どうしは A..C → D,E → F,G の一方向(B→D、D→G、E→F)。 */
export const KOSARAJU_EDGES: GraphEdge[] = [
  { id: "AB", from: "A", to: "B", weight: 1 },
  { id: "BC", from: "B", to: "C", weight: 1 },
  { id: "CA", from: "C", to: "A", weight: 1 },
  { id: "BD", from: "B", to: "D", weight: 1 },
  { id: "DE", from: "D", to: "E", weight: 1 },
  { id: "ED", from: "E", to: "D", weight: 1 },
  { id: "EF", from: "E", to: "F", weight: 1 },
  { id: "FG", from: "F", to: "G", weight: 1 },
  { id: "GF", from: "G", to: "F", weight: 1 },
  { id: "DG", from: "D", to: "G", weight: 1 },
];

export function kosarajuSccSteps(): GraphFrame[] {
  const nodes = KOSARAJU_NODES;
  const edges = KOSARAJU_EDGES;
  const nodeStates: Record<string, GraphNodeState> = Object.fromEntries(nodes.map((n) => [n.id, "idle"]));
  const edgeStates: Record<string, GraphEdgeState> = Object.fromEntries(edges.map((e) => [e.id, "idle"]));
  const frames: GraphFrame[] = [
    snapshot(
      nodeStates,
      edgeStates,
      "コサラジュ法を開始。(1) 元のグラフを深さ優先探索して、頂点が「終わった順」を記録する (2) 辺を逆向きにしたグラフを、終わりが遅い頂点から順にたどって成分を塗りつぶす",
    ),
  ];

  // ---- 第1パス: 元のグラフでDFS、終了順を記録 ----
  const finished: string[] = [];
  const seen = new Set<string>();
  const dfs1 = (v: string) => {
    seen.add(v);
    nodeStates[v] = "visited";
    frames.push(snapshot(nodeStates, edgeStates, `[1回目] 頂点${v}の探索を始める`));
    for (const e of edges.filter((x) => x.from === v)) {
      if (seen.has(e.to)) {
        edgeStates[e.id] = "rejected";
        frames.push(snapshot(nodeStates, edgeStates, `[1回目] 辺${v}→${e.to}: ${e.to}は訪問済みなのでたどらない`));
      } else {
        edgeStates[e.id] = "tree";
        frames.push(snapshot(nodeStates, edgeStates, `[1回目] 辺${v}→${e.to}をたどる`));
        dfs1(e.to);
      }
    }
    nodeStates[v] = "settled";
    finished.push(v);
    frames.push(snapshot(nodeStates, edgeStates, `[1回目] 頂点${v}の探索が終わった(${finished.length}番目に終了)。終了順: ${finished.join(" → ")}`));
  };
  for (const n of nodes) if (!seen.has(n.id)) dfs1(n.id);

  // ---- 第2パス: 逆向きの辺をたどって成分を取り出す ----
  for (const n of nodes) nodeStates[n.id] = "idle";
  for (const e of edges) edgeStates[e.id] = "idle";
  const order = [...finished].reverse();
  frames.push(
    snapshot(
      nodeStates,
      edgeStates,
      `2回目の準備: 辺を逆向きにたどる。終了が遅い順(${order.join(" → ")})に、まだ成分が決まっていない頂点から探索を始める`,
    ),
  );
  const assigned = new Set<string>();
  const components: string[][] = [];
  for (const root of order) {
    if (assigned.has(root)) continue;
    const members: string[] = [];
    const dfs2 = (v: string) => {
      assigned.add(v);
      members.push(v);
      nodeStates[v] = "visited";
      frames.push(snapshot(nodeStates, edgeStates, `[2回目] 頂点${v}に到達(成分${components.length + 1}の一員)`));
      for (const e of edges.filter((x) => x.to === v)) {
        // 逆向きにたどる: v から見て、v に入ってくる辺 e.from→v を v→e.from として進む
        if (assigned.has(e.from)) {
          edgeStates[e.id] = "rejected";
          frames.push(
            snapshot(nodeStates, edgeStates, `[2回目] 逆向きに${v}→${e.from}(元の辺は${e.from}→${v}): ${e.from}は成分が決まっているのでたどらない`),
          );
        } else {
          edgeStates[e.id] = "tree";
          frames.push(snapshot(nodeStates, edgeStates, `[2回目] 逆向きに${v}→${e.from}をたどる`));
          dfs2(e.from);
        }
      }
    };
    dfs2(root);
    for (const m of members) nodeStates[m] = "settled";
    components.push(members);
    frames.push(
      snapshot(
        nodeStates,
        edgeStates,
        `頂点${root}から逆向きにたどれた {${[...members].sort().join(",")}} が1つの強連結成分(成分${components.length})。ほかの成分へ出ていく辺は逆向きにはたどれないので、成分の外へは漏れない`,
      ),
    );
  }
  frames.push(
    snapshot(
      nodeStates,
      edgeStates,
      `計算完了。強連結成分: ${components.map((c) => `{${[...c].sort().join(",")}}`).join(", ")}(見つかった順は、成分どうしの矢印の向き=上流から下流の順)`,
    ),
  );
  return frames;
}

// ===========================================================================
// ブロン・ケルボッシュ法(極大クリーク列挙、ピボット付き)
// ===========================================================================

export const CLIQUE_NODES: GraphNode[] = circleLayout(["A", "B", "C", "D", "E", "F"]);
/** 極大クリークは {A,B,C}・{B,C,D}・{D,E,F}。 */
export const CLIQUE_EDGES: GraphEdge[] = [
  { id: "AB", from: "A", to: "B", weight: 1 },
  { id: "AC", from: "A", to: "C", weight: 1 },
  { id: "BC", from: "B", to: "C", weight: 1 },
  { id: "BD", from: "B", to: "D", weight: 1 },
  { id: "CD", from: "C", to: "D", weight: 1 },
  { id: "DE", from: "D", to: "E", weight: 1 },
  { id: "DF", from: "D", to: "F", weight: 1 },
  { id: "EF", from: "E", to: "F", weight: 1 },
];

export function cliqueAdjacency(): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>(CLIQUE_NODES.map((n) => [n.id, new Set<string>()]));
  for (const e of CLIQUE_EDGES) {
    adj.get(e.from)!.add(e.to);
    adj.get(e.to)!.add(e.from);
  }
  return adj;
}

export function bronKerboschSteps(): GraphFrame[] {
  const adj = cliqueAdjacency();
  const nodeStates: Record<string, GraphNodeState> = Object.fromEntries(CLIQUE_NODES.map((n) => [n.id, "idle"]));
  const edgeStates: Record<string, GraphEdgeState> = Object.fromEntries(CLIQUE_EDGES.map((e) => [e.id, "idle"]));
  const found: string[][] = [];
  const foundNodes = new Set<string>();
  const foundEdges = new Set<string>();
  const fmt = (s: Iterable<string>) => `{${[...s].sort().join(",")}}`;

  const show = (r: Set<string>, description: string) => {
    for (const n of CLIQUE_NODES) nodeStates[n.id] = r.has(n.id) ? "visited" : foundNodes.has(n.id) ? "settled" : "idle";
    for (const e of CLIQUE_EDGES) edgeStates[e.id] = r.has(e.from) && r.has(e.to) ? "checking" : foundEdges.has(e.id) ? "tree" : "idle";
    frames.push(snapshot(nodeStates, edgeStates, description));
  };
  const frames: GraphFrame[] = [];
  show(new Set(), "ブロン・ケルボッシュ法(ピボット付き)を開始。R=作成中のクリーク、P=加えられる候補、X=処理済み(加えると重複する頂点)。PもXも空になったときのRが極大クリーク");

  const expand = (r: Set<string>, p: Set<string>, x: Set<string>) => {
    show(r, `R=${fmt(r)} P=${fmt(p)} X=${fmt(x)}`);
    if (p.size === 0 && x.size === 0) {
      found.push([...r].sort());
      for (const v of r) foundNodes.add(v);
      for (const e of CLIQUE_EDGES) if (r.has(e.from) && r.has(e.to)) foundEdges.add(e.id);
      show(r, `P も X も空 → ${fmt(r)} は極大クリーク(これ以上、頂点を足せない)`);
      return;
    }
    if (p.size === 0) {
      show(r, `P は空だが X に ${fmt(x)} が残っている → Rに加えられる頂点が過去に存在するので、極大ではない。戻る`);
      return;
    }
    // ピボット: P ∪ X のうち、P の中に隣接頂点が最も多い頂点
    const union = [...new Set([...p, ...x])].sort();
    let pivot = union[0];
    let best = -1;
    for (const u of union) {
      const c = [...p].filter((v) => adj.get(u)!.has(v)).length;
      if (c > best) {
        best = c;
        pivot = u;
      }
    }
    const targets = [...p].filter((v) => !adj.get(pivot)!.has(v)).sort();
    show(r, `ピボット ${pivot}(Pの中の隣接が${best}個で最多)。P のうち ${pivot} に隣接しない ${fmt(targets)} だけを試せば、隣接する頂点を含むクリークは取りこぼさない`);
    for (const v of targets) {
      expand(new Set([...r, v]), new Set([...p].filter((w) => adj.get(v)!.has(w))), new Set([...x].filter((w) => adj.get(v)!.has(w))));
      p.delete(v);
      x.add(v);
      show(r, `頂点${v}を含むクリークは調べ終えた → P から外して X に移す(P=${fmt(p)} X=${fmt(x)})`);
    }
  };
  expand(new Set(), new Set(CLIQUE_NODES.map((n) => n.id)), new Set());

  show(new Set(), `計算完了。極大クリーク: ${found.map((c) => fmt(c)).join(", ")}`);
  for (const n of CLIQUE_NODES) nodeStates[n.id] = foundNodes.has(n.id) ? "settled" : "idle";
  frames[frames.length - 1] = snapshot(nodeStates, edgeStates, frames[frames.length - 1].description);
  return frames;
}

export const GRAPH_EXTRA_VISUALIZERS: Record<string, () => GraphFrame[]> = {
  "kosaraju-scc": kosarajuSccSteps,
  "bron-kerbosch": bronKerboschSteps,
};

export const GRAPH_EXTRA_DATASETS: Record<string, GraphDataset> = {
  "kosaraju-scc": { nodes: KOSARAJU_NODES, edges: KOSARAJU_EDGES, directed: true },
  "bron-kerbosch": { nodes: CLIQUE_NODES, edges: CLIQUE_EDGES, directed: false },
};
