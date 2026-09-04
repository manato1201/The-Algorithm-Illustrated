---
name: 縮約階層法(Contraction Hierarchies)
category: 探索
subcategory: グラフ・経路探索
complexity: O(n log n)(前処理)、O(log n)(クエリ、実用上ほぼ定数時間)
summary: 重要度の低い頂点から順に取り除き「近道」を張っておく前処理を施すことで、道路網のような巨大グラフでもクエリ時にはミリ秒未満で最短路を返せるようにする経路探索の高速化手法。
---

## 概要

カーナビやWeb地図サービスは、日本全国あるいは世界規模の道路網(数百万〜数十億の頂点を持つグラフ)に対して、ユーザーからのリクエストのたびにミリ秒単位で最短経路を返す必要がある。素朴なダイクストラ法やA*ではとても間に合わない。2008年にRobert Geisberger、Peter Sanders、Dominik Schultes、Daniel Delling が発表した縮約階層法(Contraction Hierarchies, CH)は、**「事前に頂点を1つずつ取り除きながら、取り除いた頂点を経由していた最短経路を保つための"近道(ショートカット)"を張っておく」**という前処理を行うことで、クエリ時には元のグラフのごく一部だけを見るだけで最短路を求められるようにする。

## 仕組み

1. 全頂点に「重要度」の順序を割り当てる(次数、周辺のショートカット増加数などのヒューリスティックで決める)
2. **重要度が最も低い頂点から順に、1つずつグラフから取り除く(縮約する)**
3. ある頂点vを取り除く際、「vを経由することでのみ実現できていた、まだ残っている頂点u-w間の最短経路」があれば、u-w間に直接つながる「ショートカット辺」を新たに追加する(このショートカットのコストはu→v→wの合計コストに等しい)
4. 全頂点を縮約し終えると、元のグラフにショートカット辺を加えた「拡張グラフ」と、各頂点の縮約順(階層のレベル)が得られる。これが前処理の成果物
5. クエリ時は、スタートとゴールそれぞれから、**「より重要度の高い頂点方向にだけ」辺をたどる双方向ダイクストラ法**を同時に実行する
6. 両方向の探索がある頂点で出会った時点で、その頂点を経由する最短経路が確定する(出会った地点の前後でショートカットを展開すれば元のグラフ上の実経路が得られる)

「重要度の低い脇道は早々に畳み込んでショートカットに置き換え、重要度の高い幹線道路だけを辿れば大部分の距離を一気に飛び越えられる」という直感が、道路網のような階層的な構造を持つグラフで劇的な高速化を生む。

## 特性・トレードオフ

- **計算量**: 前処理はO(n log n)程度(頂点数nに対して、ショートカット数を抑える重要度順序の計算を含む)。**クエリはO(log n)程度、実測では数百万頂点規模の道路網でもマイクロ秒〜ミリ秒単位**という圧倒的な速さになる
- **メモリとのトレードオフ**: ショートカット辺の追加により、元のグラフよりも辺の数が増える(実用上は元の辺数の2倍程度に収まるよう重要度順序が工夫されている)。前処理された拡張グラフを保持するメモリコストが発生する
- **静的グラフが前提**: 道路網のように大きく変化しない静的なグラフに向く。頂点や辺の追加・削除が頻繁だと前処理をやり直すコストが高くつく(部分的な再計算を行う動的CHの研究もある)
- **ALTやHPA*との位置づけ**: ALT(A* with landmarks)はヒューリスティックの改善、HPA*はクラスタ単位の階層化という別のアプローチだが、CHは「グラフそのものを縮約して階層構造を作る」という点で異なる。実運用のカーナビやルーティングエンジン(OSRMなど)ではCHやその発展形(CHASE、Customizable Route Planningなど)が広く採用されている
- **使いどころ**: カーナビ・地図サービスの最短経路検索、大規模な道路網や交通ネットワークでのリアルタイムルーティング、物流・配送最適化における巨大なグラフ上の距離計算の高速化

## 実装例

```python
import heapq
import math
from typing import Iterable

Node = str
Edge = tuple[Node, float]


def contract_graph(
    graph: dict[Node, list[Edge]], order: list[Node]
) -> tuple[dict[Node, list[Edge]], dict[Node, int]]:
    """簡略化した縮約処理: 重要度が低い順に頂点を取り除き、必要なショートカットを追加する"""
    aug_graph = {n: list(edges) for n, edges in graph.items()}
    rank = {node: i for i, node in enumerate(order)}
    remaining = set(graph.keys())

    for v in order:
        remaining.discard(v)
        preds = [(u, w) for u in remaining for (t, w) in aug_graph.get(u, []) if t == v]
        succs = [(t, w) for (t, w) in aug_graph.get(v, []) if t in remaining]
        for u, w_uv in preds:
            for w, w_vw in succs:
                shortcut_cost = w_uv + w_vw
                existing = next((c for (t, c) in aug_graph[u] if t == w), None)
                if existing is None or shortcut_cost < existing:
                    aug_graph[u].append((w, shortcut_cost))

    return aug_graph, rank


def bidirectional_ch_query(
    aug_graph: dict[Node, list[Edge]], rank: dict[Node, int], start: Node, goal: Node
) -> float | None:
    """重要度が上がる方向にのみ辺をたどる、双方向ダイクストラ法"""
    dist_f: dict[Node, float] = {start: 0.0}
    dist_b: dict[Node, float] = {goal: 0.0}
    pq_f: list[tuple[float, Node]] = [(0.0, start)]
    pq_b: list[tuple[float, Node]] = [(0.0, goal)]
    settled_f: set[Node] = set()
    settled_b: set[Node] = set()
    best = math.inf

    def step(pq: list[tuple[float, Node]], dist: dict[Node, float], settled: set[Node]) -> None:
        nonlocal best
        if not pq:
            return
        d, u = heapq.heappop(pq)
        if u in settled:
            return
        settled.add(u)
        if u in dist_f and u in dist_b:
            best = min(best, dist_f[u] + dist_b[u])
        for v, w in aug_graph.get(u, []):
            if rank.get(v, -1) > rank.get(u, -1):  # 重要度が高い方向にのみ進む
                nd = d + w
                if nd < dist.get(v, math.inf):
                    dist[v] = nd
                    heapq.heappush(pq, (nd, v))

    while pq_f or pq_b:
        step(pq_f, dist_f, settled_f)
        step(pq_b, dist_b, settled_b)
        if not pq_f and not pq_b:
            break

    return best if best != math.inf else None
```

```typescript
type Node = string;
type Edge = [Node, number];

function contractGraph(
  graph: Map<Node, Edge[]>,
  order: Node[]
): { augGraph: Map<Node, Edge[]>; rank: Map<Node, number> } {
  const augGraph = new Map<Node, Edge[]>();
  for (const [n, edges] of graph) augGraph.set(n, [...edges]);
  const rank = new Map<Node, number>(order.map((n, i) => [n, i]));
  const remaining = new Set(graph.keys());

  for (const v of order) {
    remaining.delete(v);
    const preds: [Node, number][] = [];
    for (const u of remaining) {
      for (const [t, w] of augGraph.get(u) ?? []) {
        if (t === v) preds.push([u, w]);
      }
    }
    const succs = (augGraph.get(v) ?? []).filter(([t]) => remaining.has(t));

    for (const [u, wUv] of preds) {
      for (const [w, wVw] of succs) {
        const shortcutCost = wUv + wVw;
        const edges = augGraph.get(u)!;
        const existing = edges.find(([t]) => t === w);
        if (!existing || shortcutCost < existing[1]) {
          edges.push([w, shortcutCost]);
        }
      }
    }
  }

  return { augGraph, rank };
}

function bidirectionalCHQuery(
  augGraph: Map<Node, Edge[]>,
  rank: Map<Node, number>,
  start: Node,
  goal: Node
): number | null {
  const distF = new Map<Node, number>([[start, 0]]);
  const distB = new Map<Node, number>([[goal, 0]]);
  const settledF = new Set<Node>();
  const settledB = new Set<Node>();
  let pqF: [number, Node][] = [[0, start]];
  let pqB: [number, Node][] = [[0, goal]];
  let best = Infinity;

  const step = (pq: [number, Node][], dist: Map<Node, number>, settled: Set<Node>): [number, Node][] => {
    if (pq.length === 0) return pq;
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (settled.has(u)) return pq;
    settled.add(u);
    if (distF.has(u) && distB.has(u)) {
      best = Math.min(best, distF.get(u)! + distB.get(u)!);
    }
    for (const [v, w] of augGraph.get(u) ?? []) {
      if ((rank.get(v) ?? -1) > (rank.get(u) ?? -1)) {
        const nd = d + w;
        if (nd < (dist.get(v) ?? Infinity)) {
          dist.set(v, nd);
          pq.push([nd, v]);
        }
      }
    }
    return pq;
  };

  while (pqF.length > 0 || pqB.length > 0) {
    pqF = step(pqF, distF, settledF);
    pqB = step(pqB, distB, settledB);
  }

  return best !== Infinity ? best : null;
}
```
