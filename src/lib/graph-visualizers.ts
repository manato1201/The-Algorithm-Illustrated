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
  /** 辺の表示ラベルを動的に上書きする(最大流アルゴリズムの「流量/容量」表示用)。未設定の辺は既定のweight表示のまま。 */
  edgeLabels?: Record<string, string>;
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
 * カーンのアルゴリズム(BFSベースのトポロジカルソート)のステップ列を生成する。
 * `topologicalSortSteps`(DFSの帰りがけ順)と同じ有向非巡回グラフ(DAG)を使い回すが、
 * アプローチは対照的: 各頂点の入次数(自分に向かう辺の本数)を数えておき、
 * 入次数0の頂点(＝まだ処理されていない依存先を持たない頂点)から順に取り除いては、
 * その頂点から出る辺を除去して行き先の入次数を減らし、新たに入次数0になった頂点を
 * キューに追加する、という処理をキューが空になるまで繰り返す。
 */
export function kahnSteps(): GraphFrame[] {
  const nodes = SHORTEST_PATH_NODES;
  const edges = SHORTEST_PATH_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const indegree = new Map<string, number>();
  nodes.forEach((n) => indegree.set(n.id, 0));
  edges.forEach((e) => indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1));

  const indegreeDisplay = (): Record<string, number | null> =>
    Object.fromEntries(nodes.map((n) => [n.id, indegree.get(n.id)!]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: indegreeDisplay(),
      description: "各頂点の入次数を計算(頂点下の数字が入次数)。カーンのアルゴリズムを開始",
    },
  ];

  const queue: string[] = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  const order: string[] = [];
  const outgoing = (id: string) => edges.filter((e) => e.from === id);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    order.push(cur);
    nodeStates[cur] = "settled";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: indegreeDisplay(),
      description: `入次数0の頂点${cur}を順序リストに追加(現在の順序: ${order.join(" → ")})`,
    });

    for (const edge of outgoing(cur)) {
      edgeStates[edge.id] = "tree";
      indegree.set(edge.to, indegree.get(edge.to)! - 1);
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: indegreeDisplay(),
        description: `辺${edge.from}→${edge.to}を除去。頂点${edge.to}の入次数を${indegree.get(edge.to)}に更新`,
      });
      if (indegree.get(edge.to) === 0) {
        queue.push(edge.to);
        nodeStates[edge.to] = "visited";
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: indegreeDisplay(),
          description: `頂点${edge.to}の入次数が0になったのでキューに追加`,
        });
      }
    }
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `カーンのアルゴリズム完了: ${order.join(" → ")}`,
  });

  return frames;
}

/**
 * ジョンソンのアルゴリズムのステップ列を生成する。bellman-ford.mdと同じグラフ(負の辺D→E: -3を含む)
 * を使い、フロイド・ワーシャル法と同じ「全点対最短経路」を求める点は同じだが、アプローチは全く異なる:
 * (1) 全頂点に重み0の辺でつながる仮想始点を考え、そこからベルマン・フォード法で
 *     各頂点への最短距離h(v)を求める(負の辺があっても計算できるのがベルマン・フォード法の強み)、
 * (2) 各辺(u,v)をw'(u,v)=w(u,v)+h(u)-h(v)で再重み付けすると全ての辺が非負になることが保証される
 *     (三角不等式 h(v)≤h(u)+w(u,v) より w'(u,v)≥0)、
 * (3) 非負になった辺なら高速なダイクストラ法が使えるので、全頂点を始点に1回ずつダイクストラ法を実行し、
 *     得られた距離を dist = d' - h(始点) + h(終点) で実際の距離に変換する。
 * 疎なグラフではO(V²logV + VE)とフロイド・ワーシャル法のO(V³)より高速になるのが利点。
 * 同じグラフに対して求まる全点対最短距離は、フロイド・ワーシャル法の結果と完全に一致する
 * (node --experimental-strip-typesで検証済み)。
 */
export function johnsonSteps(): GraphFrame[] {
  const nodes = SHORTEST_PATH_NODES;
  const edges = SHORTEST_PATH_EDGES;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const originalLabels = (): Record<string, string> =>
    Object.fromEntries(edges.map((e) => [e.id, String(e.weight)]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: originalLabels(),
      description: "ジョンソンのアルゴリズムを開始。負の辺(D→E: -3)を含むグラフの全点対最短経路を求める",
    },
  ];

  const h = new Map<string, number>();
  nodes.forEach((n) => h.set(n.id, 0));
  for (let i = 0; i < nodes.length - 1; i++) {
    for (const e of edges) {
      if (h.get(e.from)! + e.weight < h.get(e.to)!) {
        h.set(e.to, h.get(e.from)! + e.weight);
      }
    }
  }
  const hDisplay: Record<string, number | null> = Object.fromEntries(
    nodes.map((n) => [n.id, h.get(n.id)!]),
  );
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: hDisplay,
    edgeLabels: originalLabels(),
    description:
      "[フェーズ1] 全頂点に重み0の辺でつながる仮想始点からベルマン・フォード法で最短距離h(v)を計算(頂点下の数字がh)。これを使って負の辺を打ち消す",
  });

  const reweighted = new Map<string, number>();
  edges.forEach((e) => reweighted.set(e.id, e.weight + h.get(e.from)! - h.get(e.to)!));
  const reweightedLabels = Object.fromEntries(
    edges.map((e) => [
      e.id,
      `${e.weight}+${h.get(e.from)}-${h.get(e.to)}=${reweighted.get(e.id)}`,
    ]),
  );
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: hDisplay,
    edgeLabels: reweightedLabels,
    description:
      "[フェーズ2] 各辺をw'(u,v)=w(u,v)+h(u)-h(v)で再重み付け。全ての辺が非負になり、ダイクストラ法が使えるようになる",
  });

  const adjacency = new Map<string, string[]>();
  nodes.forEach((n) => adjacency.set(n.id, edges.filter((e) => e.from === n.id).map((e) => e.to)));
  const edgeIdBetween = (a: string, b: string): string =>
    edges.find((e) => e.from === a && e.to === b)!.id;

  const allPairsSummary: string[] = [];

  for (const source of nodes) {
    const distPrime = new Map<string, number | null>();
    nodes.forEach((n) => distPrime.set(n.id, n.id === source.id ? 0 : null));
    const visited = new Set<string>();
    const localNodeStates = initNodeStates(nodes, "idle");
    localNodeStates[source.id] = "settled";
    const idleEdges = initEdgeStates(edges, "idle");
    frames.push({
      nodeStates: { ...localNodeStates },
      edgeStates: { ...idleEdges },
      distances: Object.fromEntries([...distPrime.entries()]),
      edgeLabels: reweightedLabels,
      description: `[フェーズ3] 頂点${source.id}を始点にダイクストラ法(再重み付けしたグラフ上)を実行`,
    });

    while (visited.size < nodes.length) {
      let u: string | null = null;
      let best = Infinity;
      nodes.forEach((n) => {
        const d = distPrime.get(n.id);
        if (!visited.has(n.id) && typeof d === "number" && d < best) {
          best = d;
          u = n.id;
        }
      });
      if (u === null) break;
      const uid: string = u;
      visited.add(uid);
      localNodeStates[uid] = "settled";
      for (const v of adjacency.get(uid) ?? []) {
        if (visited.has(v)) continue;
        const w = reweighted.get(edgeIdBetween(uid, v))!;
        const cand = distPrime.get(uid)! + w;
        if (distPrime.get(v) === null || cand < distPrime.get(v)!) {
          distPrime.set(v, cand);
          if (localNodeStates[v] !== "settled") localNodeStates[v] = "visited";
        }
      }
      frames.push({
        nodeStates: { ...localNodeStates },
        edgeStates: { ...idleEdges },
        distances: Object.fromEntries([...distPrime.entries()]),
        edgeLabels: reweightedLabels,
        description: `頂点${uid}を確定。隣接頂点の距離を更新`,
      });
    }

    const realDist: Record<string, number | null> = {};
    nodes.forEach((n) => {
      const dp = distPrime.get(n.id);
      realDist[n.id] = typeof dp === "number" ? dp - h.get(source.id)! + h.get(n.id)! : null;
    });
    allPairsSummary.push(
      `${source.id}→{${nodes.map((n) => `${n.id}:${realDist[n.id] ?? "∞"}`).join(",")}}`,
    );
    frames.push({
      nodeStates: { ...localNodeStates },
      edgeStates: { ...idleEdges },
      distances: realDist,
      edgeLabels: reweightedLabels,
      description: `頂点${source.id}からの実際の最短距離に変換完了(dist=d'-h(始点)+h(終点)): ${nodes
        .map((n) => `${n.id}=${realDist[n.id] ?? "∞"}`)
        .join(", ")}`,
    });
  }

  frames.push({
    nodeStates: initNodeStates(nodes, "settled"),
    edgeStates: initEdgeStates(edges, "idle"),
    distances: {},
    edgeLabels: originalLabels(),
    description: `計算完了。全点対の最短距離: ${allPairsSummary.join(" / ")}`,
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

type HuffmanInternalNode = {
  id: string;
  freq: number;
  char: string | null;
  left: string | null;
  right: string | null;
};

/** ハフマン符号化の例題。Wikipedia等で広く引用される古典的な6文字の頻度分布。 */
export const HUFFMAN_FREQUENCIES: [string, number][] = [
  ["A", 5],
  ["B", 9],
  ["C", 12],
  ["D", 13],
  ["E", 16],
  ["F", 45],
];

function buildHuffmanTree(): {
  nodes: Record<string, HuffmanInternalNode>;
  rootId: string;
  mergeOrder: { leftId: string; rightId: string; newId: string }[];
} {
  const nodes: Record<string, HuffmanInternalNode> = {};
  HUFFMAN_FREQUENCIES.forEach(([char, freq]) => {
    nodes[char] = { id: char, freq, char, left: null, right: null };
  });

  let pool = HUFFMAN_FREQUENCIES.map(([char]) => char);
  const mergeOrder: { leftId: string; rightId: string; newId: string }[] = [];
  let nextInternalId = 1;

  while (pool.length > 1) {
    pool = [...pool].sort((a, b) => nodes[a].freq - nodes[b].freq);
    const leftId = pool[0];
    const rightId = pool[1];
    const newId = `I${nextInternalId}`;
    nextInternalId++;
    nodes[newId] = {
      id: newId,
      freq: nodes[leftId].freq + nodes[rightId].freq,
      char: null,
      left: leftId,
      right: rightId,
    };
    mergeOrder.push({ leftId, rightId, newId });
    pool = [newId, ...pool.slice(2)];
  }

  return { nodes, rootId: pool[0], mergeOrder };
}

function computeHuffmanLayout(
  nodes: Record<string, HuffmanInternalNode>,
  rootId: string,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  let counter = 0;
  let maxDepth = 0;

  const visit = (id: string, depth: number) => {
    const node = nodes[id];
    maxDepth = Math.max(maxDepth, depth);
    if (node.left === null && node.right === null) {
      positions[id] = { x: counter, y: depth };
      counter++;
      return;
    }
    if (node.left !== null) visit(node.left, depth + 1);
    if (node.right !== null) visit(node.right, depth + 1);
    const childIds = [node.left, node.right].filter((v): v is string => v !== null);
    const childXs = childIds.map((cid) => positions[cid].x);
    positions[id] = { x: (Math.min(...childXs) + Math.max(...childXs)) / 2, y: depth };
  };
  visit(rootId, 0);

  const totalLeaves = counter;
  Object.keys(positions).forEach((id) => {
    positions[id] = {
      x: totalLeaves > 1 ? positions[id].x / (totalLeaves - 1) : 0.5,
      y: maxDepth > 0 ? positions[id].y / maxDepth : 0,
    };
  });
  return positions;
}

const HUFFMAN_TREE = buildHuffmanTree();
const HUFFMAN_LAYOUT = computeHuffmanLayout(HUFFMAN_TREE.nodes, HUFFMAN_TREE.rootId);

export const HUFFMAN_NODES: GraphNode[] = Object.values(HUFFMAN_TREE.nodes).map((n) => ({
  id: n.id,
  label: n.char ?? "",
  x: HUFFMAN_LAYOUT[n.id].x,
  y: HUFFMAN_LAYOUT[n.id].y,
}));
export const HUFFMAN_EDGES: GraphEdge[] = Object.values(HUFFMAN_TREE.nodes).flatMap((n) => {
  const edges: GraphEdge[] = [];
  if (n.left !== null) edges.push({ id: `${n.id}-${n.left}`, from: n.id, to: n.left, weight: 1 });
  if (n.right !== null) edges.push({ id: `${n.id}-${n.right}`, from: n.id, to: n.right, weight: 1 });
  return edges;
});

/**
 * ハフマン符号化(ハフマン木の構築)のステップ列を生成する。GraphVisualizerを再利用しているが、
 * 他のグラフアルゴリズムと違い、木構造自体をこのアルゴリズムの実行結果として一度構築してから
 * その最終形をノードリンク図の固定レイアウトとして使い、貪欲法による構築過程を辺・頂点の
 * 状態遷移で再現する(最小全域木アルゴリズム(プリム法・クラスカル法)と同じ「全体を先に表示し
 * 採用済み辺をハイライトする」表現方法)。毎回「頻度が最小の2つの木を1つに併合する」操作を
 * 繰り返すだけで、出現頻度の低い文字ほど根から遠い(=符号が長い)木が自動的にできあがる。
 */
export function huffmanCodingSteps(): GraphFrame[] {
  const { nodes, mergeOrder } = HUFFMAN_TREE;
  const graphNodes = HUFFMAN_NODES;
  const graphEdges = HUFFMAN_EDGES;

  const nodeStates = initNodeStates(graphNodes, "idle");
  const edgeStates = initEdgeStates(graphEdges, "idle");
  const freqs: Record<string, number | null> = {};
  HUFFMAN_FREQUENCIES.forEach(([char, freq]) => {
    freqs[char] = freq;
  });
  graphNodes.forEach((n) => {
    if (!(n.id in freqs)) freqs[n.id] = null;
  });

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...freqs },
      description: `ハフマン符号化を開始。出現頻度: ${HUFFMAN_FREQUENCIES.map(([c, f]) => `${c}=${f}`).join(", ")}(頂点下の数字が頻度)`,
    },
  ];

  for (const { leftId, rightId, newId } of mergeOrder) {
    const highlightNodes = { ...nodeStates };
    highlightNodes[leftId] = "visited";
    highlightNodes[rightId] = "visited";
    frames.push({
      nodeStates: highlightNodes,
      edgeStates: { ...edgeStates },
      distances: { ...freqs },
      description: `最小頻度の2つの木を選択: ${leftId}(頻度${nodes[leftId].freq}) と ${rightId}(頻度${nodes[rightId].freq})`,
    });

    edgeStates[`${newId}-${leftId}`] = "tree";
    edgeStates[`${newId}-${rightId}`] = "tree";
    nodeStates[leftId] = "settled";
    nodeStates[rightId] = "settled";
    nodeStates[newId] = "settled";
    freqs[newId] = nodes[newId].freq;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...freqs },
      description: `頂点${newId}(頻度${nodes[newId].freq}=${nodes[leftId].freq}+${nodes[rightId].freq})を作成し、${leftId}と${rightId}をその子として接続`,
    });
  }

  const totalWeightedLength = HUFFMAN_FREQUENCIES.reduce((sum, [char, freq]) => {
    let depth = 0;
    let cur = char;
    while (cur !== HUFFMAN_TREE.rootId) {
      const parent = Object.values(nodes).find((n) => n.left === cur || n.right === cur)!;
      cur = parent.id;
      depth++;
    }
    return sum + freq * depth;
  }, 0);

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...freqs },
    description: `計算完了。全ての文字が1つの木にまとまった。符号長の合計(頻度×深さの総和) = ${totalWeightedLength}ビット`,
  });

  return frames;
}

/**
 * ρ(ロー)字型の連結リストを表す固定データセット。0→1→2で末尾に到達したのち、
 * 3→4→5→6→7→3という長さ5の循環に入る(フロイドの循環検出法の教科書的な形)。
 */
export const CYCLE_DETECTION_NODES: GraphNode[] = [
  { id: "0", label: "0", x: 0.08, y: 0.5 },
  { id: "1", label: "1", x: 0.22, y: 0.5 },
  { id: "2", label: "2", x: 0.36, y: 0.5 },
  { id: "3", label: "3", x: 0.55, y: 0.72 },
  { id: "4", label: "4", x: 0.72, y: 0.62 },
  { id: "5", label: "5", x: 0.78, y: 0.42 },
  { id: "6", label: "6", x: 0.65, y: 0.25 },
  { id: "7", label: "7", x: 0.48, y: 0.35 },
];
const CYCLE_DETECTION_NEXT: Record<string, string> = {
  "0": "1",
  "1": "2",
  "2": "3",
  "3": "4",
  "4": "5",
  "5": "6",
  "6": "7",
  "7": "3",
};
export const CYCLE_DETECTION_EDGES: GraphEdge[] = Object.entries(CYCLE_DETECTION_NEXT).map(
  ([from, to]) => ({ id: `${from}-${to}`, from, to, weight: 1 }),
);

/**
 * フロイドの循環検出法(Tortoise and Hare)のステップ列を生成する。追加メモリを使わず、
 * 1歩ずつ進む遅いポインタと2歩ずつ進む速いポインタを同時に動かすと、リストに循環があれば
 * 必ずどこかで2つのポインタが同じ頂点で出会う(循環がなければ速いポインタが先に終端に達する)。
 * 出会った後、片方を先頭に戻して両方とも1歩ずつ進めると、今度は循環の入口で出会う
 * ——これは循環部分の長さがcで、先頭から入口までの距離がμのとき、最初の出会いが
 * 入口からc-μ歩の位置になるという数学的性質を利用している。
 */
export function floydCycleDetectionSteps(): GraphFrame[] {
  const nodes = CYCLE_DETECTION_NODES;
  const edges = CYCLE_DETECTION_EDGES;
  const next = CYCLE_DETECTION_NEXT;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: "フロイドの循環検出法を開始。頂点0から出発し、遅い/速いポインタで循環を検出する",
    },
  ];

  let slow = "0";
  let fast = "0";
  let round = 0;
  for (;;) {
    round++;
    slow = next[slow];
    fast = next[next[fast]];
    const states = { ...nodeStates };
    states[slow] = "visited";
    states[fast] = fast === slow ? "visited" : "settled";
    frames.push({
      nodeStates: states,
      edgeStates: { ...edgeStates },
      distances: {},
      description: `[フェーズ1: 出会うまで] ラウンド${round}: 遅いポインタ→${slow}(1歩)、速いポインタ→${fast}(2歩)`,
    });
    if (slow === fast) break;
  }
  const meetingPoint = slow;
  frames.push({
    nodeStates: { ...nodeStates, [meetingPoint]: "settled" },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `頂点${meetingPoint}で2つのポインタが出会った。循環の存在が確定。ここから循環の入口を探す`,
  });

  let ptr1 = "0";
  let ptr2 = meetingPoint;
  round = 0;
  if (ptr1 !== ptr2) {
    for (;;) {
      round++;
      ptr1 = next[ptr1];
      ptr2 = next[ptr2];
      const states = { ...nodeStates };
      states[ptr1] = "visited";
      states[ptr2] = ptr2 === ptr1 ? "visited" : "settled";
      frames.push({
        nodeStates: states,
        edgeStates: { ...edgeStates },
        distances: {},
        description: `[フェーズ2: 循環の入口を探す] ラウンド${round}: 先頭から来たポインタ→${ptr1}、出会った点から来たポインタ→${ptr2}`,
      });
      if (ptr1 === ptr2) break;
    }
  }
  const cycleStart = ptr1;

  frames.push({
    nodeStates: { ...nodeStates, [cycleStart]: "settled" },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。循環の入口は頂点${cycleStart}(2つのポインタが再び一致した頂点)`,
  });

  return frames;
}

type SegmentTreeInternalNode = {
  id: string;
  lo: number;
  hi: number;
  sum: number;
  left: string | null;
  right: string | null;
};

/** セグメント木のデモ用配列(6要素)。区間和クエリを求める。 */
export const SEGMENT_TREE_DATA = [2, 5, 1, 4, 9, 3];
export const SEGMENT_TREE_QUERY_RANGE: [number, number] = [1, 5];
export const SEGMENT_TREE_UPDATE_INDEX = 2;
export const SEGMENT_TREE_UPDATE_VALUE = 10;

function buildSegmentTree(
  arr: number[],
  lo: number,
  hi: number,
  nodes: Record<string, SegmentTreeInternalNode>,
): string {
  const id = `seg_${lo}_${hi}`;
  if (hi - lo === 1) {
    nodes[id] = { id, lo, hi, sum: arr[lo], left: null, right: null };
    return id;
  }
  const mid = Math.floor((lo + hi) / 2);
  const leftId = buildSegmentTree(arr, lo, mid, nodes);
  const rightId = buildSegmentTree(arr, mid, hi, nodes);
  nodes[id] = { id, lo, hi, sum: nodes[leftId].sum + nodes[rightId].sum, left: leftId, right: rightId };
  return id;
}

function computeSegmentTreeLayout(
  nodes: Record<string, SegmentTreeInternalNode>,
  rootId: string,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  let counter = 0;
  let maxDepth = 0;

  const visit = (id: string, depth: number) => {
    const node = nodes[id];
    maxDepth = Math.max(maxDepth, depth);
    if (node.left === null && node.right === null) {
      positions[id] = { x: counter, y: depth };
      counter++;
      return;
    }
    if (node.left !== null) visit(node.left, depth + 1);
    if (node.right !== null) visit(node.right, depth + 1);
    const childIds = [node.left, node.right].filter((v): v is string => v !== null);
    const childXs = childIds.map((cid) => positions[cid].x);
    positions[id] = { x: (Math.min(...childXs) + Math.max(...childXs)) / 2, y: depth };
  };
  visit(rootId, 0);

  const totalLeaves = counter;
  Object.keys(positions).forEach((id) => {
    positions[id] = {
      x: totalLeaves > 1 ? positions[id].x / (totalLeaves - 1) : 0.5,
      y: maxDepth > 0 ? positions[id].y / maxDepth : 0,
    };
  });
  return positions;
}

const SEGMENT_TREE_NODES_MAP: Record<string, SegmentTreeInternalNode> = {};
const SEGMENT_TREE_ROOT_ID = buildSegmentTree(SEGMENT_TREE_DATA, 0, SEGMENT_TREE_DATA.length, SEGMENT_TREE_NODES_MAP);
const SEGMENT_TREE_LAYOUT = computeSegmentTreeLayout(SEGMENT_TREE_NODES_MAP, SEGMENT_TREE_ROOT_ID);

export const SEGMENT_TREE_GRAPH_NODES: GraphNode[] = Object.values(SEGMENT_TREE_NODES_MAP).map((n) => ({
  id: n.id,
  label: n.hi - n.lo === 1 ? String(n.sum) : "Σ",
  x: SEGMENT_TREE_LAYOUT[n.id].x,
  y: SEGMENT_TREE_LAYOUT[n.id].y,
}));
export const SEGMENT_TREE_GRAPH_EDGES: GraphEdge[] = Object.values(SEGMENT_TREE_NODES_MAP).flatMap((n) => {
  const edges: GraphEdge[] = [];
  if (n.left !== null) edges.push({ id: `${n.id}-${n.left}`, from: n.id, to: n.left, weight: 1 });
  if (n.right !== null) edges.push({ id: `${n.id}-${n.right}`, from: n.id, to: n.right, weight: 1 });
  return edges;
});

/**
 * セグメント木の構築・区間和クエリ・点更新のステップ列を生成する。GraphVisualizerを
 * ハフマン符号化と同じ手法(実行結果として木構造を先に構築し、その最終形を固定レイアウトの
 * ノードリンク図として使う)で再利用している。各内部頂点は自分がカバーする区間の合計を持ち、
 * クエリ区間と各頂点の区間の関係(完全に含む/一部重なる/交わらない)で再帰を枝刈りすることで、
 * 配列を毎回全走査するO(n)ではなくO(log n)で区間和が求まる。点更新も、対象の葉から
 * ルートまでの1本道(O(log n)個)の頂点だけを更新すれば済む。
 */
export function segmentTreeSteps(): GraphFrame[] {
  const nodesMap: Record<string, SegmentTreeInternalNode> = {};
  buildSegmentTree(SEGMENT_TREE_DATA, 0, SEGMENT_TREE_DATA.length, nodesMap);
  const rootId = SEGMENT_TREE_ROOT_ID;
  const graphNodes = SEGMENT_TREE_GRAPH_NODES;
  const graphEdges = SEGMENT_TREE_GRAPH_EDGES;

  const nodeStates = initNodeStates(graphNodes, "idle");
  const edgeStates = initEdgeStates(graphEdges, "idle");
  const sums: Record<string, number | null> = {};
  graphNodes.forEach((n) => {
    sums[n.id] = null;
  });

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...sums },
      description: `セグメント木の構築を開始。元データ: [${SEGMENT_TREE_DATA.join(", ")}](頂点下の数字が区間和)`,
    },
  ];

  const buildOrderVisit = (id: string) => {
    const node = nodesMap[id];
    if (node.left !== null) buildOrderVisit(node.left);
    if (node.right !== null) buildOrderVisit(node.right);
    nodeStates[id] = "settled";
    if (node.left !== null) edgeStates[`${id}-${node.left}`] = "tree";
    if (node.right !== null) edgeStates[`${id}-${node.right}`] = "tree";
    sums[id] = node.sum;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...sums },
      description:
        node.left === null && node.right === null
          ? `葉[${node.lo},${node.hi})を確定(値=${node.sum})`
          : `頂点[${node.lo},${node.hi})を確定(左右の子の和 = ${node.sum})`,
    });
  };
  buildOrderVisit(rootId);

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...sums },
    description: "構築完了。ここから区間和クエリを実行する",
  });

  const [qLo, qHi] = SEGMENT_TREE_QUERY_RANGE;
  let queryResult = 0;
  const queryVisit = (id: string): void => {
    const node = nodesMap[id];
    nodeStates[id] = "visited";
    if (qHi <= node.lo || node.hi <= qLo) {
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...sums },
        description: `頂点[${node.lo},${node.hi})はクエリ区間[${qLo},${qHi})と交わらない → 枝刈り(和に加算せず終了)`,
      });
      return;
    }
    if (qLo <= node.lo && node.hi <= qHi) {
      queryResult += node.sum;
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...sums },
        description: `頂点[${node.lo},${node.hi})はクエリ区間に完全に含まれる → 和${node.sum}を加算(累計${queryResult})。この頂点の子はもう見ない`,
      });
      return;
    }
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...sums },
      description: `頂点[${node.lo},${node.hi})はクエリ区間と一部だけ重なる → 左右の子を再帰的に検査`,
    });
    if (node.left !== null) queryVisit(node.left);
    if (node.right !== null) queryVisit(node.right);
  };
  queryVisit(rootId);

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...sums },
    description: `区間和クエリ完了。[${qLo},${qHi})の和 = ${queryResult}`,
  });

  const updateIndex = SEGMENT_TREE_UPDATE_INDEX;
  const updateValue = SEGMENT_TREE_UPDATE_VALUE;
  const findLeafPath = (id: string, path: string[]): void => {
    path.push(id);
    const node = nodesMap[id];
    if (node.hi - node.lo === 1) return;
    const mid = Math.floor((node.lo + node.hi) / 2);
    if (updateIndex < mid) findLeafPath(node.left!, path);
    else findLeafPath(node.right!, path);
  };
  const path: string[] = [];
  findLeafPath(rootId, path);

  for (let i = path.length - 1; i >= 0; i--) {
    const id = path[i];
    const node = nodesMap[id];
    if (node.hi - node.lo === 1) {
      node.sum = updateValue;
    } else {
      node.sum = nodesMap[node.left!].sum + nodesMap[node.right!].sum;
    }
    sums[id] = node.sum;
    nodeStates[id] = "settled";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...sums },
      description:
        node.hi - node.lo === 1
          ? `点更新: 添字${updateIndex}の値を${updateValue}に変更(葉[${node.lo},${node.hi})を更新)`
          : `点更新の伝播: 頂点[${node.lo},${node.hi})の和を子の和から再計算 = ${node.sum}`,
    });
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...sums },
    description: `計算完了。添字${updateIndex}を${updateValue}に更新後、ルートの合計は${nodesMap[rootId].sum}`,
  });

  return frames;
}

/** スキップリストのデモ用データ。各値の「塔の高さ」に応じて上位レベルほど疎になる。 */
export const SKIP_LIST_LEVELS: number[][] = [
  [3, 6, 7, 9, 12, 17, 19, 21, 25, 26],
  [6, 9, 17, 19, 21, 25],
  [9, 19],
  [19],
];
export const SKIP_LIST_TARGET = 25;

const SKIP_LIST_NUM_LEVELS = SKIP_LIST_LEVELS.length;
const SKIP_LIST_ALL_VALUES = SKIP_LIST_LEVELS[0];

function skipListNodeId(level: number, item: number | "H"): string {
  return `L${level}_${item}`;
}

function skipListX(item: number | "H"): number {
  if (item === "H") return 0.05;
  const idx = SKIP_LIST_ALL_VALUES.indexOf(item);
  return 0.16 + (idx / (SKIP_LIST_ALL_VALUES.length - 1)) * 0.8;
}

function skipListY(level: number): number {
  return SKIP_LIST_NUM_LEVELS > 1 ? 0.85 - level * (0.7 / (SKIP_LIST_NUM_LEVELS - 1)) : 0.5;
}

export const SKIP_LIST_NODES: GraphNode[] = SKIP_LIST_LEVELS.flatMap((values, level) => [
  { id: skipListNodeId(level, "H"), label: "H", x: skipListX("H"), y: skipListY(level) },
  ...values.map((v) => ({ id: skipListNodeId(level, v), label: String(v), x: skipListX(v), y: skipListY(level) })),
]);

export const SKIP_LIST_EDGES: GraphEdge[] = [
  ...SKIP_LIST_LEVELS.flatMap((values, level) => {
    const list: (number | "H")[] = ["H", ...values];
    const edges: GraphEdge[] = [];
    for (let i = 0; i < list.length - 1; i++) {
      edges.push({
        id: `${skipListNodeId(level, list[i])}-${skipListNodeId(level, list[i + 1])}`,
        from: skipListNodeId(level, list[i]),
        to: skipListNodeId(level, list[i + 1]),
        weight: 1,
      });
    }
    return edges;
  }),
  ...SKIP_LIST_LEVELS.slice(1).flatMap((values, i) => {
    const level = i + 1;
    const items: (number | "H")[] = ["H", ...values];
    return items.map((item) => ({
      id: `drop_${level}_${item}`,
      from: skipListNodeId(level, item),
      to: skipListNodeId(level - 1, item),
      weight: 1,
    }));
  }),
];

/**
 * スキップリストの探索のステップ列を生成する。各要素は確率的に決まる「塔の高さ」を持ち、
 * 高さが高いほど上位レベルの疎な連結リストにも登場する。探索は最上位レベルの先頭から始め、
 * 「次の値が目標以下なら右へ進み、それ以上進めなければ1つ下のレベルへ降りる」を繰り返す。
 * 上位レベルでは大きく飛ばして候補を絞り込み、下位レベルに降りるほど細かく調整するという
 * 二分探索的な考え方を、ソート済み配列ではなく連結リストの上で実現している。
 */
export function skipListSteps(): GraphFrame[] {
  const nodes = SKIP_LIST_NODES;
  const edges = SKIP_LIST_EDGES;
  const target = SKIP_LIST_TARGET;
  const numLevels = SKIP_LIST_NUM_LEVELS;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `スキップリストの探索を開始。目的の値=${target}を、最上位レベル(レベル${numLevels - 1})から探す`,
    },
  ];

  const nextInLevel = (level: number, id: string): string | null => {
    const list: (number | "H")[] = ["H", ...SKIP_LIST_LEVELS[level]];
    const idx = list.findIndex((v) => skipListNodeId(level, v) === id);
    if (idx === -1 || idx === list.length - 1) return null;
    return skipListNodeId(level, list[idx + 1]);
  };
  const valueOf = (id: string): number | "H" => {
    const raw = id.slice(id.indexOf("_") + 1);
    return raw === "H" ? "H" : Number(raw);
  };

  let cur = skipListNodeId(numLevels - 1, "H");
  nodeStates[cur] = "visited";
  for (let level = numLevels - 1; level >= 0; level--) {
    for (;;) {
      const nxt = nextInLevel(level, cur);
      if (nxt === null) break;
      const nxtValue = valueOf(nxt);
      if (nxtValue !== "H" && nxtValue <= target) {
        const edgeId = `${cur}-${nxt}`;
        edgeStates[edgeId] = "tree";
        cur = nxt;
        nodeStates[cur] = "visited";
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `レベル${level}: 次の値${nxtValue}は目標${target}以下 → 右へ移動`,
        });
      } else {
        break;
      }
    }
    nodeStates[cur] = "settled";
    if (level > 0) {
      const curValue = valueOf(cur);
      const belowId = skipListNodeId(level - 1, curValue);
      const dropEdgeId = `drop_${level}_${curValue}`;
      edgeStates[dropEdgeId] = "tree";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `レベル${level}でこれ以上右に進めない → 1つ下のレベル${level - 1}に降りる`,
      });
      cur = belowId;
      nodeStates[cur] = "visited";
    }
  }

  const found = valueOf(cur) === target;
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。値${target}を${found ? "発見" : "発見できず"}(最下位レベル0で最終確認)`,
  });

  return frames;
}

/** PageRank・HITSのデモ用有向グラフ。DがCにリンクするが誰からもリンクされない(ぶら下がりに近い)頂点を含む。 */
export const RANKING_GRAPH_NODES: GraphNode[] = circleLayout(["A", "B", "C", "D"]);
export const RANKING_GRAPH_EDGES: GraphEdge[] = [
  { id: "AB", from: "A", to: "B", weight: 1 },
  { id: "AC", from: "A", to: "C", weight: 1 },
  { id: "BC", from: "B", to: "C", weight: 1 },
  { id: "CA", from: "C", to: "A", weight: 1 },
  { id: "DC", from: "D", to: "C", weight: 1 },
];
export const PAGERANK_DAMPING = 0.85;
export const PAGERANK_ITERATIONS = 8;

/**
 * PageRankのステップ列を生成する。「重要な頂点からリンクされている頂点は重要」という
 * 再帰的な定義を、初期値を全頂点で均等にした上で反復的に更新することで固有ベクトルに
 * 収束させる(べき乗法)。ダンピング係数dは「確率1-dでランダムな頂点にジャンプする」
 * という項を加えることで、リンクの閉路だけでスコアが集中してしまう問題を防いでいる。
 */
export function pagerankSteps(): GraphFrame[] {
  const nodes = RANKING_GRAPH_NODES;
  const edges = RANKING_GRAPH_EDGES;
  const n = nodes.length;
  const d = PAGERANK_DAMPING;

  const outDegree = new Map<string, number>();
  nodes.forEach((node) => {
    outDegree.set(node.id, edges.filter((e) => e.from === node.id).length);
  });
  const incoming = new Map<string, string[]>();
  nodes.forEach((node) => incoming.set(node.id, []));
  edges.forEach((e) => incoming.get(e.to)!.push(e.from));

  let rank = new Map<string, number>();
  nodes.forEach((node) => rank.set(node.id, 1 / n));

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const rankDisplay = (): Record<string, number | null> =>
    Object.fromEntries(nodes.map((n2) => [n2.id, Number(rank.get(n2.id)!.toFixed(4))]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: rankDisplay(),
      description: `PageRankを開始。全頂点のランクを均等(1/${n})に初期化。ダンピング係数d=${d}(頂点下の数字がランク)`,
    },
  ];

  for (let iter = 1; iter <= PAGERANK_ITERATIONS; iter++) {
    const next = new Map<string, number>();
    nodes.forEach((node) => {
      const inSum = incoming
        .get(node.id)!
        .reduce((sum, from) => sum + rank.get(from)! / outDegree.get(from)!, 0);
      next.set(node.id, (1 - d) / n + d * inSum);
    });
    rank = next;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: rankDisplay(),
      description: `[反復${iter}] 各頂点のランク = (1-d)/N + d×Σ(リンク元のランク/リンク元の出次数)`,
    });
  }

  nodes.forEach((node) => {
    nodeStates[node.id] = "settled";
  });
  const ranked = [...rank.entries()].sort((a, b) => b[1] - a[1]);
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: rankDisplay(),
    description: `計算完了(${PAGERANK_ITERATIONS}回反復)。ランキング: ${ranked.map(([id, r]) => `${id}(${r.toFixed(4)})`).join(" > ")}`,
  });

  return frames;
}

export const HITS_ITERATIONS = 6;

/**
 * HITS(Hyperlink-Induced Topic Search)のステップ列を生成する。「良いハブ(良いオーソリティに
 * 数多くリンクしている頂点)」と「良いオーソリティ(良いハブから数多くリンクされている頂点)」
 * を相互に定義し、authority(p) = Σ hub(q)(pへリンクするq)、hub(p) = Σ authority(q)
 * (pがリンクするq)という2つの更新を交互に繰り返す。発散を防ぐため毎回正規化(2乗和の平方根で割る)する。
 * PageRankと同じグラフを使うことで、リンク構造の中心性を測る2つのアプローチの違いを対比できる。
 */
export function hitsSteps(): GraphFrame[] {
  const nodes = RANKING_GRAPH_NODES;
  const edges = RANKING_GRAPH_EDGES;

  let hub = new Map<string, number>();
  let authority = new Map<string, number>();
  nodes.forEach((node) => {
    hub.set(node.id, 1);
    authority.set(node.id, 1);
  });

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const display = (m: Map<string, number>): Record<string, number | null> =>
    Object.fromEntries(nodes.map((n2) => [n2.id, Number(m.get(n2.id)!.toFixed(4))]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: display(hub),
      description: "HITSを開始。全頂点のhub値・authority値を1に初期化(頂点下の数字はhub値)",
    },
  ];

  const normalize = (m: Map<string, number>) => {
    const norm = Math.sqrt([...m.values()].reduce((s, v) => s + v * v, 0));
    m.forEach((v, k) => m.set(k, norm === 0 ? 0 : v / norm));
  };

  for (let iter = 1; iter <= HITS_ITERATIONS; iter++) {
    const newAuthority = new Map<string, number>();
    nodes.forEach((node) => {
      const inSum = edges.filter((e) => e.to === node.id).reduce((s, e) => s + hub.get(e.from)!, 0);
      newAuthority.set(node.id, inSum);
    });
    normalize(newAuthority);
    authority = newAuthority;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: display(authority),
      description: `[反復${iter}] authority値を更新(頂点下の数字はauthority値): 自分にリンクする頂点のhub値の合計を正規化`,
    });

    const newHub = new Map<string, number>();
    nodes.forEach((node) => {
      const outSum = edges.filter((e) => e.from === node.id).reduce((s, e) => s + authority.get(e.to)!, 0);
      newHub.set(node.id, outSum);
    });
    normalize(newHub);
    hub = newHub;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: display(hub),
      description: `[反復${iter}] hub値を更新(頂点下の数字はhub値): 自分がリンクする頂点のauthority値の合計を正規化`,
    });
  }

  nodes.forEach((node) => {
    nodeStates[node.id] = "settled";
  });
  const rankedAuth = [...authority.entries()].sort((a, b) => b[1] - a[1]);
  const rankedHub = [...hub.entries()].sort((a, b) => b[1] - a[1]);
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: display(authority),
    description: `計算完了(${HITS_ITERATIONS}回反復)。authorityランキング: ${rankedAuth.map(([id, v]) => `${id}(${v.toFixed(3)})`).join(" > ")} / hubランキング: ${rankedHub.map(([id, v]) => `${id}(${v.toFixed(3)})`).join(" > ")}`,
  });

  return frames;
}

/** 一貫性ハッシュ法のデモ用データ。ハッシュ空間はリング状の0〜99。 */
export const CONSISTENT_HASHING_RING_SIZE = 100;
export const CONSISTENT_HASHING_SERVERS: { id: string; hash: number }[] = [
  { id: "S1", hash: 10 },
  { id: "S2", hash: 35 },
  { id: "S3", hash: 60 },
  { id: "S4", hash: 85 },
];
export const CONSISTENT_HASHING_KEYS: { id: string; hash: number }[] = [
  { id: "K1", hash: 5 },
  { id: "K2", hash: 20 },
  { id: "K3", hash: 40 },
  { id: "K4", hash: 55 },
  { id: "K5", hash: 70 },
  { id: "K6", hash: 90 },
];
export const CONSISTENT_HASHING_NEW_SERVER = { id: "S5", hash: 48 };

function consistentHashingPosition(hash: number): { x: number; y: number } {
  const angle = (hash / CONSISTENT_HASHING_RING_SIZE) * Math.PI * 2 - Math.PI / 2;
  return { x: 0.5 + 0.4 * Math.cos(angle), y: 0.5 + 0.42 * Math.sin(angle) };
}

export const CONSISTENT_HASHING_NODES: GraphNode[] = [
  ...CONSISTENT_HASHING_SERVERS.map((s) => ({ id: s.id, label: s.id, ...consistentHashingPosition(s.hash) })),
  { id: CONSISTENT_HASHING_NEW_SERVER.id, label: CONSISTENT_HASHING_NEW_SERVER.id, ...consistentHashingPosition(CONSISTENT_HASHING_NEW_SERVER.hash) },
  ...CONSISTENT_HASHING_KEYS.map((k) => ({ id: k.id, label: k.id, ...consistentHashingPosition(k.hash) })),
];
export const CONSISTENT_HASHING_EDGES: GraphEdge[] = CONSISTENT_HASHING_KEYS.map((k) => ({
  id: `${k.id}-edge`,
  from: k.id,
  to: "S1",
  weight: 1,
}));

function assignServer(keyHash: number, servers: { id: string; hash: number }[]): string {
  const sorted = [...servers].sort((a, b) => a.hash - b.hash);
  const found = sorted.find((s) => s.hash >= keyHash);
  return (found ?? sorted[0]).id;
}

/**
 * 一貫性ハッシュ法のステップ列を生成する。サーバーとキーを同じハッシュ空間の環(リング)上に
 * 配置し、各キーは「時計回りに最初に出会うサーバー」に割り当てる。単純な mod N ハッシュだと
 * サーバー台数Nが変わるたびにほぼ全てのキーの担当が変わってしまうが、リング上での割り当てなら
 * 新しいサーバーを追加したとき、そのサーバーの直前の区間に属していたキーだけが再配置されれば済む
 * (残りのキーは担当が変わらない)——分散キャッシュやDHTで再配置コストを最小化できる理由がここにある。
 */
export function consistentHashingSteps(): GraphFrame[] {
  const nodes = CONSISTENT_HASHING_NODES.filter((n) => n.id !== CONSISTENT_HASHING_NEW_SERVER.id);
  const edges = CONSISTENT_HASHING_EDGES;
  const ringSize = CONSISTENT_HASHING_RING_SIZE;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  CONSISTENT_HASHING_SERVERS.forEach((s) => {
    nodeStates[s.id] = "settled";
  });

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `一貫性ハッシュ法を開始。ハッシュ空間0〜${ringSize - 1}をリング状に扱い、サーバー${CONSISTENT_HASHING_SERVERS.map((s) => `${s.id}(${s.hash})`).join(", ")}を配置`,
    },
  ];

  const assignments = new Map<string, string>();
  for (const key of CONSISTENT_HASHING_KEYS) {
    const server = assignServer(key.hash, CONSISTENT_HASHING_SERVERS);
    assignments.set(key.id, server);
    edgeStates[`${key.id}-edge`] = "tree";
    nodeStates[key.id] = "visited";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `キー${key.id}(ハッシュ${key.hash})を時計回りに進めて最初に出会うサーバー${server}に割り当て`,
    });
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `初期割り当て完了: ${[...assignments.entries()].map(([k, s]) => `${k}→${s}`).join(", ")}`,
  });

  const allServers = [...CONSISTENT_HASHING_SERVERS, CONSISTENT_HASHING_NEW_SERVER];
  const newNodeStates = initNodeStates(CONSISTENT_HASHING_NODES, "idle");
  Object.assign(newNodeStates, nodeStates);
  newNodeStates[CONSISTENT_HASHING_NEW_SERVER.id] = "settled";
  const newEdgeStates = { ...edgeStates };

  const framesAfterAdd: GraphFrame[] = [
    {
      nodeStates: { ...newNodeStates },
      edgeStates: { ...newEdgeStates },
      distances: {},
      description: `新サーバー${CONSISTENT_HASHING_NEW_SERVER.id}(ハッシュ${CONSISTENT_HASHING_NEW_SERVER.hash})をリングに追加`,
    },
  ];

  let movedCount = 0;
  for (const key of CONSISTENT_HASHING_KEYS) {
    const newServer = assignServer(key.hash, allServers);
    const oldServer = assignments.get(key.id)!;
    if (newServer !== oldServer) {
      movedCount++;
      newEdgeStates[`${key.id}-edge`] = "relaxed";
      framesAfterAdd.push({
        nodeStates: { ...newNodeStates },
        edgeStates: { ...newEdgeStates },
        distances: {},
        description: `キー${key.id}(ハッシュ${key.hash})の担当が${oldServer}→${newServer}に変わる(新サーバーの直前の区間に入ったため)`,
      });
    } else {
      framesAfterAdd.push({
        nodeStates: { ...newNodeStates },
        edgeStates: { ...newEdgeStates },
        distances: {},
        description: `キー${key.id}(ハッシュ${key.hash})の担当は${oldServer}のまま変わらない`,
      });
    }
  }

  framesAfterAdd.push({
    nodeStates: { ...newNodeStates },
    edgeStates: { ...newEdgeStates },
    distances: {},
    description: `計算完了。サーバー追加により再配置されたキーは${movedCount}/${CONSISTENT_HASHING_KEYS.length}件のみ(単純なmod Nハッシュならほぼ全件が再配置されていたはず)`,
  });

  return [...frames, ...framesAfterAdd];
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

/** CLRS(Cormen等)の教科書に登場する古典的な最大流ネットワーク例。既知の最大流=23。 */
export const FLOW_NODES: GraphNode[] = circleLayout(["S", "V1", "V2", "V3", "V4", "T"]);
export const FLOW_EDGES: GraphEdge[] = [
  { id: "S-V1", from: "S", to: "V1", weight: 16 },
  { id: "S-V2", from: "S", to: "V2", weight: 13 },
  { id: "V1-V3", from: "V1", to: "V3", weight: 12 },
  { id: "V2-V1", from: "V2", to: "V1", weight: 4 },
  { id: "V3-V2", from: "V3", to: "V2", weight: 9 },
  { id: "V2-V4", from: "V2", to: "V4", weight: 14 },
  { id: "V4-V3", from: "V4", to: "V3", weight: 7 },
  { id: "V3-T", from: "V3", to: "T", weight: 20 },
  { id: "V4-T", from: "V4", to: "T", weight: 4 },
];
const FLOW_SOURCE = "S";
const FLOW_SINK = "T";

/**
 * Edmonds-Karp法(BFSで最短の増加パスを毎回探すFord-Fulkerson法)のステップ列を生成する。
 * 各辺の残余容量は「まだ流せる分(容量-現在の流量)」だけでなく、「今まで流した分を打ち消せる分」
 * (逆向きの残余辺)も含めて計算する——この残余グラフの考え方こそがFord-Fulkerson系アルゴリズムの核心であり、
 * 一度選んだ増加パスが必ずしも最終的な最大流の一部になるとは限らないことを可能にする実装になっている。
 * ただしこのグラフ・このBFS順序では、たまたま全ての増加パスが順方向の辺だけで構成され、
 * 逆向きの残余辺(既存の流れを打ち消す操作)は実際には使われずに最大流23が求まる
 * (node --experimental-strip-typesでの直接実行で確認済み)。
 */
export function edmondsKarpSteps(): GraphFrame[] {
  const nodes = FLOW_NODES;
  const edges = FLOW_EDGES;

  const realCapacity = new Map<string, number>();
  const flow = new Map<string, number>();
  for (const e of edges) {
    realCapacity.set(`${e.from}->${e.to}`, e.weight);
    flow.set(`${e.from}->${e.to}`, 0);
  }

  const adjacency = new Map<string, Set<string>>();
  const addAdjacency = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  for (const e of edges) {
    addAdjacency(e.from, e.to);
    addAdjacency(e.to, e.from);
  }

  const residualCap = (a: string, b: string): number => {
    if (realCapacity.has(`${a}->${b}`)) {
      return realCapacity.get(`${a}->${b}`)! - flow.get(`${a}->${b}`)!;
    }
    if (realCapacity.has(`${b}->${a}`)) {
      return flow.get(`${b}->${a}`)!;
    }
    return 0;
  };

  const pushFlow = (a: string, b: string, amount: number) => {
    if (realCapacity.has(`${a}->${b}`)) {
      flow.set(`${a}->${b}`, flow.get(`${a}->${b}`)! + amount);
    } else {
      flow.set(`${b}->${a}`, flow.get(`${b}->${a}`)! - amount);
    }
  };

  const edgeIdBetween = (a: string, b: string): string => {
    const forward = edges.find((e) => e.from === a && e.to === b);
    const backward = edges.find((e) => e.from === b && e.to === a);
    return (forward ?? backward)!.id;
  };

  const bfsAugmentingPath = (): string[] | null => {
    const parent = new Map<string, string>();
    const visited = new Set<string>([FLOW_SOURCE]);
    const queue: string[] = [FLOW_SOURCE];
    while (queue.length > 0) {
      const u = queue.shift()!;
      if (u === FLOW_SINK) break;
      for (const v of adjacency.get(u) ?? []) {
        if (visited.has(v) || residualCap(u, v) <= 0) continue;
        visited.add(v);
        parent.set(v, u);
        queue.push(v);
      }
    }
    if (!visited.has(FLOW_SINK)) return null;
    const path: string[] = [FLOW_SINK];
    let cur = FLOW_SINK;
    while (cur !== FLOW_SOURCE) {
      cur = parent.get(cur)!;
      path.push(cur);
    }
    path.reverse();
    return path;
  };

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const currentLabels = (): Record<string, string> =>
    Object.fromEntries(edges.map((e) => [e.id, `${flow.get(`${e.from}->${e.to}`)}/${e.weight}`]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: currentLabels(),
      description: "各辺のラベルを「現在の流量/容量」で表示。Edmonds-Karp法(BFSで最短の増加パスを探す)を開始",
    },
  ];

  let totalFlow = 0;
  let round = 0;
  for (;;) {
    const path = bfsAugmentingPath();
    if (!path) break;
    round++;

    const pathNodeStates = { ...nodeStates };
    path.forEach((n) => {
      pathNodeStates[n] = "visited";
    });
    const pathEdgeStates = { ...edgeStates };
    const pathEdgeIds: string[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const id = edgeIdBetween(path[i], path[i + 1]);
      pathEdgeIds.push(id);
      pathEdgeStates[id] = "checking";
    }
    frames.push({
      nodeStates: pathNodeStates,
      edgeStates: pathEdgeStates,
      distances: {},
      edgeLabels: currentLabels(),
      description: `[ラウンド${round}] BFSで増加パス ${path.join("→")} を発見`,
    });

    let bottleneck = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      bottleneck = Math.min(bottleneck, residualCap(path[i], path[i + 1]));
    }
    for (let i = 0; i < path.length - 1; i++) {
      pushFlow(path[i], path[i + 1], bottleneck);
    }
    totalFlow += bottleneck;

    const afterEdgeStates = { ...edgeStates };
    pathEdgeIds.forEach((id) => {
      afterEdgeStates[id] = "relaxed";
    });
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: afterEdgeStates,
      distances: {},
      edgeLabels: currentLabels(),
      description: `ボトルネック容量${bottleneck}だけ流量を増加(累計流量: ${totalFlow})`,
    });
  }

  nodes.forEach((n) => {
    nodeStates[n.id] = "settled";
  });
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: currentLabels(),
    description: `計算完了。最大流は${totalFlow}(ソースからシンクへの増加パスがこれ以上見つからない)`,
  });

  return frames;
}

/**
 * Ford-Fulkerson法のステップ列を生成する。Edmonds-Karp法(BFSで最短の増加パスを探す)との
 * 違いは増加パスの探し方だけで、残余グラフの考え方(residualCap/pushFlow)は共通。
 * ここではDFSで見つかった最初の増加パスをそのまま使う——BFSと違って最短パスとは限らないため、
 * 一般には増加パスの本数が増えやすく(最悪ケースの反復回数は容量の値に依存しうる)、
 * Edmonds-Karp法がFord-Fulkerson法の「BFS版」として計算量を多項式に抑える改良である
 * ことを対比できる。同じ最大流ネットワーク(既知の最大流=23)を使う。
 */
export function fordFulkersonSteps(): GraphFrame[] {
  const nodes = FLOW_NODES;
  const edges = FLOW_EDGES;

  const realCapacity = new Map<string, number>();
  const flow = new Map<string, number>();
  for (const e of edges) {
    realCapacity.set(`${e.from}->${e.to}`, e.weight);
    flow.set(`${e.from}->${e.to}`, 0);
  }

  const adjacency = new Map<string, Set<string>>();
  const addAdjacency = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  for (const e of edges) {
    addAdjacency(e.from, e.to);
    addAdjacency(e.to, e.from);
  }

  const residualCap = (a: string, b: string): number => {
    if (realCapacity.has(`${a}->${b}`)) {
      return realCapacity.get(`${a}->${b}`)! - flow.get(`${a}->${b}`)!;
    }
    if (realCapacity.has(`${b}->${a}`)) {
      return flow.get(`${b}->${a}`)!;
    }
    return 0;
  };

  const pushFlow = (a: string, b: string, amount: number) => {
    if (realCapacity.has(`${a}->${b}`)) {
      flow.set(`${a}->${b}`, flow.get(`${a}->${b}`)! + amount);
    } else {
      flow.set(`${b}->${a}`, flow.get(`${b}->${a}`)! - amount);
    }
  };

  const edgeIdBetween = (a: string, b: string): string => {
    const forward = edges.find((e) => e.from === a && e.to === b);
    const backward = edges.find((e) => e.from === b && e.to === a);
    return (forward ?? backward)!.id;
  };

  const dfsAugmentingPath = (): string[] | null => {
    const visited = new Set<string>([FLOW_SOURCE]);
    const path: string[] = [FLOW_SOURCE];
    const walk = (u: string): boolean => {
      if (u === FLOW_SINK) return true;
      for (const v of adjacency.get(u) ?? []) {
        if (visited.has(v) || residualCap(u, v) <= 0) continue;
        visited.add(v);
        path.push(v);
        if (walk(v)) return true;
        path.pop();
      }
      return false;
    };
    return walk(FLOW_SOURCE) ? path : null;
  };

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const currentLabels = (): Record<string, string> =>
    Object.fromEntries(edges.map((e) => [e.id, `${flow.get(`${e.from}->${e.to}`)}/${e.weight}`]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: currentLabels(),
      description: "各辺のラベルを「現在の流量/容量」で表示。Ford-Fulkerson法(DFSで増加パスを探す)を開始",
    },
  ];

  let totalFlow = 0;
  let round = 0;
  for (;;) {
    const path = dfsAugmentingPath();
    if (!path) break;
    round++;

    const pathNodeStates = { ...nodeStates };
    path.forEach((n) => {
      pathNodeStates[n] = "visited";
    });
    const pathEdgeStates = { ...edgeStates };
    const pathEdgeIds: string[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const id = edgeIdBetween(path[i], path[i + 1]);
      pathEdgeIds.push(id);
      pathEdgeStates[id] = "checking";
    }
    frames.push({
      nodeStates: pathNodeStates,
      edgeStates: pathEdgeStates,
      distances: {},
      edgeLabels: currentLabels(),
      description: `[ラウンド${round}] DFSで増加パス ${path.join("→")} を発見`,
    });

    let bottleneck = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      bottleneck = Math.min(bottleneck, residualCap(path[i], path[i + 1]));
    }
    for (let i = 0; i < path.length - 1; i++) {
      pushFlow(path[i], path[i + 1], bottleneck);
    }
    totalFlow += bottleneck;

    const afterEdgeStates = { ...edgeStates };
    pathEdgeIds.forEach((id) => {
      afterEdgeStates[id] = "relaxed";
    });
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: afterEdgeStates,
      distances: {},
      edgeLabels: currentLabels(),
      description: `ボトルネック容量${bottleneck}だけ流量を増加(累計流量: ${totalFlow})`,
    });
  }

  nodes.forEach((n) => {
    nodeStates[n.id] = "settled";
  });
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: currentLabels(),
    description: `計算完了。最大流は${totalFlow}(ソースからシンクへの増加パスがこれ以上見つからない)`,
  });

  return frames;
}

/**
 * Dinic法のステップ列を生成する。Edmonds-Karp法が「1回のBFSにつき増加パス1本」なのに対し、
 * Dinic法は「BFSでレベルグラフ(各頂点のソースからの距離)を1回構築したら、
 * そのレベルグラフ上でDFSを使い、レベルが1ずつ増える辺だけを辿って複数の増加パスを
 * 一気に(ブロッキングフローとして)流す」という2段階を繰り返す。
 * 1フェーズで複数の増加パスをまとめて処理できるため、一般にEdmonds-Karp法より高速。
 * 同じ最大流ネットワーク(既知の最大流=23)を使い、既存のGraphFrame.edgeLabels基盤を再利用する。
 */
export function dinicSteps(): GraphFrame[] {
  const nodes = FLOW_NODES;
  const edges = FLOW_EDGES;

  const realCapacity = new Map<string, number>();
  const flow = new Map<string, number>();
  for (const e of edges) {
    realCapacity.set(`${e.from}->${e.to}`, e.weight);
    flow.set(`${e.from}->${e.to}`, 0);
  }

  const adjacency = new Map<string, string[]>();
  const addAdjacency = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a)!.push(b);
  };
  for (const e of edges) {
    addAdjacency(e.from, e.to);
    addAdjacency(e.to, e.from);
  }

  const residualCap = (a: string, b: string): number => {
    if (realCapacity.has(`${a}->${b}`)) {
      return realCapacity.get(`${a}->${b}`)! - flow.get(`${a}->${b}`)!;
    }
    if (realCapacity.has(`${b}->${a}`)) {
      return flow.get(`${b}->${a}`)!;
    }
    return 0;
  };
  const pushFlow = (a: string, b: string, amount: number) => {
    if (realCapacity.has(`${a}->${b}`)) {
      flow.set(`${a}->${b}`, flow.get(`${a}->${b}`)! + amount);
    } else {
      flow.set(`${b}->${a}`, flow.get(`${b}->${a}`)! - amount);
    }
  };

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const currentLabels = (): Record<string, string> =>
    Object.fromEntries(edges.map((e) => [e.id, `${flow.get(`${e.from}->${e.to}`)}/${e.weight}`]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: currentLabels(),
      description:
        "Dinic法を開始。BFSでレベルグラフを構築してからDFSでブロッキングフローを一気に流す、という2段階を繰り返す",
    },
  ];

  const bfsLevels = (): Map<string, number> | null => {
    const level = new Map<string, number>();
    level.set(FLOW_SOURCE, 0);
    const queue: string[] = [FLOW_SOURCE];
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const v of adjacency.get(u) ?? []) {
        if (level.has(v) || residualCap(u, v) <= 0) continue;
        level.set(v, level.get(u)! + 1);
        queue.push(v);
      }
    }
    return level.has(FLOW_SINK) ? level : null;
  };

  let totalFlow = 0;
  let phase = 0;
  for (;;) {
    const level = bfsLevels();
    if (!level) break;
    phase++;

    const levelDesc = [...level.entries()].map(([k, v]) => `${k}=${v}`).join(", ");
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: currentLabels(),
      description: `[フェーズ${phase}] BFSでレベルグラフを計算: ${levelDesc}`,
    });

    const iter = new Map<string, number>();
    const dfs = (u: string, pushed: number): number => {
      if (u === FLOW_SINK) return pushed;
      const neighbors = adjacency.get(u) ?? [];
      let idx = iter.get(u) ?? 0;
      for (; idx < neighbors.length; idx++) {
        const v = neighbors[idx];
        if ((level.get(v) ?? -1) !== (level.get(u) ?? -1) + 1 || residualCap(u, v) <= 0) continue;
        const result = dfs(v, Math.min(pushed, residualCap(u, v)));
        if (result > 0) {
          iter.set(u, idx);
          pushFlow(u, v, result);
          return result;
        }
      }
      iter.set(u, neighbors.length);
      return 0;
    };

    let phaseFlow = 0;
    for (;;) {
      const pushed = dfs(FLOW_SOURCE, Infinity);
      if (pushed === 0) break;
      phaseFlow += pushed;
      totalFlow += pushed;
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        edgeLabels: currentLabels(),
        description: `[フェーズ${phase}] ブロッキングフローに${pushed}を追加(累計流量: ${totalFlow})`,
      });
    }

    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: currentLabels(),
      description: `[フェーズ${phase}] ブロッキングフロー完了(このフェーズで${phaseFlow}増加)。次のフェーズへ`,
    });
  }

  nodes.forEach((n) => {
    nodeStates[n.id] = "settled";
  });
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: currentLabels(),
    description: `計算完了。最大流は${totalFlow}`,
  });

  return frames;
}

/**
 * 二部グラフの最大マッチング例(CLRSの教科書に登場する古典的な例)。
 * L1はR1・R2の両方と、L3はR2・R3の両方とつながっており、
 * L2はR1としかつながっていない。貪欲に左から順にマッチさせると
 * L1-R1、L2は行き場を失い、L3-R2が決まってR3が余る、という準最適な結果になりがちだが、
 * 実際の最大マッチングは3組全て(L1-R2、L2-R1、L3-R3)であり、
 * それを見つけるには「L2から始まり、既存のマッチングを1つ迂回する」長さ5の増加パスが必要になる
 * ——ホップクロフト・カープ法が単純な貪欲法より賢い理由を体感できる最小の例になっている。
 */
export const BIPARTITE_L_IDS = ["L1", "L2", "L3"];
export const BIPARTITE_R_IDS = ["R1", "R2", "R3"];
export const BIPARTITE_NODES: GraphNode[] = [
  ...BIPARTITE_L_IDS.map((id, i) => ({ id, label: id, x: 0.22, y: 0.2 + i * 0.3 })),
  ...BIPARTITE_R_IDS.map((id, i) => ({ id, label: id, x: 0.78, y: 0.2 + i * 0.3 })),
];
export const BIPARTITE_EDGES: GraphEdge[] = [
  { id: "L1-R1", from: "L1", to: "R1", weight: 1 },
  { id: "L1-R2", from: "L1", to: "R2", weight: 1 },
  { id: "L2-R1", from: "L2", to: "R1", weight: 1 },
  { id: "L3-R2", from: "L3", to: "R2", weight: 1 },
  { id: "L3-R3", from: "L3", to: "R3", weight: 1 },
];
const HOPCROFT_KARP_NIL = "NIL";

/**
 * ホップクロフト・カープ法のステップ列を生成する。Ford-Fulkerson系アルゴリズムと同じ
 * 「増加パスを見つけてはマッチングを反転する」という発想を土台にしつつ、二部グラフという
 * 構造に特化し、1フェーズで複数の増加パスをまとめて処理することで高速化する:
 * (1) BFSで、未マッチの左頂点から到達できる最短の増加パス長(レイヤー)を全頂点に割り当てる、
 * (2) そのレイヤーに沿ったDFSで、互いに頂点が重ならない増加パスをできるだけ多く同時に見つける、
 * (3) 見つけた全てのパスに沿ってマッチングを反転する——という3ステップを1フェーズとして繰り返す。
 * Dinic法の「BFSでレベルグラフ→DFSでブロッキングフロー」という2段階構成と同型であることが分かる。
 */
export function hopcroftKarpSteps(): GraphFrame[] {
  const nodes = BIPARTITE_NODES;
  const edges = BIPARTITE_EDGES;

  const adjacency = new Map<string, string[]>();
  BIPARTITE_L_IDS.forEach((l) =>
    adjacency.set(l, edges.filter((e) => e.from === l).map((e) => e.to)),
  );

  const matchL = new Map<string, string | null>();
  const matchR = new Map<string, string | null>();
  BIPARTITE_L_IDS.forEach((l) => matchL.set(l, null));
  BIPARTITE_R_IDS.forEach((r) => matchR.set(r, null));

  const edgeIdBetween = (l: string, r: string): string =>
    edges.find((e) => e.from === l && e.to === r)!.id;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const blankLabels = (): Record<string, string> =>
    Object.fromEntries(edges.map((e) => [e.id, ""]));

  const syncMatchedStates = () => {
    BIPARTITE_L_IDS.forEach((l) => {
      nodeStates[l] = matchL.get(l) ? "settled" : "idle";
    });
    BIPARTITE_R_IDS.forEach((r) => {
      nodeStates[r] = matchR.get(r) ? "settled" : "idle";
    });
    for (const e of edges) {
      edgeStates[e.id] = matchL.get(e.from) === e.to ? "tree" : "idle";
    }
  };

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: blankLabels(),
      description:
        "二部グラフの最大マッチングを求めるホップクロフト・カープ法を開始。左側L1〜L3・右側R1〜R3のどのペアも未マッチの状態",
    },
  ];

  let phase = 0;
  for (;;) {
    const dist = new Map<string, number>();
    const queue: string[] = [];
    BIPARTITE_L_IDS.forEach((l) => {
      if (!matchL.get(l)) {
        dist.set(l, 0);
        queue.push(l);
      } else {
        dist.set(l, Infinity);
      }
    });
    dist.set(HOPCROFT_KARP_NIL, Infinity);
    while (queue.length > 0) {
      const l = queue.shift()!;
      if (dist.get(l)! < dist.get(HOPCROFT_KARP_NIL)!) {
        for (const r of adjacency.get(l) ?? []) {
          const u = matchR.get(r) ?? HOPCROFT_KARP_NIL;
          if ((dist.get(u) ?? Infinity) === Infinity) {
            dist.set(u, dist.get(l)! + 1);
            if (u !== HOPCROFT_KARP_NIL) queue.push(u);
          }
        }
      }
    }
    if (dist.get(HOPCROFT_KARP_NIL) === Infinity) break;
    phase++;

    const distDisplay: Record<string, number | null> = {};
    BIPARTITE_L_IDS.forEach((l) => {
      const d = dist.get(l);
      distDisplay[l] = d === undefined || d === Infinity ? null : d;
    });
    syncMatchedStates();
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: distDisplay,
      edgeLabels: blankLabels(),
      description: `[フェーズ${phase}] BFSで未マッチ頂点からの最短増加パス長を計算(頂点下の数字がレイヤー)`,
    });

    let phaseAugmented = 0;
    const dfs = (l: string): boolean => {
      for (const r of adjacency.get(l) ?? []) {
        const u = matchR.get(r) ?? HOPCROFT_KARP_NIL;
        const eid = edgeIdBetween(l, r);
        const edgeSnapshot = { ...edgeStates };
        edgeSnapshot[eid] = "checking";
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: edgeSnapshot,
          distances: distDisplay,
          edgeLabels: blankLabels(),
          description: `頂点${l}から辺${l}-${r}を検討(${r}の現在のマッチ相手: ${matchR.get(r) ?? "なし"})`,
        });
        if ((dist.get(u) ?? Infinity) === dist.get(l)! + 1) {
          if (u === HOPCROFT_KARP_NIL || dfs(u)) {
            matchL.set(l, r);
            matchR.set(r, l);
            return true;
          }
        }
      }
      dist.set(l, Infinity);
      return false;
    };

    BIPARTITE_L_IDS.forEach((l) => {
      if (!matchL.get(l)) {
        const augmented = dfs(l);
        if (augmented) {
          phaseAugmented++;
          syncMatchedStates();
          frames.push({
            nodeStates: { ...nodeStates },
            edgeStates: { ...edgeStates },
            distances: distDisplay,
            edgeLabels: blankLabels(),
            description: `頂点${l}から増加パスを発見しマッチングを反転(このフェーズで${phaseAugmented}本目)`,
          });
        }
      }
    });

    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: distDisplay,
      edgeLabels: blankLabels(),
      description: `[フェーズ${phase}] 完了。このフェーズで${phaseAugmented}本の増加パスをまとめて反映`,
    });
  }

  const totalMatching = [...matchL.values()].filter((v) => v !== null).length;
  syncMatchedStates();
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: blankLabels(),
    description: `計算完了。最大マッチングのサイズは${totalMatching}(これ以上増加パスが見つからない)`,
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
  "edmonds-karp": { nodes: FLOW_NODES, edges: FLOW_EDGES, directed: true },
  dinic: { nodes: FLOW_NODES, edges: FLOW_EDGES, directed: true },
  "ford-fulkerson": { nodes: FLOW_NODES, edges: FLOW_EDGES, directed: true },
  "hopcroft-karp": { nodes: BIPARTITE_NODES, edges: BIPARTITE_EDGES, directed: false },
  kahn: { nodes: SHORTEST_PATH_NODES, edges: SHORTEST_PATH_EDGES, directed: true },
  johnson: { nodes: SHORTEST_PATH_NODES, edges: SHORTEST_PATH_EDGES, directed: true },
  "huffman-coding": { nodes: HUFFMAN_NODES, edges: HUFFMAN_EDGES, directed: true },
  "floyd-cycle-detection": { nodes: CYCLE_DETECTION_NODES, edges: CYCLE_DETECTION_EDGES, directed: true },
  "segment-tree": { nodes: SEGMENT_TREE_GRAPH_NODES, edges: SEGMENT_TREE_GRAPH_EDGES, directed: true },
  "skip-list": { nodes: SKIP_LIST_NODES, edges: SKIP_LIST_EDGES, directed: true },
  pagerank: { nodes: RANKING_GRAPH_NODES, edges: RANKING_GRAPH_EDGES, directed: true },
  hits: { nodes: RANKING_GRAPH_NODES, edges: RANKING_GRAPH_EDGES, directed: true },
  "consistent-hashing": { nodes: CONSISTENT_HASHING_NODES, edges: CONSISTENT_HASHING_EDGES, directed: false },
};

export const GRAPH_VISUALIZERS: Record<string, () => GraphFrame[]> = {
  "bellman-ford": bellmanFordSteps,
  prim: primSteps,
  kruskal: kruskalSteps,
  "topological-sort": topologicalSortSteps,
  boruvka: boruvkaSteps,
  "union-find": unionFindSteps,
  "tarjan-scc": tarjanSccSteps,
  dinic: dinicSteps,
  "edmonds-karp": edmondsKarpSteps,
  "ford-fulkerson": fordFulkersonSteps,
  "hopcroft-karp": hopcroftKarpSteps,
  kahn: kahnSteps,
  johnson: johnsonSteps,
  "huffman-coding": huffmanCodingSteps,
  "floyd-cycle-detection": floydCycleDetectionSteps,
  "segment-tree": segmentTreeSteps,
  "skip-list": skipListSteps,
  pagerank: pagerankSteps,
  hits: hitsSteps,
  "consistent-hashing": consistentHashingSteps,
};
