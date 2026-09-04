---
name: TrustRank
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(V + E)(反復1回あたり)
summary: 人手で選定した信頼できるページ集合からリンクを辿って「信頼度」を伝播させ、Webスパムを検出・抑制するPageRankの派生手法。
---

## 概要

2004年にGyöngyi・Garcia-Molina・Pedersen(Stanford/Yahoo)が提案した、Webスパム対策のためのランキング手法。PageRankは「リンクされている数が多いほど重要」という発想に基づくが、この性質は意図的にリンクを操作する**リンクファーム**のようなスパム手法に悪用されやすいという弱点がある。TrustRankは、まず人手で厳選した「信頼できるページ(シードページ)」の集合を出発点とし、そこからのリンクを辿って信頼度を伝播させることで、スパムページが不当に高いスコアを得るのを防ぐ。

## 仕組み

1. 専門家による審査などを通じて、信頼性が非常に高いと判断できる少数のページ集合(シードページ、例えば政府機関・大学・主要メディアのトップページなど)を選定する
2. シードページに初期の信頼スコア(トラストスコア)を割り当て、それ以外のページの初期スコアは0とする
3. PageRankと同様の反復計算で、各ページが自分のトラストスコアをリンク先に分配し、他ページから受け取ったスコアを合算する、という操作を繰り返す
4. 「信頼できるページは、通常は他の信頼できるページにリンクする」という前提のもと、シードから遠いページほど(スパムページである可能性が高いページほど)受け取るトラストスコアが小さくなる
5. 最終的なTrustRankスコアが著しく低いページを、Webスパムの疑いがあるページとしてフィルタリングしたり、検索ランキングでの重みを下げたりする

PageRankが「均等な初期値からグラフ全体で重要度を測る」のに対し、TrustRankは「信頼できる少数の起点から信頼を伝播させる」という非対称な設計により、スパムページが自作自演のリンクで高スコアを得ることを構造的に防ぐ。

## 特性・トレードオフ

- **計算量**: PageRankと同じく1回の反復がO(V + E)で、収束するまで複数回繰り返す
- **PersonalizedPageRankとの違い**: 数式上の構造はPersonalized PageRank(特定ノード集合にジャンプ確率を集中させる)と類似しているが、TrustRankの目的は「個人向けのパーソナライズ」ではなく「スパム検出のための信頼度伝播」という点で用途が異なる
- **シード選定への依存**: TrustRankの精度はシードページの選定品質に大きく依存する。シードが偏っていたり不十分だったりすると、正当なページが不当に低スコアになる「false negative」が起きうる
- **使いどころ**: 検索エンジンにおけるWebスパムの検出・フィルタリング、リンクファームやコンテンツファームの識別、信頼性の低いドメインを検索結果からデランキングする仕組みの基盤

## 実装例

```python
def trustrank(
    adj: dict[int, list[int]],
    n: int,
    seed_nodes: set[int],
    damping: float = 0.85,
    iterations: int = 100,
) -> dict[int, float]:
    if not seed_nodes:
        raise ValueError("seed_nodesは1つ以上指定する必要がある")

    # シードページにのみ初期トラストを割り当てる(均等分配)
    seed_value = 1.0 / len(seed_nodes)
    scores = {v: (seed_value if v in seed_nodes else 0.0) for v in range(n)}
    out_degree = {v: len(adj.get(v, [])) for v in range(n)}

    for _ in range(iterations):
        new_scores = {v: (1 - damping) * (seed_value if v in seed_nodes else 0.0) for v in range(n)}
        for u in range(n):
            if out_degree[u] == 0:
                continue
            share = scores[u] / out_degree[u]
            for v in adj[u]:
                new_scores[v] += damping * share
        scores = new_scores

    return scores
```

```typescript
function trustRank(
  adj: Map<number, number[]>,
  n: number,
  seedNodes: Set<number>,
  damping = 0.85,
  iterations = 100,
): Map<number, number> {
  if (seedNodes.size === 0)
    throw new Error("seedNodesは1つ以上指定する必要がある");

  // シードページにのみ初期トラストを割り当てる(均等分配)
  const seedValue = 1 / seedNodes.size;
  let scores = new Map<number, number>();
  for (let v = 0; v < n; v++) scores.set(v, seedNodes.has(v) ? seedValue : 0);

  const outDegree = new Map<number, number>();
  for (let v = 0; v < n; v++) outDegree.set(v, (adj.get(v) ?? []).length);

  for (let iter = 0; iter < iterations; iter++) {
    const newScores = new Map<number, number>();
    for (let v = 0; v < n; v++) {
      newScores.set(v, (1 - damping) * (seedNodes.has(v) ? seedValue : 0));
    }

    for (let u = 0; u < n; u++) {
      const deg = outDegree.get(u)!;
      if (deg === 0) continue;
      const share = scores.get(u)! / deg;
      for (const v of adj.get(u) ?? []) {
        newScores.set(v, newScores.get(v)! + damping * share);
      }
    }
    scores = newScores;
  }

  return scores;
}
```
