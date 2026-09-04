---
name: 媒介中心性(Betweenness Centrality)
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(V・E)(Brandesのアルゴリズム)
summary: ノード間の最短経路がどれだけそのノードを経由するかを数え、情報の橋渡し役としての重要度を測るグラフ中心性指標。
---

## 概要

グラフ理論における中心性指標の一つで、あるノードが**「他のノード同士をつなぐ橋渡し役としてどれだけ重要か」**を定量化する。PageRankやHITSがリンクの被参照数(次数的な重要度)に着目するのに対し、媒介中心性は「そのノードを経由しないと他のノード同士が最短で到達できない度合い」に着目する点が本質的に異なる。ソーシャルネットワークにおける「異なるコミュニティをつなぐ仲介者」の発見や、交通・通信ネットワークにおけるボトルネックの特定に使われる。

## 仕組み

1. グラフ中の全てのノードペア(s, t)について、sからtへの最短経路の本数 σ(s,t) を求める
2. そのうち、ノードvを経由する最短経路の本数 σ(s,t|v) を求める
3. ノードvの媒介中心性は、全てのペア(s, t)について σ(s,t|v) / σ(s,t) の値を合計したものとして定義される: BC(v) = Σ σ(s,t|v) / σ(s,t)
4. 素朴に実装すると全点対最短経路(O(V³))が必要になるが、**Brandesのアルゴリズム**(2001年)は、各始点からのBFS/ダイクストラ1回ごとに「経路のカウント」と「後方への依存度の伝播」を同時に行うことで、重み無しグラフではO(V・E)、重み付きグラフではO(V・E + V² log V)まで計算量を削減する
5. Brandesのアルゴリズムは、各ノードsから他の全ノードへの最短経路木を構築しながら、末端ノードから逆順に「そのノードが他のペアの最短経路にどれだけ貢献したか」という依存度を積み上げていく、というのが要点

## 特性・トレードオフ

- **計算量**: 素朴な実装はO(V³)だが、Brandesのアルゴリズムにより重み無しグラフでO(V・E)まで削減できる。それでも大規模グラフ(数百万ノード)では計算コストが高く、近似アルゴリズム(サンプリングベース)が使われることも多い
- **次数中心性・固有ベクトル中心性との違い**: 次数中心性は「直接つながっている数」、固有ベクトル中心性(PageRankなど)は「重要なノードからつながっている度合い」を測るのに対し、媒介中心性は「経路上に位置する頻度」という全く異なる観点の重要度を測る
- **ボトルネック検出への強さ**: 直接のつながりは少なくても、異なるクラスタをつなぐ唯一の経路上にあるノードは媒介中心性が非常に高くなる。ネットワークの脆弱点(そのノードが失われると分断される点)の発見に有効
- **使いどころ**: ソーシャルネットワーク分析における「コミュニティ間の橋渡し役」の特定、交通・通信ネットワークのボトルネック分析、感染症の伝播経路分析、組織内の情報流通のキーパーソン発見

## 実装例

```python
from collections import deque


def betweenness_centrality(adj: dict[int, list[int]], n: int) -> dict[int, float]:
    """Brandesのアルゴリズム(重み無し無向・有向グラフ両対応の簡易版)。"""
    centrality = {v: 0.0 for v in range(n)}

    for s in range(n):
        stack: list[int] = []
        predecessors: dict[int, list[int]] = {v: [] for v in range(n)}
        sigma = {v: 0.0 for v in range(n)}
        sigma[s] = 1.0
        dist = {v: -1 for v in range(n)}
        dist[s] = 0

        queue = deque([s])
        while queue:
            v = queue.popleft()
            stack.append(v)
            for w in adj.get(v, []):
                if dist[w] < 0:
                    dist[w] = dist[v] + 1
                    queue.append(w)
                if dist[w] == dist[v] + 1:
                    sigma[w] += sigma[v]
                    predecessors[w].append(v)

        delta = {v: 0.0 for v in range(n)}
        while stack:
            w = stack.pop()
            for v in predecessors[w]:
                delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
            if w != s:
                centrality[w] += delta[w]

    return centrality
```

```typescript
function betweennessCentrality(adj: Map<number, number[]>, n: number): Map<number, number> {
  const centrality = new Map<number, number>();
  for (let v = 0; v < n; v++) centrality.set(v, 0);

  for (let s = 0; s < n; s++) {
    const stack: number[] = [];
    const predecessors = new Map<number, number[]>();
    const sigma = new Map<number, number>();
    const dist = new Map<number, number>();
    for (let v = 0; v < n; v++) {
      predecessors.set(v, []);
      sigma.set(v, 0);
      dist.set(v, -1);
    }
    sigma.set(s, 1);
    dist.set(s, 0);

    const queue: number[] = [s];
    let head = 0;
    while (head < queue.length) {
      const v = queue[head++];
      stack.push(v);
      for (const w of adj.get(v) ?? []) {
        if (dist.get(w)! < 0) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          predecessors.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<number, number>();
    for (let v = 0; v < n; v++) delta.set(v, 0);
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of predecessors.get(w)!) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s) centrality.set(w, centrality.get(w)! + delta.get(w)!);
    }
  }

  return centrality;
}
```
