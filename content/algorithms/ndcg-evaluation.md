---
name: NDCG(正規化減損累積利得, Normalized Discounted Cumulative Gain)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(n log n)
summary: 上位に表示されるほど価値を割り引かずに評価し、理想順序との比で正規化することでランキングの質を測る評価指標。
---

## 概要

検索結果や推薦リストの「並び順そのものの良さ」を定量評価するための、情報検索分野で最も広く使われる評価指標。単に「関連文書が含まれているか」だけでなく、**関連度の高い文書ほど上位に来ているかどうか**、そして**下位に埋もれた関連文書の価値は割り引いて評価する**という、ユーザーの実際の利用体験に即した設計になっている。2000年にJärvelinとKekäläinenが提案し、検索エンジンのA/Bテストやランキング学習(LambdaMARTなど)の目的関数として、業界標準の評価指標として定着している。

## 仕組み

NDCGは3段階の計算で構成される。

1. **CG(累積利得)**: 上位k件の関連度スコアを単純に合計する。CG@k = Σ relevance_i (i=1..k)。ただし、これでは順序を考慮できない(関連度4の文書が1位でも10位でも合計は同じ)
2. **DCG(減損累積利得)**: 順位が下がるほど価値を対数的に割り引く。DCG@k = Σ (2^relevance_i - 1) / log2(i + 1)。分母のlog2(i+1)により、下位の文書ほど貢献度が小さくなる
3. **NDCG(正規化DCG)**: DCGは文書集合のサイズや関連文書の絶対数によって値の範囲が変わってしまうため、**理想的な順序(関連度で降順にソートした場合)のDCG(IDCG)で割って正規化**する。NDCG@k = DCG@k / IDCG@k。これにより、NDCGは常に0〜1の範囲に収まり、クエリ間・システム間で比較可能になる

NDCG@kのkは評価する上位件数(カットオフ)を表し、実務ではNDCG@10やNDCG@5のように、実際にユーザーが目にする範囲に合わせて設定されることが多い。

## 特性・トレードオフ

- **計算量**: 理想順序を求めるためのソートがO(n log n)、DCG自体の計算はO(n)。全体としてO(n log n)
- **精度・再現率との違い**: 精度や再現率は「関連/非関連」の二値判定を前提とするが、NDCGは多段階の関連度ラベル(0〜4など)を扱え、かつ順位による重み付けが組み込まれている点で、より実際のユーザー体験に近い評価ができる
- **理想順序への依存**: NDCGはIDCG(理想的なDCG)で正規化するため、関連文書が極端に少ないクエリでは値が不安定になりやすい。複数クエリの平均(Mean NDCG)を取ることで安定性を高めるのが一般的
- **使いどころ**: 検索エンジン・推薦システムのランキング品質評価、LambdaMARTなどランキング学習の目的関数、A/Bテストでの検索改善効果の定量比較、Kaggleなどのランキングコンペティションの評価指標

## 実装例

```python
import math


def dcg_at_k(relevances: list[float], k: int) -> float:
    score = 0.0
    for i, rel in enumerate(relevances[:k]):
        score += (2**rel - 1) / math.log2(i + 2)
    return score


def ndcg_at_k(relevances: list[float], k: int) -> float:
    """relevancesはランキング順(予測順)に並んだ正解関連度のリスト。"""
    actual_dcg = dcg_at_k(relevances, k)
    ideal_dcg = dcg_at_k(sorted(relevances, reverse=True), k)
    return actual_dcg / ideal_dcg if ideal_dcg > 0 else 0.0
```

```typescript
function dcgAtK(relevances: number[], k: number): number {
  let score = 0;
  for (let i = 0; i < Math.min(k, relevances.length); i++) {
    score += (2 ** relevances[i] - 1) / Math.log2(i + 2);
  }
  return score;
}

function ndcgAtK(relevances: number[], k: number): number {
  // relevancesはランキング順(予測順)に並んだ正解関連度のリスト
  const actualDcg = dcgAtK(relevances, k);
  const idealDcg = dcgAtK([...relevances].sort((a, b) => b - a), k);
  return idealDcg > 0 ? actualDcg / idealDcg : 0;
}
```
