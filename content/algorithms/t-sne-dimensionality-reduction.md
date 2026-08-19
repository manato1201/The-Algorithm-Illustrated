---
name: t-SNEによる次元削減(t-Distributed Stochastic Neighbor Embedding)
category: 機械学習
subcategory: 教師なし学習
complexity: O(n²)(素朴な実装。n=サンプル数。Barnes-Hut近似を使う実装ではO(n log n))
summary: 高次元空間での点同士の類似度分布と低次元空間での類似度分布(自由度の低いt分布)を近づけるように埋め込みを最適化する、クラスタ構造の可視化に強い非線形次元削減手法。
---

## 概要

[主成分分析(PCA)](/algorithms/pca)は分散が最大になる方向への**線形**な射影によって次元を削減するため、データが高次元空間の中で曲がりくねった非線形な構造(多様体)を持つ場合、その構造を2次元・3次元にうまく写し取れないことがある。t-SNE(t-distributed Stochastic Neighbor Embedding)は、2008年にローレンス・ファン・デル・マーテンとジェフリー・ヒントンによって提案された、可視化を主目的とする**非線形**次元削減手法である。基本的な発想は「高次元空間で近くにあった点同士は、低次元空間でも近くに配置し、遠くにあった点同士は遠くに配置する」という、点同士の**近さの分布**を保存するという考え方に立つ。高次元空間での類似度は正規分布に基づく条件付き確率で、低次元空間での類似度は裾の重い**t分布**(自由度1、コーシー分布に相当)に基づく確率で表現し、この2つの確率分布の差(KLダイバージェンス)を最小化するように低次元の埋め込み座標を勾配降下法で最適化する。t分布の裾が重いことが、低次元空間でクラスタ同士を適度に離して配置し、「クラウディング問題」(高次元の構造を低次元に押し込めたときに点が中心に密集してしまう現象)を緩和する鍵になっている。

## 仕組み

1. 高次元空間で、各点のペア`(x_i, x_j)`について、`x_i`を中心とするガウス分布のもとで`x_j`が近傍として選ばれる条件付き確率`p_{j|i}`を計算し、対称化した同時確率`p_{ij} = (p_{j|i} + p_{i|j}) / 2n`を得る。ガウス分布の分散は、各点の周りの「実効的な近傍数」を指定するハイパーパラメータ**perplexity**(典型的に5〜50)に応じて点ごとに自動調整される
2. 低次元空間(通常2次元)の埋め込み座標`y_i`をランダムに初期化する
3. 低次元空間でも各点のペア`(y_i, y_j)`について類似度`q_{ij}`を計算するが、ここではガウス分布ではなく**自由度1のt分布**(裾が重い)を使う: `q_{ij} ∝ (1 + ||y_i - y_j||²)^-1`
4. 高次元の分布`P`と低次元の分布`Q`の差を**KLダイバージェンス** `KL(P||Q) = Σ_ij p_{ij} log(p_{ij}/q_{ij})`で測り、これを損失関数として低次元座標`y_i`について勾配降下法で最小化する
5. 勾配は「`p_{ij}`が`q_{ij}`より大きい(高次元で近いのに低次元で遠い)ペアを引き寄せ、逆のペアを引き離す」という力学的な引力・斥力として解釈でき、モーメンタムを併用した勾配降下法で数百〜数千反復かけて座標を更新していく
6. 収束した`y_i`の集合が、元の高次元データのクラスタ構造を反映した低次元の埋め込みとなる

## 特性・トレードオフ

- **計算量**: 素朴な実装では全ペアの類似度計算に`O(n²)`かかるため大規模データには不向きだが、Barnes-Hut近似(空間分割木を使い遠方の点をまとめて近似する)を用いた実装は`O(n log n)`に高速化されており、これが一般的なライブラリのデフォルト実装になっている
- **[主成分分析(PCA)](/algorithms/pca)との違い**: PCAは分散を最大化する固定の線形射影であり、同じデータには常に同じ結果(回転・符号の違いを除いて一意)が得られ、新しい点への射影も容易にできる。t-SNEは点同士の局所的な近さの分布を保存する非線形な最適化であり、実行のたびに(初期化やハイパーパラメータ次第で)結果が変わりうる上、新しい点を既存の埋め込みに追加するのは自明ではない(学習済みモデルとして再利用しにくい)。その代わりPCAでは潰れてしまう非線形なクラスタ構造をt-SNEは鮮明に可視化できる
- **軸や距離のスケールに解釈を与えられない**: t-SNEの埋め込みでは、クラスタ同士の**相対的な位置関係や距離の大小**を定量的な意味として解釈してはならない——クラスタ間の距離やクラスタの大きさは最適化の副産物であり、「近いクラスタは似ている」といった直接的な解釈は保証されない。あくまで「同じクラスタに属する点同士がまとまって見える」という定性的な構造の可視化のための手法である
- **perplexityへの感受性**: perplexityの値によって見える構造(クラスタの粒度)が大きく変わるため、同じデータでも複数のperplexity値で試して結果を比較検討する必要がある。近年ではより高速でグローバルな構造も保持しやすいUMAPという発展的な手法もよく使われる
- **使いどころ**: 高次元の埋め込みベクトル(単語埋め込み、画像特徴量、単一細胞RNAシーケンシングデータなど)を2次元・3次元に可視化してクラスタ構造を目視確認する用途、[k-means法](/algorithms/k-means)や[階層的クラスタリング](/algorithms/hierarchical-clustering)で見つけたクラスタの妥当性を視覚的に検証する補助ツール、[主成分分析(PCA)](/algorithms/pca)で捉えきれない非線形な構造を持つデータの探索的分析

## 実装例

1次元への埋め込みを例に、高次元(ガウス類似度)から低次元(t分布類似度)へのKLダイバージェンスを勾配降下法で最小化する、簡略化されたt-SNEを実装する(perplexityの自動調整は固定分散で代替している)。

```python
import math
import random


def _pairwise_sq_dist(X: list[list[float]]) -> list[list[float]]:
    n = len(X)
    d2 = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            d2[i][j] = sum((X[i][k] - X[j][k]) ** 2 for k in range(len(X[i])))
    return d2


def _high_dim_affinities(d2: list[list[float]], sigma2: float) -> list[list[float]]:
    """固定分散sigma2のガウス類似度から対称化した同時確率p_ijを求める(perplexity自動調整の簡略版)。"""
    n = len(d2)
    p = [[0.0] * n for _ in range(n)]
    for i in range(n):
        row = [math.exp(-d2[i][j] / (2 * sigma2)) if j != i else 0.0 for j in range(n)]
        total = sum(row) or 1e-12
        for j in range(n):
            p[i][j] = row[j] / total
    sym = [[(p[i][j] + p[j][i]) / (2 * n) for j in range(n)] for i in range(n)]
    return sym


def tsne_1d(
    X: list[list[float]], sigma2: float = 1.0, lr: float = 10.0, iterations: int = 500, seed: int = 0,
) -> list[float]:
    n = len(X)
    d2 = _pairwise_sq_dist(X)
    p = _high_dim_affinities(d2, sigma2)
    rng = random.Random(seed)
    y = [rng.gauss(0, 1e-2) for _ in range(n)]

    for _ in range(iterations):
        # 低次元での類似度q_ij(自由度1のt分布)を計算する
        num = [[0.0] * n for _ in range(n)]
        total = 0.0
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                num[i][j] = 1.0 / (1.0 + (y[i] - y[j]) ** 2)
                total += num[i][j]
        q = [[num[i][j] / total if total > 0 else 0.0 for j in range(n)] for i in range(n)]

        # KLダイバージェンスの勾配で埋め込み座標yを更新する(引力・斥力として解釈できる)
        grad = [0.0] * n
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                grad[i] += 4 * (p[i][j] - q[i][j]) * num[i][j] * (y[i] - y[j])
        y = [y[i] - lr * grad[i] for i in range(n)]
    return y
```

```typescript
function pairwiseSqDist(X: number[][]): number[][] {
  const n = X.length;
  const d2 = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < X[i].length; k++) s += (X[i][k] - X[j][k]) ** 2;
      d2[i][j] = s;
    }
  }
  return d2;
}

// 固定分散sigma2のガウス類似度から対称化した同時確率p_ijを求める(perplexity自動調整の簡略版)
function highDimAffinities(d2: number[][], sigma2: number): number[][] {
  const n = d2.length;
  const p = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const row = Array.from({ length: n }, (_, j) =>
      j !== i ? Math.exp(-d2[i][j] / (2 * sigma2)) : 0,
    );
    const total = row.reduce((a, b) => a + b, 0) || 1e-12;
    for (let j = 0; j < n; j++) p[i][j] = row[j] / total;
  }
  const sym = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (p[i][j] + p[j][i]) / (2 * n)),
  );
  return sym;
}

function gaussRandom(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function tsne1d(
  X: number[][],
  sigma2 = 1.0,
  lr = 10.0,
  iterations = 500,
  rand: () => number = Math.random,
): number[] {
  const n = X.length;
  const d2 = pairwiseSqDist(X);
  const p = highDimAffinities(d2, sigma2);
  let y = Array.from({ length: n }, () => gaussRandom(rand) * 1e-2);

  for (let iter = 0; iter < iterations; iter++) {
    // 低次元での類似度q_ij(自由度1のt分布)を計算する
    const num = Array.from({ length: n }, () => new Array(n).fill(0));
    let total = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        num[i][j] = 1 / (1 + (y[i] - y[j]) ** 2);
        total += num[i][j];
      }
    }
    const q = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (total > 0 ? num[i][j] / total : 0)),
    );

    // KLダイバージェンスの勾配で埋め込み座標yを更新する(引力・斥力として解釈できる)
    const grad = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        grad[i] += 4 * (p[i][j] - q[i][j]) * num[i][j] * (y[i] - y[j]);
      }
    }
    y = y.map((yi, i) => yi - lr * grad[i]);
  }
  return y;
}
```
