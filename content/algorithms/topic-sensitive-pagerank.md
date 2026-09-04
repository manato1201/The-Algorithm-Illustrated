---
name: トピック指向PageRank(Topic-Sensitive PageRank)
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(V + E)(トピックごとに反復1回あたり)
summary: あらかじめ定義した複数のトピックごとにジャンプ先を偏らせたPageRankベクトルを事前計算し、クエリの文脈に応じて組み合わせる手法。
---

## 概要

2002年にTaher Haveliwalaが提案した、PageRankを「クエリの文脈」に適応させるための拡張手法。通常のPageRankは、どんなクエリであっても同じ重要度スコアを返すが、実際には「ジャガー」という検索語が動物についてのページ群を求めているのか、自動車についてのページ群を求めているのかによって、望ましいランキングは異なる。トピック指向PageRankは、あらかじめODP(Open Directory Project)のような分類体系の**各トピックカテゴリに属するページ集合をジャンプ先として偏らせた複数のPageRankベクトル**を事前計算しておき、実際の検索時にはクエリの内容から推定したトピック分布に応じてそれらを組み合わせる。

## 仕組み

1. Web全体をいくつかのトピックカテゴリ(スポーツ・科学・エンターテインメントなど)に分類した参照カテゴリ(例: ODPの上位カテゴリ)を用意する
2. 各トピックtについて、「そのトピックに属するページ集合」にランダムジャンプの確率を偏らせたPersonalized PageRankを計算し、トピックtに特化したPageRankベクトル π_t を得る(全トピック分、事前にオフラインで計算しておく)
3. 検索クエリが来たら、クエリの文脈(周辺の検索語やユーザーの過去の検索履歴など)から、各トピックへの関連度の分布 w_t を推定する
4. 最終的なランキングスコアは、事前計算した各トピックのPageRankベクトルを、推定した重みで線形結合したものとして得られる: score(p) = Σ w_t・π_t(p)
5. これにより、クエリ時にはPageRankを再計算する必要がなく、事前計算済みのベクトルの加重和を取るだけで、文脈に応じたランキングを高速に得られる

Personalized PageRank(特定のユーザーや興味に基づく単一のバイアスベクトル)との違いは、トピック指向PageRankが**あらかじめ定義された複数のトピックカテゴリそれぞれについて独立にPageRankを計算し、クエリごとにそれらを動的に混合する**という、より体系的な枠組みを持つ点にある。

## 特性・トレードオフ

- **計算量**: 各トピックのPageRankベクトルの事前計算はトピック数 × O(V + E)。ただしこれはオフラインで1回行えばよく、検索時にはベクトルの線形結合(O(トピック数 × 非ゼロ要素数))のみで済むため高速
- **Personalized PageRankとの違い**: Personalized PageRankは単一のバイアスベクトル(1人のユーザーや1つの興味)に対する計算だが、トピック指向PageRankは複数のトピックベクトルを事前計算し、クエリごとに動的に混合する点でより柔軟
- **トピック分類への依存**: 精度はトピックカテゴリの粒度と、クエリからトピック分布を推定する精度に依存する。カテゴリが粗すぎると効果が薄く、細かすぎると事前計算コストが膨大になる
- **使いどころ**: 多義語を含むクエリの検索精度向上、パーソナライズ検索の基盤技術、垂直検索(ニュース検索・商品検索など特定分野に特化した検索)におけるドメイン適応ランキング

## 実装例

```python
def personalized_pagerank_for_topic(
    adj: dict[int, list[int]],
    n: int,
    topic_pages: set[int],
    damping: float = 0.85,
    iterations: int = 100,
) -> dict[int, float]:
    bias = 1.0 / len(topic_pages)
    scores = {v: (bias if v in topic_pages else 0.0) for v in range(n)}
    out_degree = {v: len(adj.get(v, [])) for v in range(n)}

    for _ in range(iterations):
        new_scores = {v: (1 - damping) * (bias if v in topic_pages else 0.0) for v in range(n)}
        for u in range(n):
            if out_degree[u] == 0:
                continue
            share = scores[u] / out_degree[u]
            for v in adj[u]:
                new_scores[v] += damping * share
        scores = new_scores
    return scores


def topic_sensitive_score(
    topic_vectors: dict[str, dict[int, float]],
    query_topic_weights: dict[str, float],
    page: int,
) -> float:
    """事前計算済みのトピックごとのPageRankベクトルを、クエリのトピック分布で加重合成する。"""
    return sum(
        weight * topic_vectors[topic].get(page, 0.0)
        for topic, weight in query_topic_weights.items()
    )
```

```typescript
function personalizedPageRankForTopic(
  adj: Map<number, number[]>,
  n: number,
  topicPages: Set<number>,
  damping = 0.85,
  iterations = 100,
): Map<number, number> {
  const bias = 1 / topicPages.size;
  let scores = new Map<number, number>();
  for (let v = 0; v < n; v++) scores.set(v, topicPages.has(v) ? bias : 0);

  const outDegree = new Map<number, number>();
  for (let v = 0; v < n; v++) outDegree.set(v, (adj.get(v) ?? []).length);

  for (let iter = 0; iter < iterations; iter++) {
    const newScores = new Map<number, number>();
    for (let v = 0; v < n; v++) {
      newScores.set(v, (1 - damping) * (topicPages.has(v) ? bias : 0));
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

function topicSensitiveScore(
  topicVectors: Map<string, Map<number, number>>,
  queryTopicWeights: Map<string, number>,
  page: number,
): number {
  // 事前計算済みのトピックごとのPageRankベクトルを、クエリのトピック分布で加重合成する
  let score = 0;
  for (const [topic, weight] of queryTopicWeights) {
    score += weight * (topicVectors.get(topic)?.get(page) ?? 0);
  }
  return score;
}
```
