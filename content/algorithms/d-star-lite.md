---
name: D* Lite(動的再計画A*)
category: 探索
subcategory: グラフ・経路探索
complexity: O((V+E) log V)
summary: 環境の変化を検知するたびに探索をゼロからやり直すのではなく、影響を受けた部分だけを効率的に再計画するインクリメンタル経路探索アルゴリズムで、ロボティクスの実時間経路計画で広く使われる。
---

## 概要

[A*探索](/algorithms/a-star)はスタートからゴールまでの最短経路を1回限りで求めるには優秀だが、実世界のロボットが動きながら「新しい障害物を発見した」「通れると思っていた道が塞がっていた」といった環境変化に何度も遭遇する場面には向いていない。素朴にA*を毎回最初から実行すると、変化した部分がマップのごく一部であっても、遠く離れたスタートからゴールまでの経路計画を丸ごとやり直すことになり無駄が大きい。D* Liteは、この問題を「変化の影響が及ぶ範囲だけを再計算する」インクリメンタル探索によって解決するアルゴリズムである。ゴールからスタートに向かって逆方向に探索を行い、コスト値をキャッシュしておくことで、障害物の出現・消失があってもその周辺の情報だけを更新すれば最短経路を維持できる。前身であるD*(Dynamic A*)を、より単純でLPA*(Lifelong Planning A*)の考え方に基づいて再構成したアルゴリズムであることから「D* Lite」と呼ばれ、Mars探査ローバーやDARPA Grand Challengeの自律走行車など、実際のロボティクスの現場で採用されてきた実績を持つ。

## 仕組み

D* Liteは、各頂点に2つの値を管理する点が通常のA*と大きく異なる。

- `g(s)`: 現在わかっている、その頂点からゴールまでの最良のコスト見積もり
- `rhs(s)`("right-hand side"): `g(s)`の1手先読み版で、隣接頂点の`g`値をもとに計算される「もっと正確な」見積もり

`g(s) = rhs(s)`のとき、その頂点は**局所的に無矛盾(locally consistent)**であるという。この2つの値が一致していない頂点だけが「まだ整合性が取れていない、再計算が必要な頂点」であり、これらを優先度付きキュー(オープンリスト)で管理する。

1. ゴールを`rhs = 0`として初期化し、他の全頂点は`g = rhs = ∞`とする
2. オープンリストから優先度最小の頂点を取り出し、`g`と`rhs`を一致させる(無矛盾にする)処理を行う。このとき影響を受ける隣接頂点の`rhs`値を再計算し、無矛盾でなくなった頂点をオープンリストに追加し直す
3. スタート地点が無矛盾になり、かつオープンリストの最小優先度がスタートの優先度以上になるまで2を繰り返す。この時点で`g`値が正しく伝播しており、`g`が小さい方向へ貪欲にたどるだけで最短経路が得られる
4. エージェントが経路上を実際に移動しながらセンサーで環境の変化(コストの変わった辺)を検知したら、その辺に関係する頂点の`rhs`だけを再計算してオープンリストに戻し、2〜3を再実行する

重要なのは、ステップ4で「変化した辺の周辺だけ」がオープンリストに入り直す点である。マップの大部分は既に無矛盾なままなので再計算されず、変化が局所的であれば再計画は変化していない場合の探索よりもはるかに高速に完了する。優先度の計算にはスタートからの推定移動量に基づく補正項`km`が使われ、エージェントが移動するたびに座標系がずれても優先度の大小関係を壊さずに済むよう工夫されている。

## 特性・トレードオフ

- **計算量**: 初回の全探索はO((V+E) log V)で[A*探索](/algorithms/a-star)や[ダイクストラ法](/algorithms/dijkstra)と同程度。変化検知後の再計画は、変化の影響範囲に比例したコストで済み、変化が局所的であれば1回のA*再実行よりずっと安い
- **ゴールからスタートへ逆方向に探索する**: エージェント(スタート)は移動するがゴールは固定、という設計を前提にしており、逆方向探索によって「エージェントが動いてもゴール側からの`g`値は再利用できる」という効率を引き出している
- **[A*探索](/algorithms/a-star)との違い**: A*は1回の静的な探索に特化しており環境変化への追従はゼロから再実行するしかない。D* Liteは`g`と`rhs`の差分だけを伝播させる設計により、動的な環境変化への追従を主目的として設計されている
- **前身D*との関係**: D* Liteは元祖D*と同等の機能を、LPA*のインクリメンタル探索の枠組みを使ってより単純なアルゴリズムとして再実装したものであり、実装のしやすさから現在ではD*よりも広く使われている
- **使いどころ**: 自律移動ロボットのように、センサーで逐次環境を観測しながら経路を更新し続ける必要がある場面。マップ全体が事前にわかっていて変化しない場合は素直に[A*探索](/algorithms/a-star)を使う方がシンプルで十分

## 実装例

```python
import heapq
from typing import Dict, List, Optional, Tuple

Node = Tuple[int, int]


class DStarLite:
    """4近傍グリッド上のD* Liteの簡略実装。costsは (from, to) -> コスト。
    障害物は inf コストとして表現する"""

    def __init__(self, costs: Dict[Tuple[Node, Node], float], start: Node, goal: Node):
        self.costs = costs
        self.start = start
        self.goal = goal
        self.km = 0.0
        self.g: Dict[Node, float] = {goal: 0.0}
        self.rhs: Dict[Node, float] = {goal: 0.0}
        self.open: List[Tuple[Tuple[float, float], Node]] = []
        heapq.heappush(self.open, (self._key(goal), goal))

    def _h(self, a: Node, b: Node) -> float:
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    def _g(self, s: Node) -> float:
        return self.g.get(s, float("inf"))

    def _rhs(self, s: Node) -> float:
        return self.rhs.get(s, float("inf"))

    def _key(self, s: Node) -> Tuple[float, float]:
        m = min(self._g(s), self._rhs(s))
        return (m + self._h(self.start, s) + self.km, m)

    def _neighbors(self, s: Node) -> List[Node]:
        x, y = s
        return [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]

    def _cost(self, a: Node, b: Node) -> float:
        return self.costs.get((a, b), 1.0)

    def _update_vertex(self, u: Node) -> None:
        if u != self.goal:
            self.rhs[u] = min(
                (self._g(v) + self._cost(u, v) for v in self._neighbors(u)),
                default=float("inf"),
            )
        self.open = [(k, n) for k, n in self.open if n != u]
        heapq.heapify(self.open)
        if self._g(u) != self._rhs(u):
            heapq.heappush(self.open, (self._key(u), u))

    def compute_shortest_path(self) -> None:
        while self.open and (
            self.open[0][0] < self._key(self.start)
            or self._rhs(self.start) != self._g(self.start)
        ):
            k_old, u = heapq.heappop(self.open)
            if k_old < self._key(u):
                heapq.heappush(self.open, (self._key(u), u))
                continue
            if self._g(u) > self._rhs(u):
                self.g[u] = self._rhs(u)
                for s in self._neighbors(u):
                    self._update_vertex(s)
            else:
                self.g[u] = float("inf")
                for s in self._neighbors(u) + [u]:
                    self._update_vertex(s)

    def update_edge_cost(self, a: Node, b: Node, new_cost: float) -> None:
        """環境変化を反映: 辺(a, b)のコストを更新し、影響範囲だけ再計画する"""
        self.costs[(a, b)] = new_cost
        self._update_vertex(a)
        self.compute_shortest_path()

    def extract_path(self) -> Optional[List[Node]]:
        if self._g(self.start) == float("inf"):
            return None
        path, cur = [self.start], self.start
        while cur != self.goal:
            cur = min(self._neighbors(cur), key=lambda v: self._cost(cur, v) + self._g(v))
            path.append(cur)
        return path
```

```typescript
type Node = string; // "x,y" 形式で頂点を表す

interface EdgeCosts {
  get(from: Node, to: Node): number;
  set(from: Node, to: Node, cost: number): void;
}

function parseNode(s: Node): [number, number] {
  const [x, y] = s.split(",").map(Number);
  return [x, y];
}

function neighborsOf(s: Node): Node[] {
  const [x, y] = parseNode(s);
  return [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`];
}

function heuristic(a: Node, b: Node): number {
  const [ax, ay] = parseNode(a);
  const [bx, by] = parseNode(b);
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

class DStarLite {
  private km = 0;
  private g = new Map<Node, number>();
  private rhs = new Map<Node, number>();
  private open: [[number, number], Node][] = [];

  constructor(
    private costs: EdgeCosts,
    private start: Node,
    private goal: Node,
  ) {
    this.rhs.set(goal, 0);
    this.open.push([this.key(goal), goal]);
  }

  private gOf(s: Node): number {
    return this.g.get(s) ?? Infinity;
  }
  private rhsOf(s: Node): number {
    return this.rhs.get(s) ?? Infinity;
  }
  private key(s: Node): [number, number] {
    const m = Math.min(this.gOf(s), this.rhsOf(s));
    return [m + heuristic(this.start, s) + this.km, m];
  }
  private less(a: [number, number], b: [number, number]): boolean {
    return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  }
  private popMin(): [[number, number], Node] | undefined {
    if (this.open.length === 0) return undefined;
    let bestIdx = 0;
    for (let i = 1; i < this.open.length; i++) {
      if (this.less(this.open[i][0], this.open[bestIdx][0])) bestIdx = i;
    }
    return this.open.splice(bestIdx, 1)[0];
  }

  private updateVertex(u: Node): void {
    if (u !== this.goal) {
      let best = Infinity;
      for (const v of neighborsOf(u)) {
        best = Math.min(best, this.gOf(v) + this.costs.get(u, v));
      }
      this.rhs.set(u, best);
    }
    this.open = this.open.filter(([, n]) => n !== u);
    if (this.gOf(u) !== this.rhsOf(u)) {
      this.open.push([this.key(u), u]);
    }
  }

  computeShortestPath(): void {
    while (this.open.length > 0) {
      const startKey = this.key(this.start);
      const [minKey] = this.open.reduce((a, b) =>
        this.less(a[0], b[0]) ? a : b,
      );
      const done =
        !this.less(minKey, startKey) &&
        this.rhsOf(this.start) === this.gOf(this.start);
      if (done) break;

      const popped = this.popMin();
      if (!popped) break;
      const [kOld, u] = popped;
      const kNew = this.key(u);
      if (this.less(kOld, kNew)) {
        this.open.push([kNew, u]);
      } else if (this.gOf(u) > this.rhsOf(u)) {
        this.g.set(u, this.rhsOf(u));
        for (const s of neighborsOf(u)) this.updateVertex(s);
      } else {
        this.g.set(u, Infinity);
        for (const s of [...neighborsOf(u), u]) this.updateVertex(s);
      }
    }
  }

  // 環境変化を反映: 辺(a, b)のコストを更新し、影響範囲だけ再計画する
  updateEdgeCost(a: Node, b: Node, newCost: number): void {
    this.costs.set(a, b, newCost);
    this.updateVertex(a);
    this.computeShortestPath();
  }

  extractPath(): Node[] | null {
    if (this.gOf(this.start) === Infinity) return null;
    const path = [this.start];
    let cur = this.start;
    while (cur !== this.goal) {
      let bestNext = cur;
      let bestCost = Infinity;
      for (const v of neighborsOf(cur)) {
        const c = this.costs.get(cur, v) + this.gOf(v);
        if (c < bestCost) {
          bestCost = c;
          bestNext = v;
        }
      }
      cur = bestNext;
      path.push(cur);
    }
    return path;
  }
}
```
