---
name: LambdaMART
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(木の本数 × 文書数 × log(文書数))
summary: 勾配ブースティング木にランキング評価指標の勾配(λ勾配)を直接組み込んだ、Learning to Rankの代表的な実務手法。
---

## 概要

MicrosoftのChris Burgesらが開発した、Learning to Rank(ランキング学習)の中でも実務で最も広く使われてきた手法の一つ。名前の通り、**LambdaRank**(ニューラルネットベースのランキング学習アルゴリズム)の考え方を、**MART**(Multiple Additive Regression Trees、勾配ブースティング木)に適用したもの。NDCGのようなランキング評価指標は「文書の順位」に依存するため微分不可能だが、LambdaMARTは「ペアを入れ替えたときにNDCGがどれだけ変化するか」を疑似的な勾配(λ勾配)として定義することで、この問題を回避し、勾配ブースティングの枠組みでランキング評価指標を直接最適化する。LightGBMやXGBoostのランキングモードでも実装されており、検索エンジンや推薦システムのリランキング層で広く使われている。

## 仕組み

1. 各クエリについて、候補文書の集合とその正解の関連度ラベル(0〜4段階など)が与えられる
2. 文書ペア(i, j)(iの方がjより関連度が高い)ごとに、両者の入れ替えがNDCGなどの評価指標に与える影響 |ΔNDCG| を計算する
3. このΔNDCGを重みとして、ペアワイズのロジスティック損失の勾配に掛け合わせた**λ勾配**を定義する。関連度の差が大きいペアや、順位を入れ替えるとNDCGへの影響が大きいペア(上位の入れ替え)ほど、大きな勾配が与えられる
4. 通常の勾配ブースティング木(GBDT)の学習と同様に、この疑似勾配を目的関数として決定木を1本ずつ追加学習していく
5. 最終的なスコアは、全ての木の出力の合計として得られ、このスコアで文書をソートすることでランキングを得る

ポイントワイズ学習(個々の文書の関連度を独立に回帰する)やペアワイズ学習(単純に正しい順序かどうかだけを見る)と異なり、LambdaMARTは**評価指標そのものへの影響度を勾配に反映させる**ため、リストワイズに近い最適化効果を持ちながら、勾配ブースティング木の実装のしやすさ・高速さを両立している。

## 特性・トレードオフ

- **計算量**: 木の学習1本あたりO(文書数 × log(文書数))程度(ソートとヒストグラムベースの分割探索に依存)。木の本数(数百〜数千)に比例して全体の学習時間が伸びる
- **ペアワイズ学習との違い**: 通常のペアワイズ手法(RankNetなど)が全てのペアを均等に扱うのに対し、LambdaMARTは|ΔNDCG|による重み付けで「順位への影響が大きいペア」を優先的に学習するため、NDCGなどのランキング指標を直接的に改善しやすい
- **特徴量エンジニアリングへの依存**: ニューラルネット系の手法と異なり、BM25スコア・クリック率・ページの鮮度など、事前に設計された特徴量を入力とする。特徴量の質がモデル性能を大きく左右する
- **使いどころ**: Web検索エンジンの最終リランキング層、eコマースの商品検索順位づけ、Yahoo Learning to Rank Challengeで優勝したことで知られる、実務での標準的なランキング学習手法

## 実装例

```python
from dataclasses import dataclass


@dataclass
class RankedDoc:
    doc_id: int
    relevance: int  # 正解ラベル(関連度、大きいほど関連性が高い)
    score: float     # 現在のモデルによる予測スコア


def dcg_at_position(relevance: int, position: int) -> float:
    import math
    return (2**relevance - 1) / math.log2(position + 2)


def compute_lambda_gradients(docs: list[RankedDoc]) -> dict[int, float]:
    """簡易版: 各文書ペアについてΔNDCGで重み付けしたλ勾配を計算する。"""
    ranked = sorted(docs, key=lambda d: -d.score)
    ideal = sorted(docs, key=lambda d: -d.relevance)
    ideal_dcg = sum(dcg_at_position(d.relevance, i) for i, d in enumerate(ideal)) or 1e-10

    lambdas: dict[int, float] = {d.doc_id: 0.0 for d in docs}
    for i, di in enumerate(ranked):
        for j, dj in enumerate(ranked):
            if di.relevance <= dj.relevance:
                continue
            # ペア(i, j)を入れ替えたときのNDCGの変化量
            delta_dcg = abs(
                (dcg_at_position(di.relevance, i) + dcg_at_position(dj.relevance, j))
                - (dcg_at_position(di.relevance, j) + dcg_at_position(dj.relevance, i))
            )
            delta_ndcg = delta_dcg / ideal_dcg

            score_diff = di.score - dj.score
            rho = 1.0 / (1.0 + pow(2.718281828, score_diff))
            lam = rho * delta_ndcg
            lambdas[di.doc_id] -= lam
            lambdas[dj.doc_id] += lam
    return lambdas
```

```typescript
interface RankedDoc {
  docId: number;
  relevance: number; // 正解ラベル(関連度、大きいほど関連性が高い)
  score: number;      // 現在のモデルによる予測スコア
}

function dcgAtPosition(relevance: number, position: number): number {
  return (2 ** relevance - 1) / Math.log2(position + 2);
}

function computeLambdaGradients(docs: RankedDoc[]): Map<number, number> {
  const ranked = [...docs].sort((a, b) => b.score - a.score);
  const ideal = [...docs].sort((a, b) => b.relevance - a.relevance);
  const idealDcg =
    ideal.reduce((sum, d, i) => sum + dcgAtPosition(d.relevance, i), 0) || 1e-10;

  const lambdas = new Map<number, number>(docs.map((d) => [d.docId, 0]));
  for (let i = 0; i < ranked.length; i++) {
    for (let j = 0; j < ranked.length; j++) {
      const di = ranked[i];
      const dj = ranked[j];
      if (di.relevance <= dj.relevance) continue;

      const deltaDcg = Math.abs(
        dcgAtPosition(di.relevance, i) +
          dcgAtPosition(dj.relevance, j) -
          (dcgAtPosition(di.relevance, j) + dcgAtPosition(dj.relevance, i)),
      );
      const deltaNdcg = deltaDcg / idealDcg;

      const scoreDiff = di.score - dj.score;
      const rho = 1 / (1 + Math.exp(scoreDiff));
      const lam = rho * deltaNdcg;
      lambdas.set(di.docId, lambdas.get(di.docId)! - lam);
      lambdas.set(dj.docId, lambdas.get(dj.docId)! + lam);
    }
  }
  return lambdas;
}
```
