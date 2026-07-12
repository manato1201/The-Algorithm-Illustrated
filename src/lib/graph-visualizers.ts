export type GraphNodeState = "idle" | "visited" | "settled";
export type GraphEdgeState =
  "idle" | "checking" | "relaxed" | "rejected" | "tree";

export type GraphNode = {
  id: string;
  label: string;
  /** 0〜1に正規化した座標。描画側でcanvasサイズに合わせて拡大する。 */
  x: number;
  y: number;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  weight: number;
};

export type GraphFrame = {
  nodeStates: Record<string, GraphNodeState>;
  edgeStates: Record<string, GraphEdgeState>;
  /** 頂点ごとの現在の距離(ベルマン・フォード法のみ使用)。未対応のアルゴリズムでは空オブジェクト。 */
  distances: Record<string, number | null>;
  description: string;
};

const NODE_IDS = ["A", "B", "C", "D", "E", "F"];

function circleLayout(ids: string[]): GraphNode[] {
  const n = ids.length;
  return ids.map((id, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      id,
      label: id,
      x: 0.5 + 0.4 * Math.cos(angle),
      y: 0.5 + 0.42 * Math.sin(angle),
    };
  });
}

/**
 * 負の辺(D→E: -3)を1本含む有向グラフ。ダイクストラ法では正しく解けない例として使う。
 * content/algorithms/bellman-ford.md の説明文と対応させている。
 */
export const SHORTEST_PATH_NODES: GraphNode[] = circleLayout(NODE_IDS);
export const SHORTEST_PATH_START = "A";
export const SHORTEST_PATH_EDGES: GraphEdge[] = [
  { id: "AB", from: "A", to: "B", weight: 6 },
  { id: "AC", from: "A", to: "C", weight: 3 },
  { id: "CB", from: "C", to: "B", weight: 2 },
  { id: "BD", from: "B", to: "D", weight: 1 },
  { id: "CD", from: "C", to: "D", weight: 5 },
  { id: "DE", from: "D", to: "E", weight: -3 },
  { id: "CE", from: "C", to: "E", weight: 7 },
  { id: "EF", from: "E", to: "F", weight: 2 },
  { id: "DF", from: "D", to: "F", weight: 8 },
];

/** 最小全域木(プリム法・クラスカル法)用の無向グラフ。全辺が正の重みを持つ。 */
export const MST_NODES: GraphNode[] = circleLayout(NODE_IDS);
export const MST_EDGES: GraphEdge[] = [
  { id: "AB", from: "A", to: "B", weight: 4 },
  { id: "AC", from: "A", to: "C", weight: 3 },
  { id: "BC", from: "B", to: "C", weight: 2 },
  { id: "BD", from: "B", to: "D", weight: 5 },
  { id: "CD", from: "C", to: "D", weight: 6 },
  { id: "CE", from: "C", to: "E", weight: 7 },
  { id: "DE", from: "D", to: "E", weight: 1 },
  { id: "DF", from: "D", to: "F", weight: 8 },
  { id: "EF", from: "E", to: "F", weight: 3 },
];

function initNodeStates(
  nodes: GraphNode[],
  value: GraphNodeState,
): Record<string, GraphNodeState> {
  const states: Record<string, GraphNodeState> = {};
  nodes.forEach((n) => {
    states[n.id] = value;
  });
  return states;
}

function initEdgeStates(
  edges: GraphEdge[],
  value: GraphEdgeState,
): Record<string, GraphEdgeState> {
  const states: Record<string, GraphEdgeState> = {};
  edges.forEach((e) => {
    states[e.id] = value;
  });
  return states;
}

function initDistances(
  nodes: GraphNode[],
  start: string,
): Record<string, number | null> {
  const distances: Record<string, number | null> = {};
  nodes.forEach((n) => {
    distances[n.id] = n.id === start ? 0 : null;
  });
  return distances;
}

/**
 * ベルマン・フォード法のステップ列を生成する。
 * 全辺を頂点数-1回繰り返し緩和し、負の辺(D→E)があっても正しく最短距離が求まる様子を可視化する。
 */
export function bellmanFordSteps(): GraphFrame[] {
  const nodes = SHORTEST_PATH_NODES;
  const edges = SHORTEST_PATH_EDGES;
  const start = SHORTEST_PATH_START;
  const dist = initDistances(nodes, start);
  const nodeStates = initNodeStates(nodes, "idle");
  nodeStates[start] = "settled";
  const edgeStates = initEdgeStates(edges, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...dist },
      description: `初期状態(開始頂点${start}の距離を0、他を∞に設定)`,
    },
  ];

  const passCount = nodes.length - 1;
  for (let pass = 1; pass <= passCount; pass++) {
    let changedInPass = false;
    for (const edge of edges) {
      edgeStates[edge.id] = "checking";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...dist },
        description: `[パス${pass}/${passCount}] 辺${edge.from}→${edge.to}(重み${edge.weight})を緩和できるか検査`,
      });

      const fromDist = dist[edge.from];
      const candidate = fromDist === null ? null : fromDist + edge.weight;
      if (
        candidate !== null &&
        (dist[edge.to] === null || candidate < dist[edge.to]!)
      ) {
        dist[edge.to] = candidate;
        edgeStates[edge.id] = "relaxed";
        nodeStates[edge.to] = "visited";
        changedInPass = true;
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: { ...dist },
          description: `緩和成功: dist[${edge.to}] を ${candidate} に更新`,
        });
      } else {
        edgeStates[edge.id] = "idle";
      }
    }
    if (!changedInPass) {
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...dist },
        description: `[パス${pass}/${passCount}] 更新なし(既に収束)`,
      });
      break;
    }
  }

  nodes.forEach((n) => {
    nodeStates[n.id] = dist[n.id] !== null ? "settled" : "idle";
  });
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...dist },
    description:
      "計算完了(負の閉路は検出されませんでした。負の辺があっても正しい最短距離が求まった)",
  });

  return frames;
}

function otherEnd(edge: GraphEdge, nodeId: string): string {
  return edge.from === nodeId ? edge.to : edge.from;
}

/**
 * プリム法のステップ列を生成する。
 * 木に含まれる頂点集合を1つずつ広げ、木と外側を結ぶ最小コストの辺を毎回選ぶ。
 */
export function primSteps(): GraphFrame[] {
  const nodes = MST_NODES;
  const edges = MST_EDGES;
  const start = nodes[0].id;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const inTree = new Set<string>([start]);
  nodeStates[start] = "settled";

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `頂点${start}を初期頂点として木に追加`,
    },
  ];

  const adjacency = (nodeId: string) =>
    edges.filter((e) => e.from === nodeId || e.to === nodeId);

  while (inTree.size < nodes.length) {
    const candidates = [...inTree].flatMap((nodeId) =>
      adjacency(nodeId).filter((e) => !inTree.has(otherEnd(e, nodeId))),
    );

    const highlightEdges = { ...edgeStates };
    for (const e of candidates) highlightEdges[e.id] = "checking";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: highlightEdges,
      distances: {},
      description: `木と外側を結ぶ${candidates.length}本の辺のコストを比較`,
    });

    const best = candidates.reduce((min, e) =>
      e.weight < min.weight ? e : min,
    );
    edgeStates[best.id] = "tree";
    const fromInTree = inTree.has(best.from) ? best.from : best.to;
    const newNode = otherEnd(best, fromInTree);
    inTree.add(newNode);
    nodeStates[newNode] = "settled";

    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `最小コストの辺${best.from}-${best.to}(重み${best.weight})を採用し、頂点${newNode}を木に追加`,
    });
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: "最小全域木が完成",
  });

  return frames;
}

/**
 * クラスカル法のステップ列を生成する。
 * 辺をコストの小さい順に見ていき、Union-Findで閉路ができないか判定しながら採用する。
 */
export function kruskalSteps(): GraphFrame[] {
  const nodes = MST_NODES;
  const sortedEdges = [...MST_EDGES].sort((a, b) => a.weight - b.weight);
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(MST_EDGES, "idle");

  const parent = new Map<string, string>();
  nodes.forEach((n) => parent.set(n.id, n.id));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `辺をコストの小さい順にソート: ${sortedEdges.map((e) => `${e.from}-${e.to}(${e.weight})`).join(", ")}`,
    },
  ];

  let adopted = 0;
  for (const edge of sortedEdges) {
    edgeStates[edge.id] = "checking";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `辺${edge.from}-${edge.to}(重み${edge.weight})を検討`,
    });

    if (find(edge.from) !== find(edge.to)) {
      union(edge.from, edge.to);
      edgeStates[edge.id] = "tree";
      nodeStates[edge.from] = "settled";
      nodeStates[edge.to] = "settled";
      adopted++;
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `採用(閉路を作らない)。採用済み ${adopted}/${nodes.length - 1} 本`,
      });
    } else {
      edgeStates[edge.id] = "rejected";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description:
          "棄却(既に同じグループに属しており、採用すると閉路ができる)",
      });
    }

    if (adopted === nodes.length - 1) break;
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: "最小全域木が完成",
  });

  return frames;
}

/**
 * DFSベースのトポロジカルソートのステップ列を生成する。
 * bellman-ford.mdと同じ有向非巡回グラフ(DAG)を使い回す。
 * 各頂点の子を全て訪問し終えた時点で順序リストの先頭に追加する(帰りがけ順の逆順)。
 */
export function topologicalSortSteps(): GraphFrame[] {
  const nodes = SHORTEST_PATH_NODES;
  const edges = SHORTEST_PATH_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const visited = new Set<string>();
  const order: string[] = [];

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: "DFSベースのトポロジカルソートを開始",
    },
  ];

  const outgoing = (nodeId: string) => edges.filter((e) => e.from === nodeId);

  const visit = (nodeId: string) => {
    visited.add(nodeId);
    nodeStates[nodeId] = "visited";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `頂点${nodeId}を訪問`,
    });

    for (const edge of outgoing(nodeId)) {
      if (visited.has(edge.to)) continue;
      edgeStates[edge.id] = "tree";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `辺${edge.from}→${edge.to}をたどる`,
      });
      visit(edge.to);
    }

    order.unshift(nodeId);
    nodeStates[nodeId] = "settled";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `頂点${nodeId}の子を全て訪問し終えたので順序リストの先頭に追加(現在の順序: ${order.join(" → ")})`,
    });
  };

  for (const node of nodes) {
    if (!visited.has(node.id)) visit(node.id);
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `トポロジカルソート完了: ${order.join(" → ")}`,
  });

  return frames;
}

/**
 * ボルーフカ法のステップ列を生成する。
 * 全ての木(最初は各頂点1つずつ)が、他の木へ出る最小コストの辺を同時に選んで統合する、
 * というラウンド制の進め方がプリム法・クラスカル法との違い。
 */
export function boruvkaSteps(): GraphFrame[] {
  const nodes = MST_NODES;
  const edges = MST_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const parent = new Map<string, string>();
  nodes.forEach((n) => parent.set(n.id, n.id));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: "各頂点を1つの木として開始",
    },
  ];

  let numComponents = nodes.length;
  let round = 0;
  while (numComponents > 1) {
    round++;
    const cheapest = new Map<string, GraphEdge>();
    for (const edge of edges) {
      const compFrom = find(edge.from);
      const compTo = find(edge.to);
      if (compFrom === compTo) continue;
      const currentFrom = cheapest.get(compFrom);
      if (!currentFrom || edge.weight < currentFrom.weight) cheapest.set(compFrom, edge);
      const currentTo = cheapest.get(compTo);
      if (!currentTo || edge.weight < currentTo.weight) cheapest.set(compTo, edge);
    }

    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `[ラウンド${round}] 各木ごとに他の木へ出る最小コストの辺を探す`,
    });

    let merged = false;
    for (const edge of cheapest.values()) {
      if (find(edge.from) === find(edge.to)) continue;
      union(edge.from, edge.to);
      edgeStates[edge.id] = "tree";
      nodeStates[edge.from] = "settled";
      nodeStates[edge.to] = "settled";
      numComponents--;
      merged = true;
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `辺${edge.from}-${edge.to}(重み${edge.weight})を採用して2つの木を統合`,
      });
    }
    if (!merged) break;
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: "最小全域木が完成",
  });

  return frames;
}

export type GraphDataset = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
};

export const UNION_FIND_NODES: GraphNode[] = circleLayout(["0", "1", "2", "3", "4", "5", "6", "7"]);
/** 8要素を1つの集合に統合する7回のunion操作(全て実際に集合を統合する、no-opは含まない)。 */
export const UNION_FIND_OPERATIONS: [string, string][] = [
  ["0", "1"],
  ["2", "3"],
  ["4", "5"],
  ["6", "7"],
  ["0", "2"],
  ["4", "6"],
  ["0", "4"],
];
export const UNION_FIND_EDGES: GraphEdge[] = UNION_FIND_OPERATIONS.map(([a, b], i) => ({
  id: `uf${i}`,
  from: a,
  to: b,
  weight: 1,
}));

/**
 * Union-Find(素集合データ構造)のステップ列を生成する。
 * 各要素は最初は自分自身だけの集合。union(a,b)のたびに、それぞれの根をfind()でたどり、
 * ランクの低い方の根を高い方につなぐ(union by rank)ことで、木の高さを低く保ちながら集合を統合する。
 * このデモでは経路圧縮は行わない(union by rankのみでも十分に高さを抑えられることを示す簡略版)。
 */
export function unionFindSteps(): GraphFrame[] {
  const nodes = UNION_FIND_NODES;
  const operations = UNION_FIND_OPERATIONS;
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();
  nodes.forEach((n) => {
    parent.set(n.id, n.id);
    rank.set(n.id, 0);
  });

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(UNION_FIND_EDGES, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: "各要素が自分自身だけの集合として8個の独立した集合から開始",
    },
  ];

  const find = (id: string, path: string[]): string => {
    path.push(id);
    const p = parent.get(id)!;
    if (p === id) return id;
    return find(p, path);
  };

  operations.forEach(([a, b], i) => {
    const pathA: string[] = [];
    const pathB: string[] = [];
    const rootA = find(a, pathA);
    const rootB = find(b, pathB);

    const visitingStates = { ...nodeStates };
    [...pathA, ...pathB].forEach((id) => {
      visitingStates[id] = "visited";
    });
    frames.push({
      nodeStates: visitingStates,
      edgeStates: { ...edgeStates },
      distances: {},
      description: `union(${a}, ${b}): find(${a})の経路[${pathA.join("→")}]、find(${b})の経路[${pathB.join("→")}]でそれぞれの根を特定`,
    });

    const rankA = rank.get(rootA)!;
    const rankB = rank.get(rootB)!;
    if (rankA < rankB) {
      parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      parent.set(rootB, rootA);
    } else {
      parent.set(rootB, rootA);
      rank.set(rootA, rankA + 1);
    }

    edgeStates[UNION_FIND_EDGES[i].id] = "tree";
    nodeStates[a] = "settled";
    nodeStates[b] = "settled";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `union(${a}, ${b}): ランクの低い方の根を高い方につなぎ、2つの集合を統合(union by rank)`,
    });
  });

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: "全ての操作が完了。経路圧縮なしのunion by rankだけでも木の高さを低く保てる",
  });

  return frames;
}

export const SCC_NODES: GraphNode[] = circleLayout(["A", "B", "C", "D", "E", "F"]);
/**
 * 3つの強連結成分を含む有向グラフ: {A,B,C}(3頂点のサイクル)、{D,E}(2頂点のサイクル)、{F}(単独)。
 * SCC間はC→D、E→Fの橋渡し辺で繋がっており、SCCを1つにまとめた縮約グラフはDAGになる。
 */
export const SCC_EDGES: GraphEdge[] = [
  { id: "AB", from: "A", to: "B", weight: 1 },
  { id: "BC", from: "B", to: "C", weight: 1 },
  { id: "CA", from: "C", to: "A", weight: 1 },
  { id: "CD", from: "C", to: "D", weight: 1 },
  { id: "DE", from: "D", to: "E", weight: 1 },
  { id: "ED", from: "E", to: "D", weight: 1 },
  { id: "EF", from: "E", to: "F", weight: 1 },
];

/**
 * Tarjanの強連結成分分解のステップ列を生成する。
 * DFSで各頂点に発見時刻(index)とlow-link値(自分自身か、DFS木の子孫からの後退辺で到達できる
 * 最小の発見時刻)を割り当てる。low-link=発見時刻の頂点はSCCの根であり、
 * その時点でスタックに積まれている(まだどのSCCにも属していない)頂点を根まで全て取り出せば、
 * それが1つの強連結成分になる。深さ優先探索1回だけで全SCCを求められるのが特徴。
 */
export function tarjanSccSteps(): GraphFrame[] {
  const nodes = SCC_NODES;
  const edges = SCC_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: "DFS1回で強連結成分(SCC)を求めるTarjanのアルゴリズムを開始",
    },
  ];

  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccResults: string[][] = [];

  const outgoing = (id: string) => edges.filter((e) => e.from === id);

  const strongconnect = (v: string) => {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    nodeStates[v] = "visited";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `頂点${v}を訪問(発見時刻=${indices.get(v)})、スタックに積む`,
    });

    for (const edge of outgoing(v)) {
      const w = edge.to;
      edgeStates[edge.id] = "checking";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `辺${v}→${w}を検査`,
      });

      if (!indices.has(w)) {
        edgeStates[edge.id] = "tree";
        strongconnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `頂点${w}の探索から戻る。low-link[${v}]を${lowlinks.get(v)}に更新`,
        });
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `頂点${w}はスタック上(同じSCCの候補) → low-link[${v}]を${lowlinks.get(v)}に更新`,
        });
      } else {
        edgeStates[edge.id] = "idle";
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        nodeStates[w] = "settled";
        scc.push(w);
      } while (w !== v);
      sccResults.push(scc);
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `頂点${v}はSCCの根(low-link=発見時刻) → {${scc.join(",")}}を1つの強連結成分として確定`,
      });
    }
  };

  for (const node of nodes) {
    if (!indices.has(node.id)) strongconnect(node.id);
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。強連結成分: ${sccResults.map((s) => `{${s.join(",")}}`).join(", ")}`,
  });

  return frames;
}

export const GRAPH_DATASETS: Record<string, GraphDataset> = {
  "bellman-ford": {
    nodes: SHORTEST_PATH_NODES,
    edges: SHORTEST_PATH_EDGES,
    directed: true,
  },
  prim: { nodes: MST_NODES, edges: MST_EDGES, directed: false },
  kruskal: { nodes: MST_NODES, edges: MST_EDGES, directed: false },
  "topological-sort": {
    nodes: SHORTEST_PATH_NODES,
    edges: SHORTEST_PATH_EDGES,
    directed: true,
  },
  boruvka: { nodes: MST_NODES, edges: MST_EDGES, directed: false },
  "union-find": { nodes: UNION_FIND_NODES, edges: UNION_FIND_EDGES, directed: false },
  "tarjan-scc": { nodes: SCC_NODES, edges: SCC_EDGES, directed: true },
};

export const GRAPH_VISUALIZERS: Record<string, () => GraphFrame[]> = {
  "bellman-ford": bellmanFordSteps,
  prim: primSteps,
  kruskal: kruskalSteps,
  "topological-sort": topologicalSortSteps,
  boruvka: boruvkaSteps,
  "union-find": unionFindSteps,
  "tarjan-scc": tarjanSccSteps,
};
