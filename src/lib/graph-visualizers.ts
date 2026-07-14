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

/** ブリー・アルゴリズムのデモ用データ。P5(最大ID)が故障しており、P2が最初に検知して選挙を開始する。 */
export const BULLY_NODES: GraphNode[] = circleLayout(["P1", "P2", "P3", "P4", "P5"]);
export const BULLY_DOWN_NODE = "P5";
export const BULLY_INITIATOR = "P2";
export const BULLY_EDGES: GraphEdge[] = [
  { id: "P2-P3", from: "P2", to: "P3", weight: 1 },
  { id: "P2-P4", from: "P2", to: "P4", weight: 1 },
  { id: "P2-P5", from: "P2", to: "P5", weight: 1 },
  { id: "P3-P2", from: "P3", to: "P2", weight: 1 },
  { id: "P3-P4", from: "P3", to: "P4", weight: 1 },
  { id: "P3-P5", from: "P3", to: "P5", weight: 1 },
  { id: "P4-P3", from: "P4", to: "P3", weight: 1 },
  { id: "P4-P5", from: "P4", to: "P5", weight: 1 },
  { id: "P4-P1", from: "P4", to: "P1", weight: 1 },
  { id: "P4-P2", from: "P4", to: "P2", weight: 1 },
  { id: "P4-P3b", from: "P4", to: "P3", weight: 1 },
];

/**
 * ブリー・アルゴリズム(いじめっ子アルゴリズム)のステップ列を生成する。コーディネーターの
 * 故障を検知したプロセスが、自分より大きいIDを持つ全プロセスにELECTIONメッセージを送る。
 * 応答(OK)があれば、その応答者が代わりに選挙を続ける(自分は身を引く)。
 * 誰からも応答がなければ、それが現時点で生きている最大IDのプロセスということなので、
 * 自らコーディネーターを名乗り、全プロセスにCOORDINATORメッセージを broadcastする。
 * 「より大きいIDのプロセスが常に勝つ」ことから"いじめっ子"の名がついている。
 */
export function bullyAlgorithmSteps(): GraphFrame[] {
  const nodes = BULLY_NODES;
  const edges = BULLY_EDGES;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const edgeLabels: Record<string, string> = Object.fromEntries(edges.map((e) => [e.id, ""]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: `${BULLY_INITIATOR}がコーディネーター${BULLY_DOWN_NODE}の故障を検知し、選挙(ELECTION)を開始する`,
    },
  ];

  const sendMessage = (id: string, label: string, state: GraphEdgeState, description: string) => {
    edgeLabels[id] = label;
    edgeStates[id] = state;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description,
    });
  };

  nodeStates[BULLY_INITIATOR] = "visited";
  sendMessage("P2-P3", "ELECTION", "checking", "P2 → P3: ELECTION");
  sendMessage("P2-P4", "ELECTION", "checking", "P2 → P4: ELECTION");
  sendMessage("P2-P5", "ELECTION", "rejected", `P2 → P5: ELECTION(${BULLY_DOWN_NODE}は故障中のため応答なし)`);

  nodeStates.P3 = "visited";
  sendMessage("P3-P2", "OK", "tree", "P3 → P2: OK(P3の方がIDが大きいので選挙を引き継ぐ。P2はここで脱落)");
  sendMessage("P3-P4", "ELECTION", "checking", "P3 → P4: ELECTION");
  sendMessage("P3-P5", "ELECTION", "rejected", `P3 → P5: ELECTION(${BULLY_DOWN_NODE}は故障中のため応答なし)`);

  nodeStates.P4 = "visited";
  sendMessage("P4-P3", "OK", "tree", "P4 → P3: OK(P4の方がIDが大きいので選挙を引き継ぐ。P3はここで脱落)");
  sendMessage("P4-P5", "ELECTION", "rejected", `P4 → P5: ELECTION(${BULLY_DOWN_NODE}は故障中のため応答なし)`);

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: "P4はP5以外の誰からも応答を得られなかった(P5より大きいIDは存在しない) → P4が新コーディネーターを宣言",
  });

  nodeStates.P4 = "settled";
  sendMessage("P4-P1", "COORDINATOR", "tree", "P4 → P1: COORDINATOR(新コーディネーターを通知)");
  sendMessage("P4-P2", "COORDINATOR", "tree", "P4 → P2: COORDINATOR");
  sendMessage("P4-P3b", "COORDINATOR", "tree", "P4 → P3: COORDINATOR");

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: "計算完了。新コーディネーターはP4(生きているプロセスの中で最大のID)",
  });

  return frames;
}

/** 二相コミット(2PC)のデモ用データ。コーディネーターC + 参加者3台、全員が賛成する成功シナリオ。 */
export const TWO_PHASE_COMMIT_NODES: GraphNode[] = [
  { id: "C", label: "C", x: 0.5, y: 0.15 },
  { id: "P1", label: "P1", x: 0.2, y: 0.75 },
  { id: "P2", label: "P2", x: 0.5, y: 0.9 },
  { id: "P3", label: "P3", x: 0.8, y: 0.75 },
];
export const TWO_PHASE_COMMIT_PARTICIPANTS = ["P1", "P2", "P3"];
export const TWO_PHASE_COMMIT_EDGES: GraphEdge[] = TWO_PHASE_COMMIT_PARTICIPANTS.flatMap((p) => [
  { id: `C-${p}`, from: "C", to: p, weight: 1 },
  { id: `${p}-C`, from: p, to: "C", weight: 1 },
]);

/**
 * 二相コミット(2PC)のステップ列を生成する。分散トランザクションを「準備フェーズ」と
 * 「コミットフェーズ」の2段階に分けることで原子性(全員が反映するか、誰も反映しないかのどちらか)
 * を保証する。フェーズ1でコーディネーターが全参加者にPREPAREを送り、全員がYESと答えた場合のみ、
 * フェーズ2でCOMMITを送って確定させる(1つでもNOがあればABORTを送る)。
 * コーディネーターがフェーズ2の途中で故障すると、参加者は永久にブロックされうるという弱点がある。
 */
export function twoPhaseCommitSteps(): GraphFrame[] {
  const nodes = TWO_PHASE_COMMIT_NODES;
  const edges = TWO_PHASE_COMMIT_EDGES;
  const participants = TWO_PHASE_COMMIT_PARTICIPANTS;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const edgeLabels: Record<string, string> = Object.fromEntries(edges.map((e) => [e.id, ""]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: "二相コミットを開始。コーディネーターCが3台の参加者にトランザクションの実行を依頼する",
    },
  ];

  const sendMessage = (id: string, label: string, state: GraphEdgeState, description: string) => {
    edgeLabels[id] = label;
    edgeStates[id] = state;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description,
    });
  };

  nodeStates.C = "visited";
  for (const p of participants) {
    sendMessage(`C-${p}`, "PREPARE", "checking", `[フェーズ1] C → ${p}: PREPARE(準備できるか問い合わせ)`);
  }
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: "[フェーズ1] 全参加者がPREPAREを受信。各自ローカルでコミット可能かを検証する",
  });

  for (const p of participants) {
    nodeStates[p] = "visited";
    sendMessage(`${p}-C`, "YES", "tree", `[フェーズ1] ${p} → C: YES(コミット可能)`);
  }
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: "[フェーズ1完了] 全参加者がYESと回答 → Cはコミットを確定できると判断",
  });

  nodeStates.C = "settled";
  for (const p of participants) {
    sendMessage(`C-${p}`, "COMMIT", "tree", `[フェーズ2] C → ${p}: COMMIT(確定を指示)`);
    nodeStates[p] = "settled";
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: "計算完了。全参加者がCOMMITを受信し、トランザクションが原子的に確定した",
  });

  return frames;
}

/** Raft(簡略化リーダー選出のみ)のデモ用データ。N3が最初にタイムアウトし候補者になる。 */
export const RAFT_NODES: GraphNode[] = circleLayout(["N1", "N2", "N3", "N4", "N5"]);
export const RAFT_CANDIDATE = "N3";
export const RAFT_OTHERS = ["N1", "N2", "N4", "N5"];
export const RAFT_EDGES: GraphEdge[] = RAFT_OTHERS.map((n) => ({
  id: `${RAFT_CANDIDATE}-${n}`,
  from: RAFT_CANDIDATE,
  to: n,
  weight: 1,
}));

/**
 * Raft(簡略化してリーダー選出のみ)のステップ列を生成する。全ノードはフォロワーとして開始し、
 * 一定時間コーディネーターからの信号(ハートビート)が来ないとタイムアウトして候補者に昇格し、
 * 自分に投票した上で他の全ノードに投票を要求する(RequestVote)。
 * 過半数の票を得られれば新しい任期(term)のリーダーとなり、以後は定期的なハートビート
 * (AppendEntries)でリーダーであり続けることを他ノードに知らせる。
 * Paxosより「理解しやすい」ことを設計目標に掲げて生まれた合意アルゴリズム。
 */
export function raftSteps(): GraphFrame[] {
  const nodes = RAFT_NODES;
  const edges = RAFT_EDGES;
  const candidate = RAFT_CANDIDATE;
  const others = RAFT_OTHERS;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const edgeLabels: Record<string, string> = Object.fromEntries(edges.map((e) => [e.id, ""]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: "全ノードはフォロワーとして開始。誰もリーダーからのハートビートを受信していない",
    },
  ];

  const sendMessage = (id: string, label: string, state: GraphEdgeState, description: string) => {
    edgeLabels[id] = label;
    edgeStates[id] = state;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description,
    });
  };

  nodeStates[candidate] = "visited";
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: `${candidate}が最初にタイムアウトし、候補者(candidate)に昇格。新しい任期(term)を開始し、自分自身に投票する(1票)`,
  });

  for (const n of others) {
    sendMessage(`${candidate}-${n}`, "RequestVote", "checking", `${candidate} → ${n}: RequestVote(この任期での投票を要求)`);
  }

  let votes = 1;
  for (const n of others) {
    votes++;
    edgeLabels[`${candidate}-${n}`] = "VoteGranted";
    edgeStates[`${candidate}-${n}`] = "tree";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: `${n} → ${candidate}: VoteGranted(まだ今期投票していないので承認)。${candidate}の得票数=${votes}/${nodes.length}`,
    });
  }

  nodeStates[candidate] = "settled";
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: `${candidate}が過半数(${votes}/${nodes.length})の票を獲得 → リーダーに昇格`,
  });

  for (const n of others) {
    edgeLabels[`${candidate}-${n}`] = "Heartbeat";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: `${candidate} → ${n}: Heartbeat(AppendEntries、リーダーであり続けることを定期的に通知)`,
    });
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: `計算完了。新リーダーは${candidate}(得票${votes}/${nodes.length}で過半数を獲得)`,
  });

  return frames;
}

/** Paxos(単一ラウンドのBasic Paxosのみ)のデモ用データ。 */
export const PAXOS_NODES: GraphNode[] = [
  { id: "Pr", label: "Pr", x: 0.5, y: 0.15 },
  { id: "A1", label: "A1", x: 0.2, y: 0.75 },
  { id: "A2", label: "A2", x: 0.5, y: 0.9 },
  { id: "A3", label: "A3", x: 0.8, y: 0.75 },
];
export const PAXOS_ACCEPTORS = ["A1", "A2", "A3"];
export const PAXOS_PROPOSAL_NUMBER = 1;
export const PAXOS_VALUE = "X";
export const PAXOS_EDGES: GraphEdge[] = PAXOS_ACCEPTORS.map((a) => ({ id: `Pr-${a}`, from: "Pr", to: a, weight: 1 }));

/**
 * Paxos(単一ラウンドのBasic Paxosのみ)のステップ列を生成する。提案者(Proposer)は
 * 提案番号nを添えてPrepare(n)を過半数の受理者(Acceptor)に送る(フェーズ1)。
 * 受理者はnがこれまで見た中で最大なら、それ以前に受理していないことをPromiseで約束する。
 * 過半数からPromiseを得たら、提案者はAccept(n, value)を送り(フェーズ2)、
 * 受理者はPromiseを破っていなければAcceptedで応じる。過半数がAcceptedすれば、
 * その値は分散システム全体で合意されたことになる——一部のノードが故障・遅延しても
 * 全体の合意を保証できる、合意アルゴリズムの原典。
 */
export function paxosSteps(): GraphFrame[] {
  const nodes = PAXOS_NODES;
  const edges = PAXOS_EDGES;
  const acceptors = PAXOS_ACCEPTORS;
  const n = PAXOS_PROPOSAL_NUMBER;
  const value = PAXOS_VALUE;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const edgeLabels: Record<string, string> = Object.fromEntries(edges.map((e) => [e.id, ""]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: `Paxosを開始。提案者Prが値"${value}"を提案番号n=${n}で合意させようとする`,
    },
  ];

  const sendMessage = (id: string, label: string, state: GraphEdgeState, description: string) => {
    edgeLabels[id] = label;
    edgeStates[id] = state;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description,
    });
  };

  nodeStates.Pr = "visited";
  for (const a of acceptors) {
    sendMessage(`Pr-${a}`, `Prepare(${n})`, "checking", `[フェーズ1] Pr → ${a}: Prepare(${n})`);
  }

  let promises = 0;
  for (const a of acceptors) {
    promises++;
    nodeStates[a] = "visited";
    sendMessage(`Pr-${a}`, `Promise(${n})`, "tree", `[フェーズ1] ${a} → Pr: Promise(${n})(これより小さい提案番号は今後拒否すると約束)。約束数=${promises}/${acceptors.length}`);
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: `[フェーズ1完了] 過半数(${promises}/${acceptors.length})からPromiseを獲得 → フェーズ2に進める`,
  });

  for (const a of acceptors) {
    sendMessage(`Pr-${a}`, `Accept(${n},${value})`, "checking", `[フェーズ2] Pr → ${a}: Accept(${n}, "${value}")`);
  }

  let accepted = 0;
  for (const a of acceptors) {
    accepted++;
    nodeStates[a] = "settled";
    sendMessage(`Pr-${a}`, `Accepted(${n})`, "tree", `[フェーズ2] ${a} → Pr: Accepted(${n})(Promiseを破っていないので受理)。受理数=${accepted}/${acceptors.length}`);
  }

  nodeStates.Pr = "settled";
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: `計算完了。過半数(${accepted}/${acceptors.length})がAcceptedを返したため、値"${value}"が分散システム全体で合意された`,
  });

  return frames;
}

type VectorClockEvent = {
  process: string;
  kind: "local" | "send" | "receive";
  target?: string;
};

/** ベクタークロックのデモ用データ。P1↔P2、P2↔P3のメッセージ交換を含む7イベントの列。 */
export const VECTOR_CLOCK_PROCESSES = ["P1", "P2", "P3"];
export const VECTOR_CLOCK_EVENTS: VectorClockEvent[] = [
  { process: "P1", kind: "local" },
  { process: "P2", kind: "local" },
  { process: "P1", kind: "send", target: "P2" },
  { process: "P2", kind: "receive" },
  { process: "P3", kind: "local" },
  { process: "P2", kind: "send", target: "P3" },
  { process: "P3", kind: "receive" },
];
export const VECTOR_CLOCK_NODES: GraphNode[] = [
  { id: "P1", label: "P1", x: 0.2, y: 0.5 },
  { id: "P2", label: "P2", x: 0.5, y: 0.2 },
  { id: "P3", label: "P3", x: 0.8, y: 0.5 },
];
export const VECTOR_CLOCK_EDGES: GraphEdge[] = [
  { id: "P1-P2", from: "P1", to: "P2", weight: 1 },
  { id: "P2-P3", from: "P2", to: "P3", weight: 1 },
];

/**
 * ベクタークロックのステップ列を生成する。各プロセスがプロセス数と同じ長さのカウンタの組
 * (ベクタークロック)を持ち、(1) 何らかのイベント(ローカル処理・送信・受信)のたびに
 * 自分の担当する要素だけを+1し、(2) メッセージ受信時にはさらに、受信したベクタークロックとの
 * 要素ごとの最大値を取る、という2つの規則だけで更新する。2つのイベントのベクタークロックを
 * 比較し、一方が他方を要素ごとに全て以下(かつ完全に同一ではない)なら「片方がもう片方より先に
 * 起きたことが保証される(happens-before)」、どちらも他方を包含しなければ「因果関係のない
 * 並行イベント」と判定できる——物理時計のズレに依存せず、分散システムでの事象の前後関係を
 * 判定できるのが最大の利点。
 */
export function vectorClocksSteps(): GraphFrame[] {
  const nodes = VECTOR_CLOCK_NODES;
  const edges = VECTOR_CLOCK_EDGES;
  const processes = VECTOR_CLOCK_PROCESSES;

  const clocks: Record<string, number[]> = {};
  processes.forEach((p) => {
    clocks[p] = processes.map(() => 0);
  });
  const clockLabel = (p: string) => `[${clocks[p].join(",")}]`;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `ベクタークロックを開始。全プロセス(${processes.join(", ")})のクロックを[0,0,0]に初期化`,
    },
  ];

  const eventVectors: number[][] = [];
  const idxOf = (p: string) => processes.indexOf(p);
  let pendingMessage: number[] | null = null;

  for (const ev of VECTOR_CLOCK_EVENTS) {
    const i = idxOf(ev.process);
    const states = { ...nodeStates };
    states[ev.process] = "visited";

    if (ev.kind === "local") {
      clocks[ev.process][i]++;
      frames.push({
        nodeStates: states,
        edgeStates: { ...edgeStates },
        distances: {},
        description: `${ev.process}でローカルイベント発生 → 自分の要素を+1。${ev.process}のクロック = ${clockLabel(ev.process)}`,
      });
    } else if (ev.kind === "send") {
      clocks[ev.process][i]++;
      pendingMessage = [...clocks[ev.process]];
      const edgeId = `${ev.process}-${ev.target}`;
      const newEdgeStates = { ...edgeStates, [edgeId]: "tree" as GraphEdgeState };
      frames.push({
        nodeStates: states,
        edgeStates: newEdgeStates,
        distances: {},
        description: `${ev.process}が${ev.target}へメッセージ送信 → 自分の要素を+1し、クロック${clockLabel(ev.process)}をメッセージに添付`,
      });
    } else {
      const received = pendingMessage!;
      clocks[ev.process] = clocks[ev.process].map((v, k) => Math.max(v, received[k]));
      clocks[ev.process][i]++;
      frames.push({
        nodeStates: states,
        edgeStates: { ...edgeStates },
        distances: {},
        description: `${ev.process}がメッセージを受信 → 受信したクロック[${received.join(",")}]と要素ごとの最大値を取り、さらに自分の要素を+1。${ev.process}のクロック = ${clockLabel(ev.process)}`,
      });
    }
    eventVectors.push([...clocks[ev.process]]);
  }

  const e1 = eventVectors[0];
  const e7 = eventVectors[6];
  const e1BeforeE7 = e1.every((v, k) => v <= e7[k]) && e1.some((v, k) => v !== e7[k]);
  const e2 = eventVectors[1];
  const e5 = eventVectors[4];
  const e2LeqE5 = e2.every((v, k) => v <= e5[k]);
  const e5LeqE2 = e5.every((v, k) => v <= e2[k]);
  const concurrent = !e2LeqE5 && !e5LeqE2;

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。イベント1([${e1.join(",")}], P1のローカルイベント)とイベント7([${e7.join(",")}], P3の受信)は${e1BeforeE7 ? "happens-before(片方が確実に先に起きた)" : "比較不能"}。イベント2([${e2.join(",")}], P2のローカルイベント)とイベント5([${e5.join(",")}], P3のローカルイベント)は${concurrent ? "並行(concurrent、因果関係なし)" : "happens-before関係あり"}`,
  });

  return frames;
}

type DecisionTreeSample = { f1: number; f2: number; label: number };
type DecisionTreeInternalNode = {
  id: string;
  isLeaf: boolean;
  feature: "f1" | "f2" | null;
  label: number | null;
  left: string | null;
  right: string | null;
};

/** XOR相当の分布(単一の分割では解けず、決定木の多段分割が必要になる古典的な例)。 */
export const DECISION_TREE_DATA: DecisionTreeSample[] = [
  { f1: 0, f2: 0, label: 0 },
  { f1: 0, f2: 1, label: 1 },
  { f1: 1, f2: 0, label: 1 },
  { f1: 1, f2: 1, label: 0 },
];

function decisionTreeGini(samples: DecisionTreeSample[]): number {
  if (samples.length === 0) return 0;
  const counts = new Map<number, number>();
  samples.forEach((s) => counts.set(s.label, (counts.get(s.label) ?? 0) + 1));
  let sumSq = 0;
  counts.forEach((c) => {
    sumSq += (c / samples.length) ** 2;
  });
  return 1 - sumSq;
}

function decisionTreeMajorityLabel(samples: DecisionTreeSample[]): number {
  const counts = new Map<number, number>();
  samples.forEach((s) => counts.set(s.label, (counts.get(s.label) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function buildDecisionTree(
  samples: DecisionTreeSample[],
  features: ("f1" | "f2")[],
  nodes: Record<string, DecisionTreeInternalNode>,
  idCounter: { value: number },
): string {
  const id = `n${idCounter.value++}`;
  const labels = new Set(samples.map((s) => s.label));

  if (labels.size === 1 || features.length === 0) {
    nodes[id] = { id, isLeaf: true, feature: null, label: decisionTreeMajorityLabel(samples), left: null, right: null };
    return id;
  }

  let bestFeature: "f1" | "f2" | null = null;
  let bestGini = Infinity;
  let bestLeft: DecisionTreeSample[] = [];
  let bestRight: DecisionTreeSample[] = [];
  for (const feature of features) {
    const left = samples.filter((s) => s[feature] === 0);
    const right = samples.filter((s) => s[feature] === 1);
    if (left.length === 0 || right.length === 0) continue;
    const weighted =
      (left.length / samples.length) * decisionTreeGini(left) +
      (right.length / samples.length) * decisionTreeGini(right);
    if (weighted < bestGini) {
      bestGini = weighted;
      bestFeature = feature;
      bestLeft = left;
      bestRight = right;
    }
  }

  if (bestFeature === null) {
    nodes[id] = { id, isLeaf: true, feature: null, label: decisionTreeMajorityLabel(samples), left: null, right: null };
    return id;
  }

  const remainingFeatures = features.filter((f) => f !== bestFeature);
  const leftId = buildDecisionTree(bestLeft, remainingFeatures, nodes, idCounter);
  const rightId = buildDecisionTree(bestRight, remainingFeatures, nodes, idCounter);
  nodes[id] = { id, isLeaf: false, feature: bestFeature, label: null, left: leftId, right: rightId };
  return id;
}

function computeDecisionTreeLayout(
  nodes: Record<string, DecisionTreeInternalNode>,
  rootId: string,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  let counter = 0;
  let maxDepth = 0;

  const visit = (id: string, depth: number) => {
    const node = nodes[id];
    maxDepth = Math.max(maxDepth, depth);
    if (node.isLeaf) {
      positions[id] = { x: counter, y: depth };
      counter++;
      return;
    }
    visit(node.left!, depth + 1);
    visit(node.right!, depth + 1);
    const childXs = [positions[node.left!].x, positions[node.right!].x];
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

const DECISION_TREE_NODES_MAP: Record<string, DecisionTreeInternalNode> = {};
const DECISION_TREE_ROOT_ID = buildDecisionTree(
  DECISION_TREE_DATA,
  ["f1", "f2"],
  DECISION_TREE_NODES_MAP,
  { value: 1 },
);
const DECISION_TREE_LAYOUT = computeDecisionTreeLayout(DECISION_TREE_NODES_MAP, DECISION_TREE_ROOT_ID);

export const DECISION_TREE_GRAPH_NODES: GraphNode[] = Object.values(DECISION_TREE_NODES_MAP).map((n) => ({
  id: n.id,
  label: n.isLeaf ? String(n.label) : `${n.feature}?`,
  x: DECISION_TREE_LAYOUT[n.id].x,
  y: DECISION_TREE_LAYOUT[n.id].y,
}));
export const DECISION_TREE_GRAPH_EDGES: GraphEdge[] = Object.values(DECISION_TREE_NODES_MAP).flatMap((n) => {
  const edges: GraphEdge[] = [];
  if (n.left !== null) edges.push({ id: `${n.id}-${n.left}`, from: n.id, to: n.left, weight: 1 });
  if (n.right !== null) edges.push({ id: `${n.id}-${n.right}`, from: n.id, to: n.right, weight: 1 });
  return edges;
});

/**
 * 決定木のステップ列を生成する。ハフマン符号化・セグメント木と同じ手法(実行結果として木を
 * 先に構築し、その最終形を固定レイアウトに使う)でGraphVisualizerに載せている。
 * データはXOR相当の分布(f1,f2の値の組み合わせに対しラベルが0,1,1,0)を使っており、
 * f1・f2いずれか1回の分割だけでは完全に分離できない(単純な線形分類器であるパーセプトロンが
 * 解けない典型例と同じ)ことを、決定木が2段階の分割(まずf1で分けてから、それぞれの
 * グループをさらにf2で分ける)によって解決できる様子を可視化する。分割の良し悪しは
 * ジニ不純度(1-Σ確率²、値が小さいほど純粋)の重み付き平均で判定する。
 */
export function decisionTreeSteps(): GraphFrame[] {
  const nodesMap: Record<string, DecisionTreeInternalNode> = {};
  buildDecisionTree(DECISION_TREE_DATA, ["f1", "f2"], nodesMap, { value: 1 });
  const rootId = DECISION_TREE_ROOT_ID;
  const graphNodes = DECISION_TREE_GRAPH_NODES;
  const graphEdges = DECISION_TREE_GRAPH_EDGES;

  const nodeStates = initNodeStates(graphNodes, "idle");
  const edgeStates = initEdgeStates(graphEdges, "idle");
  const edgeLabels: Record<string, string> = Object.fromEntries(graphEdges.map((e) => [e.id, ""]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: `決定木の構築を開始。データ: ${DECISION_TREE_DATA.map((d) => `(f1=${d.f1},f2=${d.f2})→${d.label}`).join(", ")}(XOR相当、1回の分割だけでは分離できない)`,
    },
  ];

  const buildAndVisit = (samples: DecisionTreeSample[], features: ("f1" | "f2")[], id: string) => {
    const node = nodesMap[id];
    if (node.isLeaf) {
      nodeStates[id] = "settled";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        edgeLabels: { ...edgeLabels },
        description: `頂点${id}: ${samples.length}件全てラベル${samples[0]?.label ?? node.label}${samples.length > 0 && new Set(samples.map((s) => s.label)).size === 1 ? "(純粋)" : "(分割材料が尽きたため多数決)"} → 葉としてラベル${node.label}を確定`,
      });
      return;
    }

    nodeStates[id] = "visited";
    const giniValues = features.map((f) => {
      const left = samples.filter((s) => s[f] === 0);
      const right = samples.filter((s) => s[f] === 1);
      const weighted =
        left.length === 0 || right.length === 0
          ? Infinity
          : (left.length / samples.length) * decisionTreeGini(left) + (right.length / samples.length) * decisionTreeGini(right);
      return { feature: f, weighted };
    });
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: `頂点${id}(${samples.length}件)で各特徴の分割を試す: ${giniValues.map((g) => `${g.feature}(重み付きジニ=${g.weighted === Infinity ? "分割不可" : g.weighted.toFixed(3)})`).join(", ")} → 最小の${node.feature}で分割`,
    });

    const left = samples.filter((s) => s[node.feature!] === 0);
    const right = samples.filter((s) => s[node.feature!] === 1);
    edgeLabels[`${id}-${node.left}`] = `${node.feature}=0`;
    edgeLabels[`${id}-${node.right}`] = `${node.feature}=1`;
    edgeStates[`${id}-${node.left}`] = "tree";
    edgeStates[`${id}-${node.right}`] = "tree";

    buildAndVisit(left, features.filter((f) => f !== node.feature), node.left!);
    buildAndVisit(right, features.filter((f) => f !== node.feature), node.right!);
  };

  buildAndVisit(DECISION_TREE_DATA, ["f1", "f2"], rootId);

  const trainAccuracy = DECISION_TREE_DATA.filter((sample) => {
    let curId = rootId;
    while (!nodesMap[curId].isLeaf) {
      curId = sample[nodesMap[curId].feature!] === 0 ? nodesMap[curId].left! : nodesMap[curId].right!;
    }
    return nodesMap[curId].label === sample.label;
  }).length;

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: `構築完了。訓練データ${DECISION_TREE_DATA.length}件中${trainAccuracy}件を正しく分類(単一の分割では解けないXORパターンも、2段階の分割で完全に分離できた)`,
  });

  return frames;
}

type FftComplex = { re: number; im: number };
const fftAdd = (a: FftComplex, b: FftComplex): FftComplex => ({ re: a.re + b.re, im: a.im + b.im });
const fftSub = (a: FftComplex, b: FftComplex): FftComplex => ({ re: a.re - b.re, im: a.im - b.im });
const fftMul = (a: FftComplex, b: FftComplex): FftComplex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const fftTwiddle = (k: number, n: number): FftComplex => {
  const angle = (-2 * Math.PI * k) / n;
  return { re: Math.cos(angle), im: Math.sin(angle) };
};
const fftMagnitude = (a: FftComplex): number => Math.sqrt(a.re ** 2 + a.im ** 2);
function fftBitReverse(x: number, bits: number): number {
  let result = 0;
  let v = x;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (v & 1);
    v >>= 1;
  }
  return result;
}

/** FFTのデモ用入力(N=4、2の累乗)。バタフライ図は3列(入力のビット反転並べ替え→段1→段2=出力)。 */
export const FFT_INPUT = [1, 2, 3, 4];
export const FFT_N = FFT_INPUT.length;
const FFT_BITS = Math.log2(FFT_N);
const FFT_STAGE1_PAIRS: [number, number][] = [
  [0, 1],
  [2, 3],
];
const FFT_STAGE2_PAIRS: [number, number][] = [
  [0, 2],
  [1, 3],
];

export const FFT_NODES: GraphNode[] = [0, 1, 2].flatMap((stage) =>
  Array.from({ length: FFT_N }, (_, row) => ({
    id: `s${stage}_${row}`,
    label: String(row),
    x: stage * 0.45 + 0.05,
    y: 0.15 + row * 0.28,
  })),
);
export const FFT_EDGES: GraphEdge[] = [
  ...FFT_STAGE1_PAIRS.flatMap(([a, b]) => [
    { id: `s0_${a}-s1_${a}`, from: `s0_${a}`, to: `s1_${a}`, weight: 1 },
    { id: `s0_${b}-s1_${a}`, from: `s0_${b}`, to: `s1_${a}`, weight: 1 },
    { id: `s0_${a}-s1_${b}`, from: `s0_${a}`, to: `s1_${b}`, weight: 1 },
    { id: `s0_${b}-s1_${b}`, from: `s0_${b}`, to: `s1_${b}`, weight: 1 },
  ]),
  ...FFT_STAGE2_PAIRS.flatMap(([a, b]) => [
    { id: `s1_${a}-s2_${a}`, from: `s1_${a}`, to: `s2_${a}`, weight: 1 },
    { id: `s1_${b}-s2_${a}`, from: `s1_${b}`, to: `s2_${a}`, weight: 1 },
    { id: `s1_${a}-s2_${b}`, from: `s1_${a}`, to: `s2_${b}`, weight: 1 },
    { id: `s1_${b}-s2_${b}`, from: `s1_${b}`, to: `s2_${b}`, weight: 1 },
  ]),
];

/**
 * 高速フーリエ変換(FFT、N=4のバタフライ図)のステップ列を生成する。
 * 素朴なDFT(離散フーリエ変換)がO(N²)かかるのに対し、FFTは「N点のDFTは、
 * 偶数番目・奇数番目の要素をそれぞれN/2点でDFTしたものを、回転因子(twiddle factor)を
 * 掛けて足し引きするだけで組み立てられる」という分割統治で再帰的に解くことでO(N log N)を
 * 達成する。まず入力をビット反転順に並べ替えておくことで、再帰を「下から積み上げる」形の
 * 反復処理に変換できるのが、このバタフライ図の骨格(log₂N段の2入力2出力の蝶形演算)。
 */
export function fftSteps(): GraphFrame[] {
  const nodes = FFT_NODES;
  const edges = FFT_EDGES;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const magnitudes: Record<string, number | null> = {};
  nodes.forEach((n) => {
    magnitudes[n.id] = null;
  });

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...magnitudes },
      description: `FFTを開始。入力: [${FFT_INPUT.join(", ")}](N=${FFT_N}点)。頂点下の数字は各時点での複素数値の大きさ`,
    },
  ];

  const stage0: FftComplex[] = Array.from({ length: FFT_N }, (_, i) => ({
    re: FFT_INPUT[fftBitReverse(i, FFT_BITS)],
    im: 0,
  }));
  stage0.forEach((v, row) => {
    magnitudes[`s0_${row}`] = Number(fftMagnitude(v).toFixed(2));
    nodeStates[`s0_${row}`] = "settled";
  });
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...magnitudes },
    description: `ビット反転並べ替え: [${FFT_INPUT.join(",")}] → [${stage0.map((v) => v.re).join(",")}]`,
  });

  const stage1: FftComplex[] = new Array(FFT_N);
  FFT_STAGE1_PAIRS.forEach(([a, b]) => {
    const w = fftTwiddle(0, 2);
    const wb = fftMul(w, stage0[b]);
    stage1[a] = fftAdd(stage0[a], wb);
    stage1[b] = fftSub(stage0[a], wb);
    [`s0_${a}-s1_${a}`, `s0_${b}-s1_${a}`, `s0_${a}-s1_${b}`, `s0_${b}-s1_${b}`].forEach((id) => {
      edgeStates[id] = "tree";
    });
    [a, b].forEach((row) => {
      magnitudes[`s1_${row}`] = Number(fftMagnitude(stage1[row]).toFixed(2));
      nodeStates[`s1_${row}`] = "settled";
    });
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...magnitudes },
      description: `段1のバタフライ(${a},${b}): out${a}=in${a}+w⁰×in${b}=${stage1[a].re.toFixed(2)}${stage1[a].im >= 0 ? "+" : ""}${stage1[a].im.toFixed(2)}i, out${b}=in${a}-w⁰×in${b}=${stage1[b].re.toFixed(2)}${stage1[b].im >= 0 ? "+" : ""}${stage1[b].im.toFixed(2)}i`,
    });
  });

  const stage2: FftComplex[] = new Array(FFT_N);
  FFT_STAGE2_PAIRS.forEach(([a, b], pairIdx) => {
    const w = fftTwiddle(pairIdx, FFT_N);
    const wb = fftMul(w, stage1[b]);
    stage2[a] = fftAdd(stage1[a], wb);
    stage2[b] = fftSub(stage1[a], wb);
    [`s1_${a}-s2_${a}`, `s1_${b}-s2_${a}`, `s1_${a}-s2_${b}`, `s1_${b}-s2_${b}`].forEach((id) => {
      edgeStates[id] = "tree";
    });
    [a, b].forEach((row) => {
      magnitudes[`s2_${row}`] = Number(fftMagnitude(stage2[row]).toFixed(2));
      nodeStates[`s2_${row}`] = "settled";
    });
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...magnitudes },
      description: `段2のバタフライ(${a},${b}): out${a}=in${a}+w^${pairIdx}×in${b}=${stage2[a].re.toFixed(2)}${stage2[a].im >= 0 ? "+" : ""}${stage2[a].im.toFixed(2)}i, out${b}=in${a}-w^${pairIdx}×in${b}=${stage2[b].re.toFixed(2)}${stage2[b].im >= 0 ? "+" : ""}${stage2[b].im.toFixed(2)}i`,
    });
  });

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...magnitudes },
    description: `計算完了。DFT結果: [${stage2.map((v) => `${v.re.toFixed(2)}${v.im >= 0 ? "+" : ""}${v.im.toFixed(2)}i`).join(", ")}]`,
  });

  return frames;
}

type BnbItem = { name: string; weight: number; value: number };
export const BNB_ITEMS: BnbItem[] = [
  { name: "A", weight: 2, value: 3 },
  { name: "B", weight: 3, value: 4 },
  { name: "C", weight: 4, value: 5 },
];
export const BNB_CAPACITY = 6;

type BnbNode = {
  id: string;
  index: number;
  weight: number;
  value: number;
  bound: number;
  pruned: boolean;
  isLeaf: boolean;
  left: string | null;
  right: string | null;
};

function bnbBound(index: number, weight: number, value: number, items: BnbItem[], capacity: number): number {
  if (weight > capacity) return -Infinity;
  let bound = value;
  let totalWeight = weight;
  for (let i = index; i < items.length; i++) {
    if (totalWeight + items[i].weight <= capacity) {
      totalWeight += items[i].weight;
      bound += items[i].value;
    } else {
      const remaining = capacity - totalWeight;
      bound += items[i].value * (remaining / items[i].weight);
      break;
    }
  }
  return bound;
}

function buildBnbTree(
  items: BnbItem[],
  capacity: number,
  nodes: Record<string, BnbNode>,
  idCounter: { value: number },
  bestRef: { value: number },
): string {
  const build = (index: number, weight: number, value: number): string => {
    const id = `n${idCounter.value++}`;
    const bound = bnbBound(index, weight, value, items, capacity);
    const infeasible = weight > capacity;
    if (index === items.length || infeasible) {
      nodes[id] = { id, index, weight, value, bound, pruned: infeasible, isLeaf: true, left: null, right: null };
      if (!infeasible) bestRef.value = Math.max(bestRef.value, value);
      return id;
    }
    if (bound <= bestRef.value) {
      nodes[id] = { id, index, weight, value, bound, pruned: true, isLeaf: true, left: null, right: null };
      return id;
    }
    const item = items[index];
    const leftId = build(index + 1, weight + item.weight, value + item.value);
    const rightId = build(index + 1, weight, value);
    nodes[id] = { id, index, weight, value, bound, pruned: false, isLeaf: false, left: leftId, right: rightId };
    return id;
  };
  return build(0, 0, 0);
}

function computeBnbLayout(nodes: Record<string, BnbNode>, rootId: string): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  let counter = 0;
  let maxDepth = 0;
  const visit = (id: string, depth: number) => {
    const node = nodes[id];
    maxDepth = Math.max(maxDepth, depth);
    if (node.isLeaf) {
      positions[id] = { x: counter, y: depth };
      counter++;
      return;
    }
    visit(node.left!, depth + 1);
    visit(node.right!, depth + 1);
    const xs = [positions[node.left!].x, positions[node.right!].x];
    positions[id] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: depth };
  };
  visit(rootId, 0);
  Object.keys(positions).forEach((id) => {
    positions[id] = {
      x: counter > 1 ? positions[id].x / (counter - 1) : 0.5,
      y: maxDepth > 0 ? positions[id].y / maxDepth : 0,
    };
  });
  return positions;
}

const BNB_NODES_MAP: Record<string, BnbNode> = {};
const BNB_ROOT_ID = buildBnbTree(BNB_ITEMS, BNB_CAPACITY, BNB_NODES_MAP, { value: 0 }, { value: 0 });
const BNB_LAYOUT = computeBnbLayout(BNB_NODES_MAP, BNB_ROOT_ID);

export const BNB_GRAPH_NODES: GraphNode[] = Object.values(BNB_NODES_MAP).map((n) => ({
  id: n.id,
  label: n.isLeaf ? String(n.value) : BNB_ITEMS[n.index].name,
  x: BNB_LAYOUT[n.id].x,
  y: BNB_LAYOUT[n.id].y,
}));
export const BNB_GRAPH_EDGES: GraphEdge[] = Object.values(BNB_NODES_MAP).flatMap((n) => {
  const edges: GraphEdge[] = [];
  if (n.left !== null) edges.push({ id: `${n.id}-${n.left}`, from: n.id, to: n.left, weight: 1 });
  if (n.right !== null) edges.push({ id: `${n.id}-${n.right}`, from: n.id, to: n.right, weight: 1 });
  return edges;
});

/**
 * 分枝限定法(Branch and Bound)のステップ列を生成する。0-1ナップサック問題を
 * 「各品物を入れる/入れない」の二分決定木として総当たりする代わりに、各頂点で
 * 「ここから先、容量制約を無視してでも(品物を分数個入れられるとしても)得られる
 * 最大価値」という楽観的な上界(bound)を計算し、それが既に見つかっている最良解以下
 * なら、その先をどう選んでも最良解を超えられないと確定するので探索を打ち切る(枝刈り)。
 * 全探索なら2ⁿ通り調べる必要があるところを、上界による枝刈りで大幅に削減しながら
 * 厳密な最適解を保証するのが分枝限定法の要点。
 */
export function branchAndBoundSteps(): GraphFrame[] {
  const items = BNB_ITEMS;
  const capacity = BNB_CAPACITY;
  const nodesMap = BNB_NODES_MAP;

  const graphNodes = BNB_GRAPH_NODES;
  const graphEdges = BNB_GRAPH_EDGES;
  const nodeStates = initNodeStates(graphNodes, "idle");
  const edgeStates = initEdgeStates(graphEdges, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `分枝限定法を開始。品物: ${items.map((it) => `${it.name}(重さ${it.weight}/価値${it.value})`).join(", ")}、容量=${capacity}`,
    },
  ];

  let best = 0;
  let prunedCount = 0;
  const visit = (id: string) => {
    const node = nodesMap[id];
    nodeStates[id] = "visited";
    if (node.left !== null) edgeStates[`${id}-${node.left}`] = "checking";
    if (node.right !== null) edgeStates[`${id}-${node.right}`] = "checking";

    if (node.isLeaf) {
      if (node.pruned && node.weight <= capacity) {
        nodeStates[id] = "idle";
        prunedCount++;
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `頂点${id}: 上界=${node.bound.toFixed(1)}が現在の最良解${best}以下 → 枝刈り(これ以上探索しても改善しない)`,
        });
        return;
      }
      if (node.weight > capacity) {
        nodeStates[id] = "idle";
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `頂点${id}: 重さ${node.weight}が容量${capacity}を超過 → 実行不可能`,
        });
        return;
      }
      if (node.value > best) {
        best = node.value;
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `頂点${id}: 全品物を検討済み、価値${node.value} → 新しい最良解として更新(重さ${node.weight}/容量${capacity})`,
        });
      } else {
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `頂点${id}: 全品物を検討済み、価値${node.value}(現在の最良解${best}を超えない)`,
        });
      }
      return;
    }

    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `頂点${id}: 品物${items[node.index].name}を検討(上界=${node.bound.toFixed(1)}、現在の最良解=${best})。含める/含めないの両方に分岐`,
    });

    visit(node.left!);
    visit(node.right!);
    nodeStates[id] = "settled";
  };

  visit(BNB_ROOT_ID);

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。最良解=${best}(${prunedCount}個の頂点を上界による枝刈りで探索省略)`,
  });

  return frames;
}

type GameTreeNode = {
  id: string;
  depth: number;
  isMax: boolean;
  isLeaf: boolean;
  leafValue?: number;
  left: string | null;
  right: string | null;
};

/**
 * ゲーム木(深さ3の完全二分木)のデモ用データ。minimax法・アルファベータ枝刈り法・
 * モンテカルロ木探索の3アルゴリズムが同じ木・同じ末端値を共有することで、
 * 探索量や結果を横並びで比較できるようにしている。末端値はアルファベータ枝刈りで
 * 必ず1箇所の枝刈りが起きるよう意図的に選定した(手動トレースで検証済み)。
 */
export const GAME_TREE_LEAF_VALUES = [2, 3, 8, 1, 7, 4, 6, 9];

function buildGameTree(): { nodes: Record<string, GameTreeNode>; rootId: string } {
  const nodes: Record<string, GameTreeNode> = {};
  let counter = 0;
  let leafIndex = 0;
  const build = (depth: number): string => {
    const id = `g${counter++}`;
    if (depth === 3) {
      nodes[id] = {
        id,
        depth,
        isMax: false,
        isLeaf: true,
        leafValue: GAME_TREE_LEAF_VALUES[leafIndex++],
        left: null,
        right: null,
      };
      return id;
    }
    const isMax = depth % 2 === 0;
    const left = build(depth + 1);
    const right = build(depth + 1);
    nodes[id] = { id, depth, isMax, isLeaf: false, left, right };
    return id;
  };
  const rootId = build(0);
  return { nodes, rootId };
}

function computeGameTreeLayout(
  nodes: Record<string, GameTreeNode>,
  rootId: string,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  let leafCounter = 0;
  const visit = (id: string) => {
    const node = nodes[id];
    if (node.isLeaf) {
      positions[id] = { x: leafCounter, y: node.depth };
      leafCounter++;
      return;
    }
    visit(node.left!);
    visit(node.right!);
    const xs = [positions[node.left!].x, positions[node.right!].x];
    positions[id] = { x: (xs[0] + xs[1]) / 2, y: node.depth };
  };
  visit(rootId);
  Object.keys(positions).forEach((id) => {
    positions[id] = {
      x: leafCounter > 1 ? positions[id].x / (leafCounter - 1) : 0.5,
      y: nodes[id].depth / 3,
    };
  });
  return positions;
}

const GAME_TREE = buildGameTree();
const GAME_TREE_LAYOUT = computeGameTreeLayout(GAME_TREE.nodes, GAME_TREE.rootId);

export const GAME_TREE_NODES: GraphNode[] = Object.values(GAME_TREE.nodes).map((n) => ({
  id: n.id,
  label: n.isLeaf ? String(n.leafValue) : n.isMax ? "MAX" : "MIN",
  x: GAME_TREE_LAYOUT[n.id].x,
  y: GAME_TREE_LAYOUT[n.id].y,
}));
export const GAME_TREE_EDGES: GraphEdge[] = Object.values(GAME_TREE.nodes).flatMap((n) => {
  const edges: GraphEdge[] = [];
  if (n.left !== null) edges.push({ id: `${n.id}-${n.left}`, from: n.id, to: n.left, weight: 1 });
  if (n.right !== null) edges.push({ id: `${n.id}-${n.right}`, from: n.id, to: n.right, weight: 1 });
  return edges;
});

/**
 * ミニマックス法のステップ列を生成する。深さ優先探索で末端(葉)まで潜り、
 * 評価値を下から上へ伝播させる: MAXノードでは子の最大値を、MINノードでは
 * 子の最小値を、そのノード自身の評価値として採用する。
 */
export function minimaxSteps(): GraphFrame[] {
  const nodesMap = GAME_TREE.nodes;
  const nodeStates = initNodeStates(GAME_TREE_NODES, "idle");
  const edgeStates = initEdgeStates(GAME_TREE_EDGES, "idle");
  const values: Record<string, number | null> = {};
  GAME_TREE_NODES.forEach((n) => {
    values[n.id] = null;
  });

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `ミニマックス法を開始。ルート(MAX)から深さ優先で末端まで評価し、値を下から上へ伝播させる`,
    },
  ];

  const visit = (id: string): number => {
    const node = nodesMap[id];
    nodeStates[id] = "visited";
    if (node.isLeaf) {
      values[id] = node.leafValue!;
      nodeStates[id] = "settled";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...values },
        description: `末端${id}: 評価値=${node.leafValue}`,
      });
      return node.leafValue!;
    }
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `頂点${id}(${node.isMax ? "MAX" : "MIN"})を展開`,
    });
    edgeStates[`${id}-${node.left}`] = "tree";
    const leftVal = visit(node.left!);
    edgeStates[`${id}-${node.right}`] = "tree";
    const rightVal = visit(node.right!);
    const value = node.isMax ? Math.max(leftVal, rightVal) : Math.min(leftVal, rightVal);
    values[id] = value;
    nodeStates[id] = "settled";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `頂点${id}(${node.isMax ? "MAX" : "MIN"}): 子の評価値(${leftVal}, ${rightVal})から${node.isMax ? "最大値" : "最小値"}${value}を採用`,
    });
    return value;
  };

  const rootValue = visit(GAME_TREE.rootId);
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...values },
    description: `計算完了。ルートの評価値=${rootValue}(この値を実現する手が最善手)`,
  });

  return frames;
}

function countGameSubtreeNodes(id: string): number {
  const node = GAME_TREE.nodes[id];
  if (node.isLeaf) return 1;
  return 1 + countGameSubtreeNodes(node.left!) + countGameSubtreeNodes(node.right!);
}

/**
 * アルファベータ枝刈りのステップ列を生成する。minimaxStepsと同じゲーム木を使い、
 * α(自分にとってこれまでに保証できる最良値)とβ(相手にとってこれまでに保証できる
 * 最良値)を追跡しながら、α≥βになった時点で残りの子の探索を打ち切る(枝刈り)。
 */
export function alphaBetaPruningSteps(): GraphFrame[] {
  const nodesMap = GAME_TREE.nodes;
  const nodeStates = initNodeStates(GAME_TREE_NODES, "idle");
  const edgeStates = initEdgeStates(GAME_TREE_EDGES, "idle");
  const values: Record<string, number | null> = {};
  GAME_TREE_NODES.forEach((n) => {
    values[n.id] = null;
  });
  let prunedCount = 0;

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `アルファベータ枝刈りを開始。minimaxStepsと同じゲーム木・同じ末端値を使用`,
    },
  ];

  const fmt = (v: number): string => (v === -Infinity ? "-∞" : v === Infinity ? "∞" : String(v));

  const visit = (id: string, alpha: number, beta: number): number => {
    const node = nodesMap[id];
    nodeStates[id] = "visited";
    if (node.isLeaf) {
      values[id] = node.leafValue!;
      nodeStates[id] = "settled";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...values },
        description: `末端${id}: 評価値=${node.leafValue}`,
      });
      return node.leafValue!;
    }

    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `頂点${id}(${node.isMax ? "MAX" : "MIN"})を展開(α=${fmt(alpha)}, β=${fmt(beta)})`,
    });

    edgeStates[`${id}-${node.left}`] = "tree";
    const leftVal = visit(node.left!, alpha, beta);
    let value = leftVal;
    if (node.isMax) alpha = Math.max(alpha, value);
    else beta = Math.min(beta, value);

    if (alpha >= beta) {
      const prunedSize = countGameSubtreeNodes(node.right!);
      prunedCount += prunedSize;
      values[id] = value;
      nodeStates[id] = "settled";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...values },
        description: `頂点${id}: α=${fmt(alpha)} ≥ β=${fmt(beta)} → 右部分木(${prunedSize}頂点)を枝刈り`,
      });
      return value;
    }

    edgeStates[`${id}-${node.right}`] = "tree";
    const rightVal = visit(node.right!, alpha, beta);
    value = node.isMax ? Math.max(leftVal, rightVal) : Math.min(leftVal, rightVal);
    values[id] = value;
    nodeStates[id] = "settled";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `頂点${id}(${node.isMax ? "MAX" : "MIN"}): 評価値=${value}`,
    });
    return value;
  };

  const rootValue = visit(GAME_TREE.rootId, -Infinity, Infinity);
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...values },
    description: `計算完了。ルートの評価値=${rootValue}(ミニマックス法と同じ結果に到達しつつ、${prunedCount}個の頂点を枝刈りして探索量を削減)`,
  });

  return frames;
}

function mctsCreateLcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

export const MONTE_CARLO_TREE_SEARCH_SEED = 7;
export const MONTE_CARLO_TREE_SEARCH_ITERATIONS = 24;
const MONTE_CARLO_TREE_SEARCH_C = Math.SQRT2;

/**
 * モンテカルロ木探索(MCTS)のステップ列を生成する。minimaxStepsと同じゲーム木を使い、
 * 「選択(UCB1で有望かつ未探索の枝を優先)→展開→シミュレーション(末端までの
 * ランダムロールアウト)→バックプロパゲーション(訪問回数・平均評価値の更新)」の
 * 4フェーズを反復する。最終的に訪問回数が最も多い手を最善手として採用する。
 */
export function monteCarloTreeSearchSteps(): GraphFrame[] {
  const nodesMap = GAME_TREE.nodes;
  const nodeStates = initNodeStates(GAME_TREE_NODES, "idle");
  const edgeStates = initEdgeStates(GAME_TREE_EDGES, "idle");
  const visits: Record<string, number> = {};
  const totalValue: Record<string, number> = {};
  GAME_TREE_NODES.forEach((n) => {
    visits[n.id] = 0;
    totalValue[n.id] = 0;
  });
  const rng = mctsCreateLcg(MONTE_CARLO_TREE_SEARCH_SEED);

  const meanValues = (): Record<string, number | null> => {
    const out: Record<string, number | null> = {};
    GAME_TREE_NODES.forEach((n) => {
      out[n.id] = visits[n.id] > 0 ? Number((totalValue[n.id] / visits[n.id]).toFixed(2)) : null;
    });
    return out;
  };

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: meanValues(),
      description: `モンテカルロ木探索を開始(${MONTE_CARLO_TREE_SEARCH_ITERATIONS}回反復)。minimaxStepsと同じゲーム木を使用。頂点下の数字は訪問済みの平均評価値`,
    },
  ];

  const ucb1 = (childId: string, parentVisits: number): number => {
    if (visits[childId] === 0) return Infinity;
    const mean = totalValue[childId] / visits[childId];
    return mean + MONTE_CARLO_TREE_SEARCH_C * Math.sqrt(Math.log(parentVisits) / visits[childId]);
  };

  const rolloutFrom = (id: string): number => {
    let cur = nodesMap[id];
    while (!cur.isLeaf) {
      const goLeft = rng() < 0.5;
      cur = nodesMap[goLeft ? cur.left! : cur.right!];
    }
    return cur.leafValue!;
  };

  for (let iter = 1; iter <= MONTE_CARLO_TREE_SEARCH_ITERATIONS; iter++) {
    const path: string[] = [GAME_TREE.rootId];
    let cur = GAME_TREE.rootId;
    while (!nodesMap[cur].isLeaf) {
      const node = nodesMap[cur];
      const parentVisits = Math.max(1, visits[cur]);
      const leftScore = ucb1(node.left!, parentVisits);
      const rightScore = ucb1(node.right!, parentVisits);
      cur = leftScore >= rightScore ? node.left! : node.right!;
      path.push(cur);
      if (visits[cur] === 0) break;
    }

    const result = nodesMap[cur].isLeaf ? nodesMap[cur].leafValue! : rolloutFrom(cur);
    path.forEach((id) => {
      visits[id]++;
      totalValue[id] += result;
    });
    nodeStates[cur] = "visited";

    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: meanValues(),
      description: `[反復${iter}] 選択経路 ${path.join("→")}、シミュレーション結果=${result} → バックプロパゲーションで経路上の訪問回数・平均評価値を更新`,
    });
  }

  const rootNode = nodesMap[GAME_TREE.rootId];
  const bestChild = visits[rootNode.left!] >= visits[rootNode.right!] ? rootNode.left! : rootNode.right!;
  nodeStates[GAME_TREE.rootId] = "settled";
  nodeStates[bestChild] = "settled";
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: meanValues(),
    description: `計算完了。訪問回数が最も多い手=${bestChild}(訪問${visits[bestChild]}回、平均評価値${(totalValue[bestChild] / visits[bestChild]).toFixed(2)})を最終的な最善手として選択`,
  });

  return frames;
}

/**
 * ネガマックス法のステップ列を生成する。ミニマックス法がMAXノードで最大値・
 * MINノードで最小値と「場合分け」していたのに対し、ネガマックス法は
 * 「常に自分にとっての最大値を選び、相手の手番では評価値の符号を反転させる」
 * という一本化されたルールに書き換える——数学的にはminimaxStepsと全く同じ
 * ゲーム木・同じ結果になるが、実装がシンプルになる(2人ゼロ和ゲームの対称性を利用)。
 */
export function negamaxSteps(): GraphFrame[] {
  const nodesMap = GAME_TREE.nodes;
  const nodeStates = initNodeStates(GAME_TREE_NODES, "idle");
  const edgeStates = initEdgeStates(GAME_TREE_EDGES, "idle");
  const values: Record<string, number | null> = {};
  GAME_TREE_NODES.forEach((n) => {
    values[n.id] = null;
  });

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `ネガマックス法を開始。各手番で「自分にとっての最大値」だけを求め、相手の手番に渡すときに符号を反転させる`,
    },
  ];

  const visit = (id: string, color: 1 | -1): number => {
    const node = nodesMap[id];
    nodeStates[id] = "visited";
    if (node.isLeaf) {
      const value = color * node.leafValue!;
      values[id] = value;
      nodeStates[id] = "settled";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...values },
        description: `末端${id}: 符号${color > 0 ? "+1" : "-1"}を掛けた評価値=${value}(実際の値${node.leafValue})`,
      });
      return value;
    }
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `頂点${id}(符号${color > 0 ? "+1" : "-1"})を展開`,
    });
    edgeStates[`${id}-${node.left}`] = "tree";
    const leftVal = -visit(node.left!, (-color) as 1 | -1);
    edgeStates[`${id}-${node.right}`] = "tree";
    const rightVal = -visit(node.right!, (-color) as 1 | -1);
    const value = Math.max(leftVal, rightVal);
    values[id] = value;
    nodeStates[id] = "settled";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `頂点${id}: 子から返ってきた値を反転(${leftVal}, ${rightVal})し、その最大値${value}を採用`,
    });
    return value;
  };

  const rootValue = visit(GAME_TREE.rootId, 1);
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...values },
    description: `計算完了。ルートの評価値=${rootValue}(minimaxStepsと同じゲーム木で同じ結果になることを確認できる)`,
  });

  return frames;
}

/**
 * エクスペクティマックス法のステップ列を生成する。サイコロやカードなど
 * 「確率的な要素」を含むゲームでは、相手が常に最善を尽くすとは限らない——
 * minimaxStepsと同じゲーム木を使い、MINノードだった箇所を「偶然ノード」
 * (2つの子が等確率で起こるとみなす)に読み替え、最小値の代わりに期待値
 * (子の値の平均)を採用することで、確率的なゲームの意思決定を表現する。
 */
export function expectimaxSteps(): GraphFrame[] {
  const nodesMap = GAME_TREE.nodes;
  const nodeStates = initNodeStates(GAME_TREE_NODES, "idle");
  const edgeStates = initEdgeStates(GAME_TREE_EDGES, "idle");
  const values: Record<string, number | null> = {};
  GAME_TREE_NODES.forEach((n) => {
    values[n.id] = null;
  });

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `エクスペクティマックス法を開始。MAXノードはそのまま、MINノードは「偶然ノード」(2つの子が等確率)として扱い、平均値(期待値)を採用する`,
    },
  ];

  const visit = (id: string): number => {
    const node = nodesMap[id];
    nodeStates[id] = "visited";
    if (node.isLeaf) {
      values[id] = node.leafValue!;
      nodeStates[id] = "settled";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...values },
        description: `末端${id}: 評価値=${node.leafValue}`,
      });
      return node.leafValue!;
    }
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `頂点${id}(${node.isMax ? "MAX" : "偶然ノード"})を展開`,
    });
    edgeStates[`${id}-${node.left}`] = "tree";
    const leftVal = visit(node.left!);
    edgeStates[`${id}-${node.right}`] = "tree";
    const rightVal = visit(node.right!);
    const value = node.isMax ? Math.max(leftVal, rightVal) : (leftVal + rightVal) / 2;
    values[id] = value;
    nodeStates[id] = "settled";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `頂点${id}(${node.isMax ? "MAX" : "偶然ノード"}): 子の評価値(${leftVal}, ${rightVal})から${node.isMax ? "最大値" : "期待値(平均)"}${value}を採用`,
    });
    return value;
  };

  const rootValue = visit(GAME_TREE.rootId);
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...values },
    description: `計算完了。ルートの期待値=${rootValue}(相手が最善を尽くすminimaxStepsの結果より、偶然ノードの影響で値が変わることを確認できる)`,
  });

  return frames;
}

function gameTreeLeafAverage(id: string): number {
  const node = GAME_TREE.nodes[id];
  if (node.isLeaf) return node.leafValue!;
  return (gameTreeLeafAverage(node.left!) + gameTreeLeafAverage(node.right!)) / 2;
}

/**
 * 反復深化ミニマックス法のステップ列を生成する。実戦の対局(将棋・チェス等)では
 * 持ち時間の制約で全ての末端まで読み切れないことが多い——深さ制限を1,2,3…と
 * 少しずつ増やしながらミニマックス法を繰り返し、制限に達したノードでは
 * (末端まで読めない代わりに)そのノード配下の末端値の平均という簡易評価関数で
 * 打ち切ることで、時間が許す限り読みを深めるごとに評価値が真の値へ収束していく様子を示す。
 */
export function iterativeDeepeningMinimaxSteps(): GraphFrame[] {
  const nodesMap = GAME_TREE.nodes;
  const nodeStates = initNodeStates(GAME_TREE_NODES, "idle");
  const edgeStates = initEdgeStates(GAME_TREE_EDGES, "idle");
  const values: Record<string, number | null> = {};
  GAME_TREE_NODES.forEach((n) => {
    values[n.id] = null;
  });
  const maxDepth = Math.max(...GAME_TREE_NODES.map((n) => nodesMap[n.id].depth));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `反復深化ミニマックス法を開始。深さ制限を1から${maxDepth}まで少しずつ増やしながら、同じゲーム木を繰り返し評価する`,
    },
  ];

  let finalRootValue = 0;
  for (let depthLimit = 1; depthLimit <= maxDepth; depthLimit++) {
    GAME_TREE_NODES.forEach((n) => {
      nodeStates[n.id] = "idle";
      values[n.id] = null;
    });
    Object.keys(edgeStates).forEach((k) => {
      edgeStates[k] = "idle";
    });

    const visit = (id: string): number => {
      const node = nodesMap[id];
      nodeStates[id] = "visited";
      if (node.isLeaf) {
        values[id] = node.leafValue!;
        nodeStates[id] = "settled";
        return node.leafValue!;
      }
      if (node.depth >= depthLimit) {
        const heuristic = Number(gameTreeLeafAverage(id).toFixed(2));
        values[id] = heuristic;
        nodeStates[id] = "settled";
        return heuristic;
      }
      edgeStates[`${id}-${node.left}`] = "tree";
      const leftVal = visit(node.left!);
      edgeStates[`${id}-${node.right}`] = "tree";
      const rightVal = visit(node.right!);
      const value = node.isMax ? Math.max(leftVal, rightVal) : Math.min(leftVal, rightVal);
      values[id] = value;
      nodeStates[id] = "settled";
      return value;
    };

    finalRootValue = visit(GAME_TREE.rootId);
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...values },
      description: `深さ制限=${depthLimit}: ルートの評価値=${finalRootValue}(制限に達したノードは配下の末端値の平均で簡易評価)`,
    });
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...values },
    description: `計算完了。深さ制限=${maxDepth}(木の全深さ)に到達し、通常のミニマックス法と同じ真の評価値${finalRootValue}に収束`,
  });

  return frames;
}

type NfaTransition = { from: string; to: string; symbol: string };
type NfaFragment = { states: string[]; transitions: NfaTransition[]; start: string; accept: string };
type NfaBuilder = { newState: () => string };

function createNfaBuilder(): NfaBuilder {
  let counter = 0;
  return { newState: () => `n${counter++}` };
}

function nfaSymbol(builder: NfaBuilder, symbol: string): NfaFragment {
  const s = builder.newState();
  const a = builder.newState();
  return { states: [s, a], transitions: [{ from: s, to: a, symbol }], start: s, accept: a };
}
function nfaConcat(f1: NfaFragment, f2: NfaFragment): NfaFragment {
  return {
    states: [...f1.states, ...f2.states],
    transitions: [...f1.transitions, ...f2.transitions, { from: f1.accept, to: f2.start, symbol: "ε" }],
    start: f1.start,
    accept: f2.accept,
  };
}
function nfaUnion(builder: NfaBuilder, f1: NfaFragment, f2: NfaFragment): NfaFragment {
  const s = builder.newState();
  const a = builder.newState();
  return {
    states: [s, ...f1.states, ...f2.states, a],
    transitions: [
      ...f1.transitions,
      ...f2.transitions,
      { from: s, to: f1.start, symbol: "ε" },
      { from: s, to: f2.start, symbol: "ε" },
      { from: f1.accept, to: a, symbol: "ε" },
      { from: f2.accept, to: a, symbol: "ε" },
    ],
    start: s,
    accept: a,
  };
}
function nfaStar(builder: NfaBuilder, f: NfaFragment): NfaFragment {
  const s = builder.newState();
  const a = builder.newState();
  return {
    states: [s, ...f.states, a],
    transitions: [
      ...f.transitions,
      { from: s, to: f.start, symbol: "ε" },
      { from: s, to: a, symbol: "ε" },
      { from: f.accept, to: f.start, symbol: "ε" },
      { from: f.accept, to: a, symbol: "ε" },
    ],
    start: s,
    accept: a,
  };
}

/** 正規表現 a(b|c)* のNFAを、記号(symbol)・連接(concat)・選択(union)・繰り返し(star)の4部品から組み立てる。 */
function buildThompsonNfa(builder: NfaBuilder): NfaFragment {
  const fa = nfaSymbol(builder, "a");
  const fb = nfaSymbol(builder, "b");
  const fc = nfaSymbol(builder, "c");
  const fbc = nfaUnion(builder, fb, fc);
  const fstar = nfaStar(builder, fbc);
  return nfaConcat(fa, fstar);
}

function computeNfaLayout(fragment: NfaFragment): Record<string, { x: number; y: number }> {
  const adj: Record<string, string[]> = {};
  fragment.states.forEach((s) => {
    adj[s] = [];
  });
  fragment.transitions.forEach((t) => adj[t.from].push(t.to));
  const rank: Record<string, number> = { [fragment.start]: 0 };
  const queue: string[] = [fragment.start];
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    for (const next of adj[cur]) {
      if (!(next in rank)) {
        rank[next] = rank[cur] + 1;
        queue.push(next);
      }
    }
  }
  const maxRank = Math.max(...Object.values(rank), 1);
  const rankGroups: Record<number, string[]> = {};
  fragment.states.forEach((s) => {
    const r = rank[s] ?? maxRank;
    (rankGroups[r] ??= []).push(s);
  });
  const positions: Record<string, { x: number; y: number }> = {};
  Object.entries(rankGroups).forEach(([r, states]) => {
    states.forEach((s, i) => {
      positions[s] = {
        x: Number(r) / maxRank,
        y: states.length > 1 ? (i + 0.5) / states.length : 0.5,
      };
    });
  });
  return positions;
}

const qLabel = (id: string): string => id.replace(/^n/, "q");
const nfaEdgeId = (from: string, to: string): string => `${from}-${to}`;

const THOMPSON_NFA = buildThompsonNfa(createNfaBuilder());
const THOMPSON_NFA_LAYOUT = computeNfaLayout(THOMPSON_NFA);

export const THOMPSON_NFA_NODES: GraphNode[] = THOMPSON_NFA.states.map((s) => ({
  id: s,
  label: qLabel(s),
  x: THOMPSON_NFA_LAYOUT[s].x,
  y: THOMPSON_NFA_LAYOUT[s].y,
}));
export const THOMPSON_NFA_EDGES: GraphEdge[] = THOMPSON_NFA.transitions.map((t) => ({
  id: nfaEdgeId(t.from, t.to),
  from: t.from,
  to: t.to,
  weight: 1,
}));
const THOMPSON_NFA_EDGE_SYMBOLS: Record<string, string> = Object.fromEntries(
  THOMPSON_NFA.transitions.map((t) => [nfaEdgeId(t.from, t.to), t.symbol]),
);

/**
 * トンプソン構成法のステップ列を生成する。正規表現 a(b|c)* を「記号」「選択(union)」
 * 「繰り返し(star)」「連接(concat)」の4種の部品に分解し、それぞれをε遷移で
 * 繋いだNFAの断片として組み立てていく過程を、部品を追加するたびに1フレームずつ可視化する。
 */
export function thompsonConstructionSteps(): GraphFrame[] {
  const nodes = THOMPSON_NFA_NODES;
  const edges = THOMPSON_NFA_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const edgeLabels: Record<string, string> = { ...THOMPSON_NFA_EDGE_SYMBOLS };

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: `トンプソン構成法を開始。正規表現 a(b|c)* のNFAを部品ごとに組み立てる`,
    },
  ];

  const reveal = (frag: NfaFragment, description: string) => {
    frag.states.forEach((s) => {
      nodeStates[s] = "settled";
    });
    frag.transitions.forEach((t) => {
      edgeStates[nfaEdgeId(t.from, t.to)] = "tree";
    });
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description,
    });
  };

  const builder = createNfaBuilder();
  const fa = nfaSymbol(builder, "a");
  reveal(fa, `記号'a'の基本NFA(2状態、1本の遷移)を作成`);
  const fb = nfaSymbol(builder, "b");
  reveal(fb, `記号'b'の基本NFA(2状態)を作成`);
  const fc = nfaSymbol(builder, "c");
  reveal(fc, `記号'c'の基本NFA(2状態)を作成`);
  const fbc = nfaUnion(builder, fb, fc);
  reveal(fbc, `'b'と'c'をε遷移で選択(union)結合: (b|c)`);
  const fstar = nfaStar(builder, fbc);
  reveal(fstar, `(b|c)にクリーネスター(繰り返し)を適用: (b|c)*`);
  const fall = nfaConcat(fa, fstar);
  reveal(fall, `'a'と(b|c)*をε遷移で連接(concat): a(b|c)*`);

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: `構成完了。開始状態=${qLabel(fall.start)}、受理状態=${qLabel(fall.accept)}の非決定性有限オートマトン(NFA)が完成`,
  });

  return frames;
}

function nfaEpsilonClosure(states: Set<string>, transitions: NfaTransition[]): Set<string> {
  const stack = [...states];
  const closure = new Set(states);
  while (stack.length) {
    const s = stack.pop()!;
    transitions
      .filter((t) => t.from === s && t.symbol === "ε")
      .forEach((t) => {
        if (!closure.has(t.to)) {
          closure.add(t.to);
          stack.push(t.to);
        }
      });
  }
  return closure;
}
function nfaMove(states: Set<string>, symbol: string, transitions: NfaTransition[]): Set<string> {
  const result = new Set<string>();
  transitions
    .filter((t) => states.has(t.from) && t.symbol === symbol)
    .forEach((t) => result.add(t.to));
  return result;
}
function nfaSetKey(s: Set<string>): string {
  return [...s].sort().join(",");
}
function nfaSetLabel(s: Set<string>): string {
  return `{${[...s]
    .map(qLabel)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
    .join(",")}}`;
}

type DfaBuildResult = {
  states: Record<string, Set<string>>;
  order: string[];
  transitions: { from: string; to: string; symbol: string }[];
  startKey: string;
  acceptKeys: Set<string>;
  alphabet: string[];
};

function buildSubsetConstructionDfa(nfa: NfaFragment): DfaBuildResult {
  const alphabet = [...new Set(nfa.transitions.filter((t) => t.symbol !== "ε").map((t) => t.symbol))].sort();
  const startSet = nfaEpsilonClosure(new Set([nfa.start]), nfa.transitions);
  const startKey = nfaSetKey(startSet);
  const states: Record<string, Set<string>> = { [startKey]: startSet };
  const order: string[] = [startKey];
  const transitions: { from: string; to: string; symbol: string }[] = [];
  const acceptKeys = new Set<string>();
  if (startSet.has(nfa.accept)) acceptKeys.add(startKey);

  const queue = [startKey];
  let qi = 0;
  while (qi < queue.length) {
    const key = queue[qi++];
    const set = states[key];
    for (const sym of alphabet) {
      const moved = nfaMove(set, sym, nfa.transitions);
      if (moved.size === 0) continue;
      const closure = nfaEpsilonClosure(moved, nfa.transitions);
      const newKey = nfaSetKey(closure);
      if (!(newKey in states)) {
        states[newKey] = closure;
        order.push(newKey);
        queue.push(newKey);
        if (closure.has(nfa.accept)) acceptKeys.add(newKey);
      }
      transitions.push({ from: key, to: newKey, symbol: sym });
    }
  }
  return { states, order, transitions, startKey, acceptKeys, alphabet };
}

function computeDfaLayout(result: DfaBuildResult): Record<string, { x: number; y: number }> {
  const adj: Record<string, string[]> = {};
  result.order.forEach((k) => {
    adj[k] = [];
  });
  result.transitions.forEach((t) => adj[t.from].push(t.to));
  const rank: Record<string, number> = { [result.startKey]: 0 };
  const queue: string[] = [result.startKey];
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    for (const next of adj[cur]) {
      if (!(next in rank)) {
        rank[next] = rank[cur] + 1;
        queue.push(next);
      }
    }
  }
  const maxRank = Math.max(...Object.values(rank), 1);
  const rankGroups: Record<number, string[]> = {};
  result.order.forEach((k) => {
    const r = rank[k] ?? maxRank;
    (rankGroups[r] ??= []).push(k);
  });
  const positions: Record<string, { x: number; y: number }> = {};
  Object.entries(rankGroups).forEach(([r, keys]) => {
    keys.forEach((k, i) => {
      positions[k] = {
        x: Number(r) / maxRank,
        y: keys.length > 1 ? (i + 0.5) / keys.length : 0.5,
      };
    });
  });
  return positions;
}

const SUBSET_CONSTRUCTION_DFA = buildSubsetConstructionDfa(THOMPSON_NFA);
const SUBSET_CONSTRUCTION_LAYOUT = computeDfaLayout(SUBSET_CONSTRUCTION_DFA);

export const SUBSET_CONSTRUCTION_NODES: GraphNode[] = SUBSET_CONSTRUCTION_DFA.order.map((k) => ({
  id: k,
  label: nfaSetLabel(SUBSET_CONSTRUCTION_DFA.states[k]),
  x: SUBSET_CONSTRUCTION_LAYOUT[k].x,
  y: SUBSET_CONSTRUCTION_LAYOUT[k].y,
}));
export const SUBSET_CONSTRUCTION_EDGES: GraphEdge[] = SUBSET_CONSTRUCTION_DFA.transitions.map((t, i) => ({
  id: `${t.from}=>${t.to}#${i}`,
  from: t.from,
  to: t.to,
  weight: 1,
}));
const SUBSET_CONSTRUCTION_EDGE_SYMBOLS: Record<string, string> = Object.fromEntries(
  SUBSET_CONSTRUCTION_DFA.transitions.map((t, i) => [`${t.from}=>${t.to}#${i}`, t.symbol]),
);

/**
 * 部分集合構成法のステップ列を生成する。トンプソン構成法で作ったNFAに対し、
 * 「NFAが同時に取りうる状態の集合」1つひとつをDFAの1状態とみなし、記号ごとの
 * 移動先集合(ε閉包込み)を計算して新しいDFA状態を発見するたびに1フレームずつ可視化する。
 */
export function subsetConstructionSteps(): GraphFrame[] {
  const nodes = SUBSET_CONSTRUCTION_NODES;
  const edges = SUBSET_CONSTRUCTION_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const edgeLabels: Record<string, string> = { ...SUBSET_CONSTRUCTION_EDGE_SYMBOLS };

  const nfa = THOMPSON_NFA;
  const alphabet = [...new Set(nfa.transitions.filter((t) => t.symbol !== "ε").map((t) => t.symbol))].sort();
  const startSet = nfaEpsilonClosure(new Set([nfa.start]), nfa.transitions);
  const startKey = nfaSetKey(startSet);
  const states: Record<string, Set<string>> = { [startKey]: startSet };

  nodeStates[startKey] = "settled";
  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      edgeLabels: { ...edgeLabels },
      description: `部分集合構成法を開始。開始状態のε閉包 ${nfaSetLabel(startSet)} を最初のDFA状態とする`,
    },
  ];

  const queue = [startKey];
  let qi = 0;
  while (qi < queue.length) {
    const key = queue[qi++];
    const set = states[key];
    for (const sym of alphabet) {
      const moved = nfaMove(set, sym, nfa.transitions);
      if (moved.size === 0) continue;
      const closure = nfaEpsilonClosure(moved, nfa.transitions);
      const newKey = nfaSetKey(closure);
      const isNew = !(newKey in states);
      if (isNew) {
        states[newKey] = closure;
        queue.push(newKey);
        nodeStates[newKey] = "settled";
      }
      const edgeId = edges.find((e) => e.from === key && e.to === newKey && edgeLabels[e.id] === sym)?.id;
      if (edgeId) edgeStates[edgeId] = "tree";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        edgeLabels: { ...edgeLabels },
        description: isNew
          ? `${nfaSetLabel(set)} から記号'${sym}'で ${nfaSetLabel(closure)} へ遷移(新しいDFA状態を発見)`
          : `${nfaSetLabel(set)} から記号'${sym}'で既存のDFA状態 ${nfaSetLabel(closure)} へ遷移`,
      });
    }
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    edgeLabels: { ...edgeLabels },
    description: `構成完了。NFAの${THOMPSON_NFA.states.length}状態から、決定性有限オートマトン(DFA)の${Object.keys(states).length}状態が得られた`,
  });

  return frames;
}

function minimizeDfaPartitions(result: DfaBuildResult): Record<string, number>[] {
  const stateKeys = result.order;
  const transMap: Record<string, Record<string, string>> = {};
  stateKeys.forEach((k) => {
    transMap[k] = {};
  });
  result.transitions.forEach((t) => {
    transMap[t.from][t.symbol] = t.to;
  });

  let partition: Record<string, number> = {};
  stateKeys.forEach((k) => {
    partition[k] = result.acceptKeys.has(k) ? 1 : 0;
  });
  const history: Record<string, number>[] = [{ ...partition }];

  for (;;) {
    const signature: Record<string, string> = {};
    stateKeys.forEach((k) => {
      const parts = [String(partition[k])];
      result.alphabet.forEach((sym) => {
        const to = transMap[k][sym];
        parts.push(to !== undefined ? String(partition[to]) : "-");
      });
      signature[k] = parts.join("|");
    });
    const sigToClass: Record<string, number> = {};
    let next = 0;
    const newPartition: Record<string, number> = {};
    stateKeys.forEach((k) => {
      if (!(signature[k] in sigToClass)) sigToClass[signature[k]] = next++;
      newPartition[k] = sigToClass[signature[k]];
    });
    const oldClassCount = new Set(Object.values(partition)).size;
    const newClassCount = new Set(Object.values(newPartition)).size;
    partition = newPartition;
    history.push({ ...partition });
    if (newClassCount === oldClassCount) break;
  }
  return history;
}

/**
 * DFA最小化のステップ列を生成する。部分集合構成法で得たDFAに対し、Mooreの分割改良法
 * (Hopcroftのアルゴリズムと同じ最終結果を与える等価類分割の手法)で、まず受理/非受理の
 * 2クラスに分け、各状態の記号ごとの遷移先クラスが一致する状態同士だけをまとめる、
 * という細分化をこれ以上分割できなくなるまで繰り返す。
 */
export function dfaMinimizationSteps(): GraphFrame[] {
  const nodes = SUBSET_CONSTRUCTION_NODES;
  const edges = SUBSET_CONSTRUCTION_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const history = minimizeDfaPartitions(SUBSET_CONSTRUCTION_DFA);
  const frames: GraphFrame[] = [];

  history.forEach((partition, i) => {
    const distances: Record<string, number | null> = {};
    nodes.forEach((n) => {
      distances[n.id] = partition[n.id];
    });
    const classCount = new Set(Object.values(partition)).size;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances,
      description:
        i === 0
          ? `初期分割: 受理状態(クラス1)と非受理状態(クラス0)の2クラスに分ける(頂点下の数字が所属クラス)`
          : `[反復${i}] 各状態を、記号ごとの遷移先クラスの組み合わせ(シグネチャ)が一致する状態同士でグループ化。クラス数=${classCount}`,
    });
  });

  const finalPartition = history[history.length - 1];
  const classCount = new Set(Object.values(finalPartition)).size;
  const finalDistances: Record<string, number | null> = {};
  nodes.forEach((n) => {
    finalDistances[n.id] = finalPartition[n.id];
  });
  frames.push({
    nodeStates: initNodeStates(nodes, "settled"),
    edgeStates: initEdgeStates(edges, "tree"),
    distances: finalDistances,
    description: `計算完了。これ以上分割できず収束。元のDFA${nodes.length}状態が最小${classCount}状態の等価クラスにまとまった`,
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

/**
 * SPFA(Bellman-Ford法のキューによる高速化版)のステップ列を生成する。
 * 全辺を頂点数-1回律儀に繰り返すベルマン・フォード法と違い、実際に距離が更新された頂点だけを
 * キューに積んで再検討することで、多くのグラフで実際に検査する辺の数を減らす。
 * bellman-ford.mdと同じ有向グラフ(負の辺1本含む)を使い、最終的な距離が一致することを確認できる。
 */
export function spfaSteps(): GraphFrame[] {
  const nodes = SHORTEST_PATH_NODES;
  const edges = SHORTEST_PATH_EDGES;
  const start = SHORTEST_PATH_START;
  const dist = initDistances(nodes, start);
  const nodeStates = initNodeStates(nodes, "idle");
  nodeStates[start] = "visited";
  const edgeStates = initEdgeStates(edges, "idle");
  const inQueue = new Set<string>([start]);
  const queue: string[] = [start];

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...dist },
      description: `初期状態(開始頂点${start}をキューに投入、距離0)`,
    },
  ];

  const outgoing = (id: string) => edges.filter((e) => e.from === id);

  while (queue.length > 0) {
    const v = queue.shift()!;
    inQueue.delete(v);
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: { ...dist },
      description: `頂点${v}をキューから取り出す(キュー内 ${queue.length}件)`,
    });

    for (const edge of outgoing(v)) {
      edgeStates[edge.id] = "checking";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: { ...dist },
        description: `辺${edge.from}→${edge.to}(重み${edge.weight})を緩和できるか検査`,
      });

      const fromDist = dist[v];
      const candidate = fromDist === null ? null : fromDist + edge.weight;
      if (candidate !== null && (dist[edge.to] === null || candidate < dist[edge.to]!)) {
        dist[edge.to] = candidate;
        edgeStates[edge.id] = "relaxed";
        nodeStates[edge.to] = "visited";
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: { ...dist },
          description: `緩和成功: dist[${edge.to}]を${candidate}に更新`,
        });
        if (!inQueue.has(edge.to)) {
          inQueue.add(edge.to);
          queue.push(edge.to);
          frames.push({
            nodeStates: { ...nodeStates },
            edgeStates: { ...edgeStates },
            distances: { ...dist },
            description: `頂点${edge.to}をキューに追加(再検討対象、キュー内 ${queue.length}件)`,
          });
        }
      } else {
        edgeStates[edge.id] = "idle";
      }
    }
  }

  nodes.forEach((n) => {
    nodeStates[n.id] = dist[n.id] !== null ? "settled" : "idle";
  });
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: { ...dist },
    description: "計算完了(SPFA: キューが空になるまで緩和を繰り返した。ベルマン・フォード法と同じ最短距離)",
  });

  return frames;
}

/**
 * 逆消去法(Reverse-Delete Algorithm)のステップ列を生成する。
 * クラスカル法とは逆に、辺を重みの大きい順に見ていき、取り除いても
 * グラフの連結性が保たれるならその辺を削除する、を繰り返して最小全域木を求める。
 * MST_EDGES(プリム法・クラスカル法と同じ無向グラフ)を使用。
 */
export function reverseDeleteSteps(): GraphFrame[] {
  const nodes = MST_NODES;
  const sortedEdges = [...MST_EDGES].sort((a, b) => b.weight - a.weight);
  const nodeStates = initNodeStates(nodes, "settled");
  const edgeStates = initEdgeStates(MST_EDGES, "tree");
  const remaining = new Set(MST_EDGES.map((e) => e.id));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `辺を重みの大きい順にソート: ${sortedEdges.map((e) => `${e.from}-${e.to}(${e.weight})`).join(", ")}`,
    },
  ];

  const isConnectedWithout = (excludeId: string): boolean => {
    const adjacency = new Map<string, string[]>();
    nodes.forEach((n) => adjacency.set(n.id, []));
    for (const id of remaining) {
      if (id === excludeId) continue;
      const e = MST_EDGES.find((x) => x.id === id)!;
      adjacency.get(e.from)!.push(e.to);
      adjacency.get(e.to)!.push(e.from);
    }
    const visited = new Set<string>([nodes[0].id]);
    const stack = [nodes[0].id];
    while (stack.length > 0) {
      const v = stack.pop()!;
      for (const w of adjacency.get(v)!) {
        if (!visited.has(w)) {
          visited.add(w);
          stack.push(w);
        }
      }
    }
    return visited.size === nodes.length;
  };

  for (const edge of sortedEdges) {
    edgeStates[edge.id] = "checking";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `辺${edge.from}-${edge.to}(重み${edge.weight})を仮に取り除けるか検討`,
    });

    if (isConnectedWithout(edge.id)) {
      remaining.delete(edge.id);
      edgeStates[edge.id] = "rejected";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `取り除いても連結性を保つため削除`,
      });
    } else {
      edgeStates[edge.id] = "tree";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `取り除くと非連結になるため残す(採用)`,
      });
    }
  }

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: "最小全域木が完成(重い辺から削除し、連結性が壊れる直前で残す判断を繰り返した)",
  });

  return frames;
}

/**
 * 橋(bridges-finding)・関節点(articulation-points)の両方で共有する無向グラフ。
 * 三角形{A,B,C}と三角形{D,E,F}を、辺C-Dだけで繋いだ構造——このC-Dが唯一の橋であり、
 * C・Dの2頂点がそれぞれ関節点(取り除くとグラフが非連結になる頂点)になる。
 */
export const BRIDGE_NODES: GraphNode[] = circleLayout(NODE_IDS);
export const BRIDGE_EDGES: GraphEdge[] = [
  { id: "AB", from: "A", to: "B", weight: 1 },
  { id: "BC", from: "B", to: "C", weight: 1 },
  { id: "CA", from: "C", to: "A", weight: 1 },
  { id: "CD", from: "C", to: "D", weight: 1 },
  { id: "DE", from: "D", to: "E", weight: 1 },
  { id: "EF", from: "E", to: "F", weight: 1 },
  { id: "FD", from: "F", to: "D", weight: 1 },
];

/**
 * 関節点探索のステップ列を生成する。DFSで各頂点に発見時刻(disc)とlow-link値
 * (自分自身か、DFS木の子孫からの後退辺で到達できる最小の発見時刻)を割り当て、
 * 「根でDFS木の子が2つ以上」または「非根の頂点uの子vについてlow[v]≥disc[u]」
 * のいずれかを満たす頂点uを関節点として検出する。
 */
export function articulationPointsSteps(): GraphFrame[] {
  const nodes = BRIDGE_NODES;
  const edges = BRIDGE_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: "DFSで発見時刻とlow-link値を計算し、関節点(取り除くと非連結になる頂点)を探す",
    },
  ];

  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  let timer = 0;
  const articulation = new Set<string>();
  const adjacency = (id: string) => edges.filter((e) => e.from === id || e.to === id);

  const dfs = (u: string, parent: string | null) => {
    disc.set(u, timer);
    low.set(u, timer);
    timer++;
    nodeStates[u] = "visited";
    let children = 0;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `頂点${u}を訪問(発見時刻=${disc.get(u)})`,
    });

    for (const edge of adjacency(u)) {
      const v = otherEnd(edge, u);
      if (v === parent) continue;
      edgeStates[edge.id] = "checking";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `辺${u}-${v}を検査`,
      });

      if (!disc.has(v)) {
        children++;
        edgeStates[edge.id] = "tree";
        dfs(v, u);
        low.set(u, Math.min(low.get(u)!, low.get(v)!));
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `頂点${v}から戻る。low[${u}]を${low.get(u)}に更新`,
        });
        if ((parent === null && children > 1) || (parent !== null && low.get(v)! >= disc.get(u)!)) {
          if (!articulation.has(u)) {
            articulation.add(u);
            frames.push({
              nodeStates: { ...nodeStates },
              edgeStates: { ...edgeStates },
              distances: {},
              description: `頂点${u}は関節点と判定(low[${v}]=${low.get(v)} ≥ disc[${u}]=${disc.get(u)}、または根で子が2つ以上)`,
            });
          }
        }
      } else {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
        edgeStates[edge.id] = "idle";
      }
    }
    nodeStates[u] = "settled";
  };

  dfs(nodes[0].id, null);

  nodes.forEach((n) => {
    if (articulation.has(n.id)) nodeStates[n.id] = "visited";
  });
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。関節点: ${[...articulation].join(", ") || "なし"}`,
  });

  return frames;
}

/**
 * 橋(ブリッジ)探索のステップ列を生成する。関節点探索と全く同じDFS+low-linkの枠組みだが、
 * 判定条件が「low[v] > disc[u](等号を含まない)」になる点だけが異なる——
 * これは「その辺自身を除いて他に迂回路がない」という橋の定義に対応する。
 */
export function bridgesFindingSteps(): GraphFrame[] {
  const nodes = BRIDGE_NODES;
  const edges = BRIDGE_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: "DFSで発見時刻とlow-link値を計算し、橋(唯一の迂回不能な辺)を探す",
    },
  ];

  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  let timer = 0;
  const bridges: string[] = [];
  const adjacency = (id: string) => edges.filter((e) => e.from === id || e.to === id);

  const dfs = (u: string, parentEdgeId: string | null) => {
    disc.set(u, timer);
    low.set(u, timer);
    timer++;
    nodeStates[u] = "visited";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `頂点${u}を訪問(発見時刻=${disc.get(u)})`,
    });

    for (const edge of adjacency(u)) {
      if (edge.id === parentEdgeId) continue;
      const v = otherEnd(edge, u);
      edgeStates[edge.id] = "checking";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `辺${u}-${v}を検査`,
      });

      if (!disc.has(v)) {
        edgeStates[edge.id] = "tree";
        dfs(v, edge.id);
        low.set(u, Math.min(low.get(u)!, low.get(v)!));
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `頂点${v}から戻る。low[${u}]を${low.get(u)}に更新`,
        });
        if (low.get(v)! > disc.get(u)!) {
          bridges.push(edge.id);
          edgeStates[edge.id] = "tree";
          frames.push({
            nodeStates: { ...nodeStates },
            edgeStates: { ...edgeStates },
            distances: {},
            description: `辺${u}-${v}は橋と判定(low[${v}]=${low.get(v)} > disc[${u}]=${disc.get(u)}、迂回路がない)`,
          });
        }
      } else {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
        edgeStates[edge.id] = "idle";
      }
    }
    nodeStates[u] = "settled";
  };

  dfs(nodes[0].id, null);

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。橋: ${bridges.map((id) => edges.find((e) => e.id === id)!).map((e) => `${e.from}-${e.to}`).join(", ") || "なし"}`,
  });

  return frames;
}

export const STABLE_MARRIAGE_MEN = ["M1", "M2", "M3"];
export const STABLE_MARRIAGE_WOMEN = ["W1", "W2", "W3"];
export const STABLE_MARRIAGE_MEN_PREFS: Record<string, string[]> = {
  M1: ["W1", "W2", "W3"],
  M2: ["W2", "W1", "W3"],
  M3: ["W1", "W2", "W3"],
};
export const STABLE_MARRIAGE_WOMEN_PREFS: Record<string, string[]> = {
  W1: ["M2", "M1", "M3"],
  W2: ["M1", "M2", "M3"],
  W3: ["M1", "M2", "M3"],
};
export const STABLE_MARRIAGE_NODES: GraphNode[] = [
  ...STABLE_MARRIAGE_MEN.map((id, i) => ({ id, label: id, x: 0.22, y: 0.2 + i * 0.3 })),
  ...STABLE_MARRIAGE_WOMEN.map((id, i) => ({ id, label: id, x: 0.78, y: 0.2 + i * 0.3 })),
];
export const STABLE_MARRIAGE_EDGES: GraphEdge[] = STABLE_MARRIAGE_MEN.flatMap((m) =>
  STABLE_MARRIAGE_WOMEN.map((w) => ({ id: `${m}-${w}`, from: m, to: w, weight: 1 })),
);

/**
 * Gale-Shapleyアルゴリズム(安定結婚問題)のステップ列を生成する。全員が相手の希望順位を
 * 持つ状態から、「男性側がまだプロポーズしていない中で最も好みの女性に順にプロポーズし、
 * 女性側はプロポーズされた相手と現在の婚約者を比較して、より好みの方だけを受け入れる」
 * ことを繰り返す——この単純な手続きだけで、誰も「今の相手より現在の状況を裏切りたくなる
 * ペア(不安定なペア)」が存在しない安定マッチングに必ず到達することが数学的に保証されている。
 */
export function stableMarriageProblemSteps(): GraphFrame[] {
  const men = STABLE_MARRIAGE_MEN;
  const women = STABLE_MARRIAGE_WOMEN;
  const nodes = STABLE_MARRIAGE_NODES;
  const edges = STABLE_MARRIAGE_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const edgeId = (m: string, w: string) => `${m}-${w}`;

  const nextProposalIndex = new Map<string, number>(men.map((m) => [m, 0]));
  const engagement = new Map<string, string | null>(women.map((w) => [w, null]));
  const freeMen = [...men];

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: "Gale-Shapleyアルゴリズムを開始。全ての男性が未婚(フリー)の状態から始める",
    },
  ];

  while (freeMen.length > 0) {
    const m = freeMen[0];
    const idx = nextProposalIndex.get(m)!;
    const w = STABLE_MARRIAGE_MEN_PREFS[m][idx];
    nextProposalIndex.set(m, idx + 1);
    edgeStates[edgeId(m, w)] = "checking";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `${m}が最も希望順位の高い未プロポーズの相手${w}にプロポーズ`,
    });

    const currentPartner = engagement.get(w);
    if (currentPartner === null) {
      engagement.set(w, m);
      freeMen.shift();
      edgeStates[edgeId(m, w)] = "tree";
      nodeStates[m] = "settled";
      nodeStates[w] = "settled";
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `${w}は未婚だったので${m}のプロポーズを受け入れ、婚約`,
      });
    } else {
      const partner = currentPartner!;
      const wPrefs = STABLE_MARRIAGE_WOMEN_PREFS[w];
      const prefersNew = wPrefs.indexOf(m) < wPrefs.indexOf(partner);
      if (prefersNew) {
        edgeStates[edgeId(partner, w)] = "rejected";
        engagement.set(w, m);
        freeMen.shift();
        freeMen.push(partner);
        edgeStates[edgeId(m, w)] = "tree";
        nodeStates[partner] = "idle";
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `${w}は現在の婚約者${partner}より${m}を好むため、乗り換えて${m}と婚約(${partner}はフリーに戻る)`,
        });
      } else {
        edgeStates[edgeId(m, w)] = "rejected";
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: {},
          description: `${w}は現在の婚約者${partner}の方を好むため、${m}のプロポーズを拒否`,
        });
      }
    }
  }

  const pairs = women.map((w) => `${engagement.get(w)}-${w}`).join(", ");
  frames.push({
    nodeStates: initNodeStates(nodes, "settled"),
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。安定マッチング: ${pairs}(どのペアも「お互いに今の相手より好み合っている」状況が存在しない)`,
  });

  return frames;
}

/**
 * Push-Relabel法(プレフロー・プッシュ法)による最大流のステップ列を生成する。
 * Ford-Fulkerson系アルゴリズムが「増加パスを1本ずつ見つけて全体に流す」のに対し、
 * Push-Relabel法は各頂点に「高さ(height)」を割り当て、height[u] > height[v]+1となる
 * 隣接辺があれば局所的に流量を押し出す(push)、押し出せる辺がなければ自分の高さを
 * 上げる(relabel)、という2つの局所操作だけを繰り返す——大域的な経路探索なしに
 * 局所的な操作の繰り返しだけで最大流に到達できる点が既存のFord-Fulkerson系と対照的。
 */
export function pushRelabelMaxFlowSteps(): GraphFrame[] {
  const nodes = FLOW_NODES;
  const edges = FLOW_EDGES;
  const n = nodes.length;
  const capacity = new Map<string, number>();
  edges.forEach((e) => capacity.set(e.id, e.weight));
  const reverseId = new Map<string, string>();
  const flow = new Map<string, number>();
  edges.forEach((e) => {
    flow.set(e.id, 0);
    const revId = `${e.to}-${e.from}-rev`;
    reverseId.set(e.id, revId);
  });

  const adjacency = new Map<string, { to: string; edgeId: string; isReverse: boolean }[]>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((e) => {
    adjacency.get(e.from)!.push({ to: e.to, edgeId: e.id, isReverse: false });
    adjacency.get(e.to)!.push({ to: e.from, edgeId: e.id, isReverse: true });
  });

  const residual = (edgeId: string, isReverse: boolean): number =>
    isReverse ? flow.get(edgeId)! : capacity.get(edgeId)! - flow.get(edgeId)!;

  const height = new Map<string, number>(nodes.map((node) => [node.id, node.id === FLOW_SOURCE ? n : 0]));
  const excess = new Map<string, number>(nodes.map((node) => [node.id, 0]));

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const edgeLabels = (): Record<string, string> =>
    Object.fromEntries(edges.map((e) => [e.id, `${flow.get(e.id)}/${capacity.get(e.id)}`]));
  const heightDisplay = (): Record<string, number | null> =>
    Object.fromEntries(nodes.map((node) => [node.id, height.get(node.id)!]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: heightDisplay(),
      edgeLabels: edgeLabels(),
      description: `Push-Relabel法を開始。始点Sの高さをn=${n}(頂点数)に設定し、Sから出る全ての辺を容量いっぱいまで流す(前処理)`,
    },
  ];

  for (const e of edges.filter((e2) => e2.from === FLOW_SOURCE)) {
    flow.set(e.id, capacity.get(e.id)!);
    excess.set(e.to, excess.get(e.to)! + capacity.get(e.id)!);
    excess.set(FLOW_SOURCE, excess.get(FLOW_SOURCE)! - capacity.get(e.id)!);
    edgeStates[e.id] = "tree";
  }
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: heightDisplay(),
    edgeLabels: edgeLabels(),
    description: "前処理完了。Sから出る全ての辺が容量いっぱいまで流れ、隣接頂点に余剰(excess)が生じた",
  });

  let guard = 0;
  while (guard++ < 200) {
    const active = nodes.find((node) => node.id !== FLOW_SOURCE && node.id !== FLOW_SINK && excess.get(node.id)! > 0);
    if (!active) break;
    const u = active.id;
    nodeStates[u] = "visited";
    let pushed = false;
    for (const link of adjacency.get(u)!) {
      const res = residual(link.edgeId, link.isReverse);
      if (res > 0 && height.get(u)! === height.get(link.to)! + 1) {
        const amount = Math.min(excess.get(u)!, res);
        if (link.isReverse) flow.set(link.edgeId, flow.get(link.edgeId)! - amount);
        else flow.set(link.edgeId, flow.get(link.edgeId)! + amount);
        excess.set(u, excess.get(u)! - amount);
        excess.set(link.to, excess.get(link.to)! + amount);
        edgeStates[link.edgeId] = "tree";
        frames.push({
          nodeStates: { ...nodeStates },
          edgeStates: { ...edgeStates },
          distances: heightDisplay(),
          edgeLabels: edgeLabels(),
          description: `push: ${u}(高さ${height.get(u)})→${link.to}(高さ${height.get(link.to)})へ${amount}を押し出す`,
        });
        pushed = true;
        break;
      }
    }
    if (!pushed) {
      const minNeighborHeight = Math.min(
        ...adjacency.get(u)!.filter((link) => residual(link.edgeId, link.isReverse) > 0).map((link) => height.get(link.to)!),
      );
      height.set(u, minNeighborHeight + 1);
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: heightDisplay(),
        edgeLabels: edgeLabels(),
        description: `relabel: ${u}から押し出せる辺がないため、高さを${height.get(u)}に引き上げる`,
      });
    }
  }

  const maxFlow = edges.filter((e) => e.from === FLOW_SOURCE).reduce((sum, e) => sum + flow.get(e.id)!, 0);
  frames.push({
    nodeStates: initNodeStates(nodes, "settled"),
    edgeStates: { ...edgeStates },
    distances: heightDisplay(),
    edgeLabels: edgeLabels(),
    description: `計算完了。最大流=${maxFlow}(Edmonds-Karp法・Dinic法・Ford-Fulkerson法と同じ既知の最大流23と一致)`,
  });

  return frames;
}

export const HIERHOLZER_NODES: GraphNode[] = circleLayout(["A", "B", "C", "D", "E"]);
/**
 * 頂点Cを共有する2つの三角形{A,B,C}・{C,D,E}からなる無向グラフ(「8の字」型)。
 * 次数はA=2,B=2,C=4,D=2,E=2と全て偶数なので、オイラーの定理によりオイラー閉路が必ず存在する。
 */
export const HIERHOLZER_EDGES: GraphEdge[] = [
  { id: "AB", from: "A", to: "B", weight: 1 },
  { id: "BC", from: "B", to: "C", weight: 1 },
  { id: "CA", from: "C", to: "A", weight: 1 },
  { id: "CD", from: "C", to: "D", weight: 1 },
  { id: "DE", from: "D", to: "E", weight: 1 },
  { id: "EC", from: "E", to: "C", weight: 1 },
];

/**
 * ヒールホルツァーのアルゴリズムのステップ列を生成する。全頂点の次数が偶数であるという
 * 条件(オイラーの定理)を満たすグラフに対し、まず適当にスタートから戻ってくる閉路を1つ見つけ、
 * その閉路上に未使用の辺を持つ頂点があれば、そこからさらに部分閉路を見つけて元の閉路に
 * 挿入する、という操作を辺が尽きるまで繰り返すことで、全ての辺をちょうど1回ずつ通る
 * オイラー閉路を効率よく(辺の本数に比例する時間で)構築する。
 */
export function hierholzerAlgorithmSteps(): GraphFrame[] {
  const nodes = HIERHOLZER_NODES;
  const edges = HIERHOLZER_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");
  const used = new Set<string>();

  const adjacency = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((e) => {
    adjacency.get(e.from)!.push({ to: e.to, edgeId: e.id });
    adjacency.get(e.to)!.push({ to: e.from, edgeId: e.id });
  });

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: "ヒールホルツァーのアルゴリズムを開始。全頂点の次数が偶数なのでオイラー閉路が存在する",
    },
  ];

  let circuit: string[] = ["A"];
  let insertPos = 0;
  while (insertPos < circuit.length) {
    const v = circuit[insertPos];
    const unusedEdge = adjacency.get(v)!.find((link) => !used.has(link.edgeId));
    if (unusedEdge) {
      used.add(unusedEdge.edgeId);
      edgeStates[unusedEdge.edgeId] = "tree";
      nodeStates[v] = "visited";
      const subCircuit: string[] = [v];
      let cur = unusedEdge.to;
      subCircuit.push(cur);
      while (cur !== v) {
        const next = adjacency.get(cur)!.find((link) => !used.has(link.edgeId));
        if (!next) break;
        used.add(next.edgeId);
        edgeStates[next.edgeId] = "tree";
        cur = next.to;
        subCircuit.push(cur);
      }
      circuit = [...circuit.slice(0, insertPos), ...subCircuit, ...circuit.slice(insertPos + 1)];
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `頂点${v}から部分閉路 ${subCircuit.join("→")} を見つけ、現在の経路に挿入: ${circuit.join("→")}`,
      });
    } else {
      insertPos++;
    }
  }

  frames.push({
    nodeStates: initNodeStates(nodes, "settled"),
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。オイラー閉路: ${circuit.join("→")}(全${edges.length}辺をちょうど1回ずつ通る)`,
  });

  return frames;
}

export const TWO_SAT_VARIABLES = ["x1", "x2", "x3"];
/** (x1∨x2)∧(¬x1∨x3)∧(¬x2∨¬x3)という充足可能な2-CNF論理式。含意グラフのSCC分解で充足可能性を判定する。 */
export const TWO_SAT_CLAUSES: [string, string][] = [
  ["x1", "x2"],
  ["!x1", "x3"],
  ["!x2", "!x3"],
];

function twoSatNegate(lit: string): string {
  return lit.startsWith("!") ? lit.slice(1) : `!${lit}`;
}

export const TWO_SAT_NODES: GraphNode[] = circleLayout(["x1", "!x1", "x2", "!x2", "x3", "!x3"]);
export const TWO_SAT_EDGES: GraphEdge[] = TWO_SAT_CLAUSES.flatMap(([a, b], i) => [
  { id: `c${i}a`, from: twoSatNegate(a), to: b, weight: 1 },
  { id: `c${i}b`, from: twoSatNegate(b), to: a, weight: 1 },
]);

/**
 * 2-SAT問題(2-CNF論理式の充足可能性判定)のステップ列を生成する。各節(¬a∨b)を
 * 「aならばb」「bでないならaでない」という2本の含意(implication)に変換して有向グラフ
 * (含意グラフ)を作る——変数xとその否定¬xが同じ強連結成分(SCC)に含まれてしまう変数が
 * 1つでもあれば、x=真としてもx=偽としても矛盾するため充足不可能、逆に全変数でxと¬xが
 * 別のSCCに属していれば充足可能で、Tarjanの強連結成分分解1回で判定できる。
 */
export function twoSatSteps(): GraphFrame[] {
  const nodes = TWO_SAT_NODES;
  const edges = TWO_SAT_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `2-SATを開始。各節から含意グラフを構築し、Tarjanの強連結成分分解でxと¬xが同じSCCに入らないかを調べる`,
    },
  ];

  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccOf = new Map<string, number>();
  let sccCount = 0;
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
      description: `頂点${v}を訪問(発見時刻=${indices.get(v)})`,
    });
    for (const edge of outgoing(v)) {
      const w = edge.to;
      if (!indices.has(w)) {
        edgeStates[edge.id] = "tree";
        strongconnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }
    if (lowlinks.get(v) === indices.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        sccOf.set(w, sccCount);
        nodeStates[w] = "settled";
        component.push(w);
      } while (w !== v);
      sccCount++;
      frames.push({
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        distances: {},
        description: `SCC#${sccCount - 1}を確定: {${component.join(",")}}`,
      });
    }
  };

  for (const node of nodes) {
    if (!indices.has(node.id)) strongconnect(node.id);
  }

  const variables = TWO_SAT_VARIABLES;
  const satisfiable = variables.every((v) => sccOf.get(v) !== sccOf.get(`!${v}`));
  const assignment = variables.map((v) => `${v}=${sccOf.get(v)! > sccOf.get(`!${v}`)! ? "真" : "偽"}`);

  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: {},
    description: satisfiable
      ? `計算完了。全変数でxと¬xが別のSCCに属するため充足可能。1つの解: ${assignment.join(", ")}`
      : "計算完了。あるxで x と ¬x が同じSCCに属するため充足不可能",
  });

  return frames;
}

export const TEXTRANK_SENTENCES = ["A", "B", "C", "D"];
/** TextRankはPageRankと同じ反復計算だが、頂点=文、辺の重み=文同士の類似度という設定が異なる。 */
export const TEXTRANK_SIMILARITY: Record<string, number> = {
  AB: 0.6,
  AC: 0.2,
  BC: 0.5,
  BD: 0.1,
  CD: 0.7,
};
export const TEXTRANK_NODES: GraphNode[] = circleLayout(TEXTRANK_SENTENCES);
export const TEXTRANK_EDGES: GraphEdge[] = Object.entries(TEXTRANK_SIMILARITY).map(([key, w]) => ({
  id: key,
  from: key[0],
  to: key[1],
  weight: w,
}));
export const TEXTRANK_ITERATIONS = 8;
export const TEXTRANK_DAMPING = 0.85;

/**
 * TextRankのステップ列を生成する。PageRankが「リンクする/される」という有向関係を使うのに対し、
 * TextRankは文同士の類似度(無向・重み付き)を「辺」とみなし、同じべき乗法の反復更新を適用する——
 * 「他の重要な文と強く似ている文ほど重要」という、Webページのリンク構造をテキスト要約に
 * 転用した発想。上位スコアの文を抽出すれば、そのまま抽出型自動要約になる。
 */
export function textrankSteps(): GraphFrame[] {
  const nodes = TEXTRANK_NODES;
  const sentences = TEXTRANK_SENTENCES;
  const n = sentences.length;
  const d = TEXTRANK_DAMPING;

  const weight = (a: string, b: string): number => TEXTRANK_SIMILARITY[`${a}${b}`] ?? TEXTRANK_SIMILARITY[`${b}${a}`] ?? 0;
  const weightedDegree = new Map<string, number>(
    sentences.map((s) => [s, sentences.filter((t) => t !== s).reduce((sum, t) => sum + weight(s, t), 0)]),
  );

  let score = new Map<string, number>(sentences.map((s) => [s, 1 / n]));
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(TEXTRANK_EDGES, "idle");
  const scoreDisplay = (): Record<string, number | null> =>
    Object.fromEntries(sentences.map((s) => [s, Number(score.get(s)!.toFixed(4))]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: scoreDisplay(),
      description: `TextRankを開始。文${sentences.join(",")}のスコアを均等(1/${n})に初期化し、文同士の類似度を辺の重みとして反復更新する`,
    },
  ];

  for (let iter = 1; iter <= TEXTRANK_ITERATIONS; iter++) {
    const next = new Map<string, number>();
    sentences.forEach((s) => {
      const inSum = sentences
        .filter((t) => t !== s)
        .reduce((sum, t) => sum + (weight(s, t) / weightedDegree.get(t)!) * score.get(t)!, 0);
      next.set(s, (1 - d) / n + d * inSum);
    });
    score = next;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: scoreDisplay(),
      description: `[反復${iter}] 各文のスコア = (1-d)/N + d×Σ(類似する文のスコア×類似度の重み/その文の総類似度)`,
    });
  }

  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]);
  frames.push({
    nodeStates: initNodeStates(nodes, "settled"),
    edgeStates: { ...edgeStates },
    distances: scoreDisplay(),
    description: `計算完了。要約に採用する順位: ${ranked.map(([s, r]) => `${s}(${r.toFixed(4)})`).join(" > ")}`,
  });

  return frames;
}

export const REGISTER_INTERFERENCE_NODES: GraphNode[] = circleLayout(["a", "b", "c", "d", "e"]);
/** 5つの一時変数の生存区間が重なる干渉グラフ。彩色数(クリーク数)は3。 */
export const REGISTER_INTERFERENCE_EDGES: GraphEdge[] = [
  { id: "ab", from: "a", to: "b", weight: 1 },
  { id: "ac", from: "a", to: "c", weight: 1 },
  { id: "bc", from: "b", to: "c", weight: 1 },
  { id: "cd", from: "c", to: "d", weight: 1 },
  { id: "ce", from: "c", to: "e", weight: 1 },
  { id: "de", from: "d", to: "e", weight: 1 },
];

/**
 * グラフ彩色によるレジスタ割り当てのステップ列を生成する。プログラム中の一時変数を頂点、
 * 「同時に生存している(生存区間が重なる)変数のペア」を辺とする干渉グラフを作ると、
 * レジスタ割り当て問題は「隣接する頂点が同じ色にならないように、できるだけ少ない色数で
 * 全頂点を彩色する」グラフ彩色問題そのものになる——次数の高い頂点から貪欲に、既に彩色済みの
 * 隣接頂点が使っていない最小の色を割り当てるWelsh-Powellの貪欲彩色法で近似的に解く。
 */
export function registerAllocationGraphColoringSteps(): GraphFrame[] {
  const nodes = REGISTER_INTERFERENCE_NODES;
  const edges = REGISTER_INTERFERENCE_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "tree");
  const colorOf = new Map<string, number>();
  const colorNames = ["R1", "R2", "R3", "R4"];

  const neighbors = new Map<string, string[]>();
  nodes.forEach((node) => neighbors.set(node.id, []));
  edges.forEach((e) => {
    neighbors.get(e.from)!.push(e.to);
    neighbors.get(e.to)!.push(e.from);
  });

  const order = [...nodes].sort((a, b) => neighbors.get(b.id)!.length - neighbors.get(a.id)!.length);
  const colorDisplay = (): Record<string, number | null> =>
    Object.fromEntries(nodes.map((n2) => [n2.id, colorOf.has(n2.id) ? colorOf.get(n2.id)! : null]));

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: colorDisplay(),
      description: `グラフ彩色によるレジスタ割り当てを開始。次数の高い頂点(変数)から順に、隣接する頂点が使っていない最小のレジスタ番号を貪欲に割り当てる`,
    },
  ];

  for (const node of order) {
    const usedColors = new Set(neighbors.get(node.id)!.map((nb) => colorOf.get(nb)).filter((c) => c !== undefined) as number[]);
    let color = 0;
    while (usedColors.has(color)) color++;
    colorOf.set(node.id, color);
    nodeStates[node.id] = "settled";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: colorDisplay(),
      description: `変数${node.id}(次数${neighbors.get(node.id)!.length}): 隣接する変数が使用中の色{${[...usedColors].map((c) => colorNames[c]).join(",") || "なし"}}を避け、${colorNames[color]}を割り当て`,
    });
  }

  const colorsUsed = new Set(colorOf.values()).size;
  frames.push({
    nodeStates: { ...nodeStates },
    edgeStates: { ...edgeStates },
    distances: colorDisplay(),
    description: `計算完了。${colorsUsed}色(レジスタ)で全変数を彩色できた(このグラフの彩色数の下限であるクリークサイズ3と一致)`,
  });

  return frames;
}

export const DE_BRUIJN_READS = ["ATGCA", "TGCAT", "GCATG"];
export const DE_BRUIJN_K = 4;

const DE_BRUIJN_KMER_LIST: string[] = (() => {
  const kmers = new Set<string>();
  for (const read of DE_BRUIJN_READS) {
    for (let i = 0; i + DE_BRUIJN_K <= read.length; i++) kmers.add(read.slice(i, i + DE_BRUIJN_K));
  }
  return [...kmers];
})();
const DE_BRUIJN_VERTICES: string[] = (() => {
  const prefixSet = new Set<string>();
  DE_BRUIJN_KMER_LIST.forEach((km) => {
    prefixSet.add(km.slice(0, -1));
    prefixSet.add(km.slice(1));
  });
  return [...prefixSet];
})();
export const DE_BRUIJN_NODES: GraphNode[] = circleLayout(DE_BRUIJN_VERTICES);
export const DE_BRUIJN_EDGES: GraphEdge[] = DE_BRUIJN_KMER_LIST.map((km, i) => ({
  id: `e${i}`,
  from: km.slice(0, -1),
  to: km.slice(1),
  weight: 1,
}));

/**
 * de Bruijnグラフによるゲノムアセンブリのステップ列を生成する。各リード(短い配列断片)を
 * 長さkの部分文字列(k-mer)に分解し、各k-merの「先頭k-1文字」を頂点、「末尾k-1文字」への
 * 遷移を辺とするグラフを構築する——このグラフ上でオイラー路(全ての辺をちょうど1回通る経路、
 * ヒールホルツァーのアルゴリズムで求まる)を見つけることが、元のゲノム配列の復元に対応する。
 */
export function deBruijnGraphAssemblySteps(): GraphFrame[] {
  const k = DE_BRUIJN_K;
  const kmerList = DE_BRUIJN_KMER_LIST;
  const vertices = DE_BRUIJN_VERTICES;
  const nodes = DE_BRUIJN_NODES;
  const edges = DE_BRUIJN_EDGES;

  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `de Bruijnグラフによるゲノムアセンブリを開始。${DE_BRUIJN_READS.length}本のリードをk=${k}のk-merに分解し、頂点=長さ${k - 1}の接頭辞/接尾辞、辺=k-merとするグラフを構築する`,
    },
  ];

  kmerList.forEach((km, i) => {
    edgeStates[`e${i}`] = "tree";
    nodeStates[km.slice(0, -1)] = "visited";
    nodeStates[km.slice(1)] = "visited";
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `k-mer"${km}"から辺 "${km.slice(0, -1)}"→"${km.slice(1)}" を追加`,
    });
  });

  const inDeg = new Map<string, number>(vertices.map((v) => [v, 0]));
  const outDeg = new Map<string, number>(vertices.map((v) => [v, 0]));
  edges.forEach((e) => {
    outDeg.set(e.from, outDeg.get(e.from)! + 1);
    inDeg.set(e.to, inDeg.get(e.to)! + 1);
  });
  const balanced = vertices.every((v) => inDeg.get(v) === outDeg.get(v));

  frames.push({
    nodeStates: initNodeStates(nodes, "settled"),
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。${vertices.length}頂点・${edges.length}辺のde Bruijnグラフが完成。全頂点で入次数=出次数(${balanced ? "一致" : "不一致"})なのでオイラー閉路が存在し、元のゲノム配列を復元できる`,
  });

  return frames;
}

export const SUFFIX_AUTOMATON_STRING = "abcbc";

type SuffixAutomatonState = { len: number; link: number; transitions: Map<string, number> };

function buildSuffixAutomaton(s: string): SuffixAutomatonState[] {
  const states: SuffixAutomatonState[] = [{ len: 0, link: -1, transitions: new Map() }];
  let last = 0;
  for (const ch of s) {
    const cur = states.length;
    states.push({ len: states[last].len + 1, link: -1, transitions: new Map() });
    let p = last;
    while (p !== -1 && !states[p].transitions.has(ch)) {
      states[p].transitions.set(ch, cur);
      p = states[p].link;
    }
    if (p === -1) {
      states[cur].link = 0;
    } else {
      const q = states[p].transitions.get(ch)!;
      if (states[p].len + 1 === states[q].len) {
        states[cur].link = q;
      } else {
        const clone = states.length;
        states.push({ len: states[p].len + 1, link: states[q].link, transitions: new Map(states[q].transitions) });
        while (p !== -1 && states[p].transitions.get(ch) === q) {
          states[p].transitions.set(ch, clone);
          p = states[p].link;
        }
        states[q].link = clone;
        states[cur].link = clone;
      }
    }
    last = cur;
  }
  return states;
}

const SUFFIX_AUTOMATON_FINAL_STATES = buildSuffixAutomaton(SUFFIX_AUTOMATON_STRING);
export const SUFFIX_AUTOMATON_NODES: GraphNode[] = circleLayout(
  SUFFIX_AUTOMATON_FINAL_STATES.map((_, i) => `q${i}`),
);
export const SUFFIX_AUTOMATON_EDGES: GraphEdge[] = SUFFIX_AUTOMATON_FINAL_STATES.flatMap((st, i) =>
  [...st.transitions.entries()].map(([ch, to]) => ({ id: `q${i}-${ch}-q${to}`, from: `q${i}`, to: `q${to}`, weight: 1 })),
);

/**
 * 接尾辞オートマトン(suffix automaton)の構築ステップ列を生成する。文字列の全ての
 * 部分文字列を(接尾辞木より少ない)最大2n-1状態のDFAとして表現するデータ構造——
 * 1文字ずつ末尾に追加しながら、既存の状態を複製・分岐させる(クローン)ことで、
 * 「新しい文字を追加しても、これまでのどの部分文字列も正しく認識できる」という
 * 不変条件を保ったままオートマトンをオンラインに(1文字ずつ)構築していく。
 */
export function suffixAutomatonSteps(): GraphFrame[] {
  const s = SUFFIX_AUTOMATON_STRING;
  const nodes = SUFFIX_AUTOMATON_NODES;
  const edges = SUFFIX_AUTOMATON_EDGES;
  const nodeStates = initNodeStates(nodes, "idle");
  const edgeStates = initEdgeStates(edges, "idle");

  const frames: GraphFrame[] = [
    {
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `接尾辞オートマトンの構築を開始。文字列"${s}"の全ての部分文字列を認識するDFAを1文字ずつオンラインに構築する`,
    },
  ];

  const states: SuffixAutomatonState[] = [{ len: 0, link: -1, transitions: new Map() }];
  let last = 0;
  let stepIndex = 0;

  for (const ch of s) {
    const cur = states.length;
    states.push({ len: states[last].len + 1, link: -1, transitions: new Map() });
    nodeStates[`q${cur}`] = "visited";
    let p = last;
    while (p !== -1 && !states[p].transitions.has(ch)) {
      states[p].transitions.set(ch, cur);
      edgeStates[`q${p}-${ch}-q${cur}`] = "tree";
      p = states[p].link;
    }
    if (p === -1) {
      states[cur].link = 0;
    } else {
      const q = states[p].transitions.get(ch)!;
      if (states[p].len + 1 === states[q].len) {
        states[cur].link = q;
      } else {
        const clone = states.length;
        states.push({ len: states[p].len + 1, link: states[q].link, transitions: new Map(states[q].transitions) });
        nodeStates[`q${clone}`] = "visited";
        states[q].transitions.forEach((to, c2) => {
          edgeStates[`q${clone}-${c2}-q${to}`] = "tree";
        });
        while (p !== -1 && states[p].transitions.get(ch) === q) {
          states[p].transitions.set(ch, clone);
          edgeStates[`q${p}-${ch}-q${clone}`] = "tree";
          p = states[p].link;
        }
        states[q].link = clone;
        states[cur].link = clone;
      }
    }
    last = cur;
    stepIndex++;
    frames.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      distances: {},
      description: `文字'${ch}'を追加(${stepIndex}/${s.length}文字目)。現在の状態数=${states.length}`,
    });
  }

  frames.push({
    nodeStates: initNodeStates(nodes, "settled"),
    edgeStates: { ...edgeStates },
    distances: {},
    description: `計算完了。文字列"${s}"の接尾辞オートマトンが完成(状態数=${states.length}、全ての部分文字列を認識できる)`,
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
  "bully-algorithm": { nodes: BULLY_NODES, edges: BULLY_EDGES, directed: true },
  "two-phase-commit": { nodes: TWO_PHASE_COMMIT_NODES, edges: TWO_PHASE_COMMIT_EDGES, directed: true },
  raft: { nodes: RAFT_NODES, edges: RAFT_EDGES, directed: true },
  paxos: { nodes: PAXOS_NODES, edges: PAXOS_EDGES, directed: true },
  "vector-clocks": { nodes: VECTOR_CLOCK_NODES, edges: VECTOR_CLOCK_EDGES, directed: true },
  "decision-tree": { nodes: DECISION_TREE_GRAPH_NODES, edges: DECISION_TREE_GRAPH_EDGES, directed: true },
  fft: { nodes: FFT_NODES, edges: FFT_EDGES, directed: true },
  "branch-and-bound": { nodes: BNB_GRAPH_NODES, edges: BNB_GRAPH_EDGES, directed: true },
  minimax: { nodes: GAME_TREE_NODES, edges: GAME_TREE_EDGES, directed: true },
  "alpha-beta-pruning": { nodes: GAME_TREE_NODES, edges: GAME_TREE_EDGES, directed: true },
  "monte-carlo-tree-search": { nodes: GAME_TREE_NODES, edges: GAME_TREE_EDGES, directed: true },
  "thompson-construction": { nodes: THOMPSON_NFA_NODES, edges: THOMPSON_NFA_EDGES, directed: true },
  "subset-construction": { nodes: SUBSET_CONSTRUCTION_NODES, edges: SUBSET_CONSTRUCTION_EDGES, directed: true },
  "dfa-minimization": { nodes: SUBSET_CONSTRUCTION_NODES, edges: SUBSET_CONSTRUCTION_EDGES, directed: true },
  spfa: { nodes: SHORTEST_PATH_NODES, edges: SHORTEST_PATH_EDGES, directed: true },
  "reverse-delete-algorithm": { nodes: MST_NODES, edges: MST_EDGES, directed: false },
  "articulation-points": { nodes: BRIDGE_NODES, edges: BRIDGE_EDGES, directed: false },
  "bridges-finding": { nodes: BRIDGE_NODES, edges: BRIDGE_EDGES, directed: false },
  negamax: { nodes: GAME_TREE_NODES, edges: GAME_TREE_EDGES, directed: true },
  expectimax: { nodes: GAME_TREE_NODES, edges: GAME_TREE_EDGES, directed: true },
  "iterative-deepening-minimax": { nodes: GAME_TREE_NODES, edges: GAME_TREE_EDGES, directed: true },
  "stable-marriage-problem": { nodes: STABLE_MARRIAGE_NODES, edges: STABLE_MARRIAGE_EDGES, directed: false },
  "push-relabel-max-flow": { nodes: FLOW_NODES, edges: FLOW_EDGES, directed: true },
  "hierholzer-algorithm": { nodes: HIERHOLZER_NODES, edges: HIERHOLZER_EDGES, directed: false },
  "two-sat": { nodes: TWO_SAT_NODES, edges: TWO_SAT_EDGES, directed: true },
  textrank: { nodes: TEXTRANK_NODES, edges: TEXTRANK_EDGES, directed: false },
  "register-allocation-graph-coloring": {
    nodes: REGISTER_INTERFERENCE_NODES,
    edges: REGISTER_INTERFERENCE_EDGES,
    directed: false,
  },
  "de-bruijn-graph-assembly": { nodes: DE_BRUIJN_NODES, edges: DE_BRUIJN_EDGES, directed: true },
  "suffix-automaton": { nodes: SUFFIX_AUTOMATON_NODES, edges: SUFFIX_AUTOMATON_EDGES, directed: true },
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
  "bully-algorithm": bullyAlgorithmSteps,
  "two-phase-commit": twoPhaseCommitSteps,
  raft: raftSteps,
  paxos: paxosSteps,
  "vector-clocks": vectorClocksSteps,
  "decision-tree": decisionTreeSteps,
  fft: fftSteps,
  "branch-and-bound": branchAndBoundSteps,
  minimax: minimaxSteps,
  "alpha-beta-pruning": alphaBetaPruningSteps,
  "monte-carlo-tree-search": monteCarloTreeSearchSteps,
  "thompson-construction": thompsonConstructionSteps,
  "subset-construction": subsetConstructionSteps,
  "dfa-minimization": dfaMinimizationSteps,
  spfa: spfaSteps,
  "reverse-delete-algorithm": reverseDeleteSteps,
  "articulation-points": articulationPointsSteps,
  "bridges-finding": bridgesFindingSteps,
  negamax: negamaxSteps,
  expectimax: expectimaxSteps,
  "iterative-deepening-minimax": iterativeDeepeningMinimaxSteps,
  "stable-marriage-problem": stableMarriageProblemSteps,
  "push-relabel-max-flow": pushRelabelMaxFlowSteps,
  "hierholzer-algorithm": hierholzerAlgorithmSteps,
  "two-sat": twoSatSteps,
  textrank: textrankSteps,
  "register-allocation-graph-coloring": registerAllocationGraphColoringSteps,
  "de-bruijn-graph-assembly": deBruijnGraphAssemblySteps,
  "suffix-automaton": suffixAutomatonSteps,
};
