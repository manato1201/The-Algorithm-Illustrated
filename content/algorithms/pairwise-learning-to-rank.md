---
name: ペアワイズ・ランク学習(Pairwise Learning to Rank)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(n²)(1クエリあたり、n件の候補文書から全ペアを作る場合)
summary: 「どちらの文書がより関連度が高いか」というペア単位の相対比較を学習データとして与え、その比較を最大限正しく再現できるスコア関数を機械学習で獲得する、[TF-IDF](/algorithms/tf-idf)や[BM25](/algorithms/bm25)のような手作りのスコア式を学習によって置き換えるアプローチ。
---

## 概要

[TF-IDF](/algorithms/tf-idf)や[BM25](/algorithms/bm25)は、人間が設計した数式によって文書の関連度スコアを計算するが、実際の検索ランキングには「単語の一致度」以外にも、クリック率・ページの新しさ・ユーザーの過去の行動履歴など、無数の要因が関わる。ペアワイズ・ランク学習(RankNetやRankSVMに代表される)は、これらの多様な特徴を人手で数式化する代わりに、「文書Aは文書Bより関連度が高い」というペア単位の相対的な正解ラベル(検索ログのクリックデータなどから得られる)を教師データとして与え、機械学習モデルにスコア関数そのものを学習させるアプローチである。「絶対的な関連度スコアを直接当てる」のではなく「相対的な順序を正しく再現する」ことに学習の目標を絞ることで、順位付けという本来の目的に即した最適化を行える。

## 仕組み

1. 各クエリについて、候補となる文書それぞれから特徴ベクトル(TF-IDFスコア・BM25スコア・クリック率・文書の新しさなど、複数のシグナルを組み合わせたベクトル)を作る
2. 検索ログや人手による評価から、「文書Aは文書Bより関連度が高い」というペア単位の相対的な正解ラベルを収集する(絶対的な「関連度5点満点で3点」のような評価より、相対比較の方が人間にとってもクリックログにとっても得やすい情報である)
3. スコア関数`f`(多くの場合ニューラルネットワークや線形モデル)を用意し、`f(A) > f(B)`となるべきペアに対して、実際に`f(A) - f(B)`が正の大きな値になるよう、[誤差逆伝播法](/algorithms/backpropagation)や[勾配降下法](/algorithms/gradient-descent)のような最適化手法でパラメータを調整する
4. 損失関数には、`f(A) - f(B)`をシグモイド関数に通して「Aの方が高い確率」に変換し、正解ラベルとの交差エントロピーを取る(RankNetの手法)などが使われる
5. 学習が完了した`f`は、新しいクエリ・文書ペアに対しても関連度スコアを予測できるようになり、そのスコアで文書をソートすれば検索結果のランキングが得られる

## 特性・トレードオフ

- **計算量**: 1クエリあたりn件の候補文書から作れるペア数は最大`O(n²)`——候補数が多いクエリでは学習時のペア数が急増するため、実務では上位のみをサンプリングするなどの工夫が行われる
- **[RRF](/algorithms/rrf)のような手作りの統合手法との対比**: [RRF(Reciprocal Rank Fusion)](/algorithms/rrf)が「複数のランキングの順位だけを使って統合する」パラメータフリーな手法であるのに対し、ペアワイズ・ランク学習は「大量のペア比較データから最適な統合の仕方そのものを学習する」点で対照的——データが豊富にあり継続的に改善したい実務の検索エンジンではランク学習が、データが少なく安定した統合が欲しい場面では[RRF](/algorithms/rrf)のような手作り手法が選ばれやすい
- **ポイントワイズ・リストワイズとの違い**: ランク学習には「各文書に絶対スコアを直接回帰する」ポイントワイズ、「ペア単位の相対比較を学習する」ペアワイズ、「候補リスト全体の順位を一度に最適化する」リストワイズの3つのアプローチがあり、ペアワイズはその中間的な複雑さと精度のバランスを取る、最も広く実用化されている手法群である
- **使いどころ**: 大規模検索エンジンのランキング学習(検索ログのクリックデータを教師信号として活用)、ECサイトの商品検索・レコメンデーション、広告配信システムにおける入札順位の最適化、[BM25](/algorithms/bm25)等の伝統的手法を初期スコアの1つの特徴量として取り込むハイブリッド構成

## 実装例

線形スコア関数`f(x) = w · x`をRankNet流のペアワイズ損失で学習する。「文書Aは文書Bより関連度が高い」というペアの集合から重みを勾配降下法で更新し、学習後に`f(高関連度の特徴)  > f(低関連度の特徴)`となることを検証する。

```python
import math


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def train_ranknet(
    pairs: list[tuple[list[float], list[float]]],
    n_features: int,
    lr: float = 0.1,
    epochs: int = 500,
) -> list[float]:
    w = [0.0] * n_features

    def score(x: list[float]) -> float:
        return sum(wi * xi for wi, xi in zip(w, x))

    for _ in range(epochs):
        for x_pos, x_neg in pairs:  # x_posはx_negより関連度が高いペア
            p = sigmoid(score(x_pos) - score(x_neg))
            # 交差エントロピー損失の勾配: 正解ラベルは常に1なので (p - 1)
            grad_coeff = (p - 1.0) * lr
            for f in range(n_features):
                w[f] -= grad_coeff * (x_pos[f] - x_neg[f])
    return w
```

```typescript
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function trainRanknet(
  pairs: [number[], number[]][],
  nFeatures: number,
  lr = 0.1,
  epochs = 500,
): number[] {
  const w = new Array(nFeatures).fill(0);
  const score = (x: number[]) => w.reduce((s, wi, f) => s + wi * x[f], 0);

  for (let e = 0; e < epochs; e++) {
    for (const [xPos, xNeg] of pairs) {
      // xPosはxNegより関連度が高いペア
      const p = sigmoid(score(xPos) - score(xNeg));
      // 交差エントロピー損失の勾配: 正解ラベルは常に1なので (p - 1)
      const gradCoeff = (p - 1) * lr;
      for (let f = 0; f < nFeatures; f++) {
        w[f] -= gradCoeff * (xPos[f] - xNeg[f]);
      }
    }
  }
  return w;
}
```

```cpp
#include <vector>
#include <cmath>
#include <utility>

double sigmoid(double x) {
    return 1.0 / (1.0 + std::exp(-x));
}

std::vector<double> trainRanknet(
    const std::vector<std::pair<std::vector<double>, std::vector<double>>>& pairs,
    int nFeatures,
    double lr = 0.1,
    int epochs = 500) {
    std::vector<double> w(nFeatures, 0.0);
    auto score = [&](const std::vector<double>& x) {
        double s = 0.0;
        for (int f = 0; f < nFeatures; f++) s += w[f] * x[f];
        return s;
    };

    for (int e = 0; e < epochs; e++) {
        for (const auto& [xPos, xNeg] : pairs) {
            double p = sigmoid(score(xPos) - score(xNeg));
            // 交差エントロピー損失の勾配: 正解ラベルは常に1なので (p - 1)
            double gradCoeff = (p - 1.0) * lr;
            for (int f = 0; f < nFeatures; f++) {
                w[f] -= gradCoeff * (xPos[f] - xNeg[f]);
            }
        }
    }
    return w;
}
```

```rust
fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

fn train_ranknet(pairs: &[(Vec<f64>, Vec<f64>)], n_features: usize, lr: f64, epochs: usize) -> Vec<f64> {
    let mut w = vec![0.0; n_features];
    let score = |w: &[f64], x: &[f64]| -> f64 { w.iter().zip(x.iter()).map(|(wi, xi)| wi * xi).sum() };

    for _ in 0..epochs {
        for (x_pos, x_neg) in pairs {
            // x_posはx_negより関連度が高いペア
            let p = sigmoid(score(&w, x_pos) - score(&w, x_neg));
            // 交差エントロピー損失の勾配: 正解ラベルは常に1なので (p - 1)
            let grad_coeff = (p - 1.0) * lr;
            for f in 0..n_features {
                w[f] -= grad_coeff * (x_pos[f] - x_neg[f]);
            }
        }
    }
    w
}
```

```csharp
static double Sigmoid(double x) => 1.0 / (1.0 + Math.Exp(-x));

static double[] TrainRanknet(List<(double[] Pos, double[] Neg)> pairs, int nFeatures, double lr = 0.1, int epochs = 500)
{
    var w = new double[nFeatures];
    double Score(double[] x) => w.Zip(x, (wi, xi) => wi * xi).Sum();

    for (int e = 0; e < epochs; e++)
    {
        foreach (var (xPos, xNeg) in pairs)
        {
            // xPosはxNegより関連度が高いペア
            double p = Sigmoid(Score(xPos) - Score(xNeg));
            // 交差エントロピー損失の勾配: 正解ラベルは常に1なので (p - 1)
            double gradCoeff = (p - 1.0) * lr;
            for (int f = 0; f < nFeatures; f++)
                w[f] -= gradCoeff * (xPos[f] - xNeg[f]);
        }
    }
    return w;
}
```
