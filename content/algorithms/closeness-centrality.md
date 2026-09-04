---
name: 近接中心性(Closeness Centrality)
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(V・E)(全ノードからのBFS/ダイクストラ)
summary: 他の全ノードへの最短距離の合計が短いほど「グラフ全体に近い」重要なノードとみなす中心性指標。
---

## 概要

グラフ中のあるノードが、**他の全てのノードにどれだけ「近い」位置にあるか**を定量化する中心性指標。1950年代にBavelasらが社会ネットワーク分析の文脈で提案した古典的な指標の一つで、「情報や影響がグラフ全体に伝わるまでの速さ」を測る観点として使われる。他ノードへの最短距離の総和が小さいノードほど、グラフ全体への到達性が高く、中心性が高いと判定される。

## 仕組み

1. ノードvから、グラフ中の全ての他ノードuへの最短距離 d(v, u) を求める(BFSまたはダイクストラ法)
2. それらの距離の合計 Σ d(v, u) を計算する。この合計が小さいほど、vは他の全ノードに「近い」位置にある
3. 近接中心性は、この合計の逆数として定義される: C(v) = (n - 1) / Σ d(v, u)(nはノード数)。距離の合計が短いほど中心性が高くなるよう、逆数を取っている
4. グラフが連結でない場合、到達不能なノードが存在すると距離が無限大になり素朴な定義が破綻するため、実務では**到達可能なノードのみで計算し、到達可能なノード数の割合で補正する**(Wasserman & Faustの調整式)ことが一般的
5. 全ノードについてこの計算を行うには、各ノードを始点としたBFS/ダイクストラを1回ずつ実行する必要がある

## 特性・トレードオフ

- **計算量**: 各ノードを始点とするBFS(重み無しグラフ)がO(V + E)、これを全ノード分行うのでO(V・(V + E)) = O(V² + V・E)。大規模グラフでは近似計算(サンプリングによる推定)が使われる
- **媒介中心性との違い**: 媒介中心性が「経路上に位置する頻度」を測るのに対し、近接中心性は「全体への到達しやすさ」という異なる観点を持つ。両者は高い相関を示すことが多いが、必ずしも一致しない(橋渡し役だが全体には遠いノードなども存在しうる)
- **非連結グラフへの弱さ**: 到達不能なノードがあると単純な定義が使えなくなるため、連結成分ごとに計算するか、調整式を使う必要がある
- **使いどころ**: 組織ネットワークにおける情報伝達の速さの分析、都市計画における交通ネットワークの利便性評価、疫学における感染拡大の速さの予測、SNSにおける影響力の到達範囲の分析

## 実装例

```python
from collections import deque


def closeness_centrality(adj: dict[int, list[int]], n: int) -> dict[int, float]:
    centrality: dict[int, float] = {}

    for v in range(n):
        dist = {v: 0}
        queue = deque([v])
        while queue:
            u = queue.popleft()
            for w in adj.get(u, []):
                if w not in dist:
                    dist[w] = dist[u] + 1
                    queue.append(w)

        reachable = len(dist) - 1  # 自分自身を除く到達可能なノード数
        total_dist = sum(dist.values())
        if reachable == 0 or total_dist == 0:
            centrality[v] = 0.0
        else:
            # 到達可能なノード数の割合で補正(Wasserman & Faustの調整式)
            centrality[v] = (reachable / (n - 1)) * (reachable / total_dist)

    return centrality
```

```typescript
function closenessCentrality(
  adj: Map<number, number[]>,
  n: number,
): Map<number, number> {
  const centrality = new Map<number, number>();

  for (let v = 0; v < n; v++) {
    const dist = new Map<number, number>([[v, 0]]);
    const queue: number[] = [v];
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      for (const w of adj.get(u) ?? []) {
        if (!dist.has(w)) {
          dist.set(w, dist.get(u)! + 1);
          queue.push(w);
        }
      }
    }

    const reachable = dist.size - 1; // 自分自身を除く到達可能なノード数
    let totalDist = 0;
    for (const d of dist.values()) totalDist += d;

    if (reachable === 0 || totalDist === 0) {
      centrality.set(v, 0);
    } else {
      // 到達可能なノード数の割合で補正(Wasserman & Faustの調整式)
      centrality.set(v, (reachable / (n - 1)) * (reachable / totalDist));
    }
  }

  return centrality;
}
```
