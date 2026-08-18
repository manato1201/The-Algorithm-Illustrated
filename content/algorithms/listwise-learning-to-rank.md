---
name: リストワイズ・ランク学習(Listwise Learning to Rank)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(n log n)(1クエリあたり、ソート込みの損失計算)
summary: 文書対ごとの順序を個別に学習する[ペアワイズ・ランク学習](/algorithms/pairwise-learning-to-rank)とは異なり、検索結果リスト全体の順列分布を直接最適化するランク学習パラダイム。
---

## 概要

[ペアワイズ・ランク学習](/algorithms/pairwise-learning-to-rank)は「文書Aは文書Bより関連度が高い」というペア単位の相対比較を積み重ねて学習するが、この方式には見落としがある——ペアごとの正誤だけを損失に反映するため、**リストの上位で順序を間違えることと下位で間違えることが同じ重みで扱われてしまう**(検索結果では1位と2位の入れ替わりの方が、9位と10位の入れ替わりよりずっと重大な失敗のはずである)。リストワイズ・ランク学習は、この問題意識から生まれたアプローチで、ペア単位ではなく**候補文書リスト全体を一度に評価する損失関数**を設計し、リストの並び順そのもの(順列)を直接最適化の対象にする。代表的な手法であるListNet(2007年、Zhe Caoらが提案)は、スコアの列を確率分布に変換し、モデルが予測する順列の確率分布と、正解の関連度から導かれる理想的な順列の確率分布との「近さ」を損失として最小化する。

## 仕組み

1. 各クエリについて、候補文書群それぞれの特徴ベクトル(BM25スコア・クリック率・埋め込み類似度など)と、正解の関連度ラベル(0〜4の段階評価やクリックログ由来のスコアなど)を用意する
2. スコア関数`f`(ニューラルネットワークや線形モデル)で各文書のスコア`s_i = f(x_i)`を計算する
3. **Plackett-Luceモデル**を使い、スコアの列から「この順列が生成される確率」を定義する。計算コストの都合上、実務では完全な順列ではなく「どの文書が1位になるか」という**Top-1確率**に単純化することが多い:
   `P(i が1位) = exp(s_i) / Σ_j exp(s_j)`(スコアに対するsoftmax)
4. 正解ラベル`y_i`についても同様にsoftmaxを取り、「理想的なTop-1確率分布」`P_true(i) = exp(y_i) / Σ_j exp(y_j)`を作る
5. モデルの予測分布`P(i)`と理想分布`P_true(i)`の間の**交差エントロピー**を損失として、勾配降下法でスコア関数`f`のパラメータを更新する:
   `Loss = -Σ_i P_true(i)・log P(i)`
6. 学習後の`f`で候補文書全体のスコアを計算し、降順にソートすれば最終的な検索結果ランキングが得られる

## 特性・トレードオフ

- **計算量**: 1クエリあたりの候補数を`n`とすると、Top-1近似を使ったListNetの損失計算はO(n)(softmaxの計算)で済み、最終的な出力にはO(n log n)のソートが必要になる。厳密なPlackett-Luce尤度(全順列を考慮)を使う場合は組合せ的に高コストになるため、Top-1近似や、上位のみを重視するNDCGベースの近似(ListMLE、LambdaMARTなど)が実務では広く使われる
- **[ペアワイズ・ランク学習](/algorithms/pairwise-learning-to-rank)との違い**: ペアワイズは「AとBの相対順序」というローカルな情報だけを損失に使うのに対し、リストワイズはリスト全体の並び順を1つの確率分布として捉え、損失自体がランキング全体の品質と直接結びついている。理論的にはリストワイズの方がランキング指標(NDCGなど)との整合性が高いが、損失関数の設計と実装はペアワイズより複雑になる
- **ポイントワイズとの対比**: 各文書に絶対的な関連度スコアを直接回帰する「ポイントワイズ」は最も単純だが、「順位」という相対的な情報を直接は最適化していない。ポイントワイズ→ペアワイズ→リストワイズの順に、学習の目的関数が実際のランキング評価指標に近づいていく
- **使いどころ**: 検索エンジンのランキング学習(NDCGなど順位に敏感な指標を直接改善したい場面)、広告オークションでの入札順位最適化、レコメンドシステムのアイテムリスト生成。LambdaMART(勾配ブースティング木とリストワイズ的な損失を組み合わせた手法)は、この系譜の中で実務での採用例が特に多い

## 実装例

Top-1確率のPlackett-Luce近似を使ったListNetの簡易実装。線形スコア関数`f(x) = w・x`を、予測分布と正解分布の交差エントロピーで学習する。

```python
import math


def softmax(scores: list[float]) -> list[float]:
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]


def train_listnet(
    queries: list[tuple[list[list[float]], list[float]]],
    n_features: int,
    lr: float = 0.05,
    epochs: int = 300,
) -> list[float]:
    """queries: [(候補文書の特徴ベクトル群, 正解関連度ラベル群), ...]"""
    w = [0.0] * n_features

    def score(x: list[float]) -> float:
        return sum(wi * xi for wi, xi in zip(w, x))

    for _ in range(epochs):
        for features, labels in queries:
            preds = softmax([score(x) for x in features])
            targets = softmax(labels)

            # 交差エントロピー損失の勾配: (予測Top-1確率 - 理想Top-1確率) を各特徴に掛けて集計
            grad = [0.0] * n_features
            for pred_p, target_p, x in zip(preds, targets, features):
                coeff = pred_p - target_p
                for f in range(n_features):
                    grad[f] += coeff * x[f]

            for f in range(n_features):
                w[f] -= lr * grad[f]

    return w


def rank_documents(w: list[float], features: list[list[float]]) -> list[int]:
    scores = [sum(wi * xi for wi, xi in zip(w, x)) for x in features]
    return sorted(range(len(features)), key=lambda i: scores[i], reverse=True)
```

```typescript
function softmax(scores: number[]): number[] {
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

function trainListNet(
  queries: [number[][], number[]][],
  nFeatures: number,
  lr = 0.05,
  epochs = 300,
): number[] {
  const w = new Array(nFeatures).fill(0);
  const score = (x: number[]) => w.reduce((s, wi, f) => s + wi * x[f], 0);

  for (let e = 0; e < epochs; e++) {
    for (const [features, labels] of queries) {
      const preds = softmax(features.map(score));
      const targets = softmax(labels);

      // 交差エントロピー損失の勾配: (予測Top-1確率 - 理想Top-1確率) を各特徴に掛けて集計
      const grad = new Array(nFeatures).fill(0);
      for (let i = 0; i < features.length; i++) {
        const coeff = preds[i] - targets[i];
        for (let f = 0; f < nFeatures; f++) {
          grad[f] += coeff * features[i][f];
        }
      }

      for (let f = 0; f < nFeatures; f++) {
        w[f] -= lr * grad[f];
      }
    }
  }

  return w;
}

function rankDocuments(w: number[], features: number[][]): number[] {
  const scores = features.map((x) => w.reduce((s, wi, f) => s + wi * x[f], 0));
  return scores
    .map((s, i): [number, number] => [i, s])
    .sort((a, b) => b[1] - a[1])
    .map(([i]) => i);
}
```
