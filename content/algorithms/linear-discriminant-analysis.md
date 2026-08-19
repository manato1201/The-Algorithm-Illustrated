---
name: 線形判別分析(LDA / Linear Discriminant Analysis)
category: 機械学習
subcategory: 教師あり学習
complexity: O(nd² + d³)(共分散行列の計算と固有値分解、n=サンプル数、d=特徴数)
summary: クラス間分散とクラス内分散の比を最大化する射影方向を求めることで、ラベル情報を使ってクラスを最もよく分離する低次元空間へデータを写す教師あり次元削減・分類手法。
---

## 概要

[主成分分析(PCA)](/algorithms/pca)は、データの分散が最大になる方向を見つけて次元を削減するが、その方向は「どのラベルに属するか」を一切考慮しない——結果として、分散が大きい方向とクラスを分離する方向が一致しない場合、PCAで削減した空間ではクラスが混ざり合ってしまうことがある。線形判別分析(LDA)は、この問題に対して「クラスラベルを積極的に使う」というアプローチで応える教師あり手法である。1936年にロナルド・フィッシャーが提案した判別分析を起源とし、「同じクラスに属するサンプルはできるだけ近くに、異なるクラスに属するサンプルはできるだけ遠くに」写るような射影方向を、**クラス間分散とクラス内分散の比**を最大化するという明確な目的関数のもとで解析的に求める。次元削減の手法であると同時に、射影後の空間で最も近いクラス重心に割り当てるという単純な規則で分類器としても機能する、二重の役割を持つアルゴリズムである。

## 仕組み

1. 各クラス`k`について、そのクラスに属するサンプルの平均ベクトル(クラス重心)`μ_k`と、全サンプルの平均ベクトル`μ`を計算する
2. **クラス内分散行列(within-class scatter)** `S_W`を計算する——各クラス内でサンプルがどれだけ重心`μ_k`の周りにばらついているかを表す共分散行列の総和`S_W = Σ_k Σ_{x∈k} (x - μ_k)(x - μ_k)^T`
3. **クラス間分散行列(between-class scatter)** `S_B`を計算する——各クラスの重心`μ_k`が全体平均`μ`からどれだけ離れているかを表す`S_B = Σ_k n_k (μ_k - μ)(μ_k - μ)^T`(`n_k`はクラス`k`のサンプル数)
4. **フィッシャーの判別基準**である比`J(w) = (w^T S_B w) / (w^T S_W w)`を最大化する射影方向`w`を求める——これは一般化固有値問題`S_B w = λ S_W w`(実務上は`S_W^{-1} S_B`の固有値分解)を解くことに帰着し、最大固有値に対応する固有ベクトルが最もクラスを分離する方向になる
5. クラス数が`C`のとき、`S_W^{-1} S_B`の階数(ランク)は最大で`C-1`であるため、意味のある判別方向は最大`C-1`個しか得られない(2クラス分類なら射影方向は1つだけ)
6. データを求めた射影方向に写した後、分類には各クラス重心への距離(あるいは射影値の平均)を使った最近傍規則、もしくはこの上でロジスティック回帰などをさらに学習する

## 特性・トレードオフ

- **計算量**: 共分散行列`S_W`・`S_B`の計算に`O(nd²)`、それらの固有値分解に`O(d³)`——`d`が大きい高次元データでは固有値分解がボトルネックになりやすく、事前に[主成分分析(PCA)](/algorithms/pca)で次元を落としてからLDAを適用する「PCA+LDA」という組み合わせもよく使われる
- **[主成分分析(PCA)](/algorithms/pca)との違い**: PCAはラベルを使わない教師なし手法で「データ全体の分散」を最大化する方向を探すのに対し、LDAはラベルを使う教師あり手法で「クラス間分散とクラス内分散の比」を最大化する方向を探す。そのため、クラスを分離する情報がデータの分散が最大の方向と一致しない場合(例えば2つのクラスが細長い雲のように重なって分布し、その雲の伸びる方向とは垂直な方向にだけクラスの違いが現れる場合)、PCAでは分離できずLDAなら分離できるケースがある
- **正規性・等分散性の仮定**: 理論的には各クラスが同じ共分散行列を持つ多変量正規分布に従うことを仮定しており、この仮定が大きく崩れるデータでは性能が低下する。クラスごとに異なる共分散を許す発展形として二次判別分析(QDA)がある
- **クラス数による次元の上限**: 得られる判別方向は最大`C-1`個(`C`はクラス数)に限られるため、クラス数が少ないと大幅な次元削減にはならない(2クラス分類なら1次元にしか落とせない)
- **使いどころ**: 顔認識における特徴抽出(Fisherfaces)、[主成分分析(PCA)](/algorithms/pca)と対比される教師あり次元削減の代表例としての教育的位置づけ、少数クラスの分類問題における前処理・可視化、[ロジスティック回帰](/algorithms/logistic-regression)や[サポートベクターマシン](/algorithms/svm)と並ぶ古典的な線形分類手法の1つ

## 実装例

2クラス分類を対象に、フィッシャーの判別基準を最大化する射影方向`w = S_W^{-1}(μ_1 - μ_0)`を求め(2クラスの場合、一般化固有値問題はこの閉じた形に単純化される)、射影後の中点を閾値として分類する。

```python
def _mean_vector(X: list[list[float]]) -> list[float]:
    n, d = len(X), len(X[0])
    return [sum(row[j] for row in X) / n for j in range(d)]


def _within_class_scatter(X0: list[list[float]], X1: list[list[float]], mu0: list[float], mu1: list[float]) -> list[list[float]]:
    d = len(mu0)
    sw = [[0.0] * d for _ in range(d)]
    for X, mu in ((X0, mu0), (X1, mu1)):
        for row in X:
            diff = [row[j] - mu[j] for j in range(d)]
            for i in range(d):
                for j in range(d):
                    sw[i][j] += diff[i] * diff[j]
    return sw


def _solve_linear_system(A: list[list[float]], b: list[float]) -> list[float]:
    """ガウスの消去法でAx=bを解く(正則行列を仮定)。"""
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[pivot] = M[pivot], M[col]
        piv_val = M[col][col]
        for j in range(col, n + 1):
            M[col][j] /= piv_val
        for r in range(n):
            if r != col:
                factor = M[r][col]
                for j in range(col, n + 1):
                    M[r][j] -= factor * M[col][j]
    return [M[i][n] for i in range(n)]


def fit_lda(X0: list[list[float]], X1: list[list[float]]) -> tuple[list[float], float]:
    """2クラスLDAを学習し、射影方向wと分類閾値thresholdを返す。"""
    mu0, mu1 = _mean_vector(X0), _mean_vector(X1)
    sw = _within_class_scatter(X0, X1, mu0, mu1)
    mean_diff = [mu1[j] - mu0[j] for j in range(len(mu0))]
    w = _solve_linear_system(sw, mean_diff)  # w = S_W^-1 (mu1 - mu0)
    proj0 = sum(w[j] * mu0[j] for j in range(len(w)))
    proj1 = sum(w[j] * mu1[j] for j in range(len(w)))
    threshold = (proj0 + proj1) / 2
    return w, threshold


def predict(w: list[float], threshold: float, x: list[float]) -> int:
    projection = sum(wi * xi for wi, xi in zip(w, x))
    return 1 if projection >= threshold else 0
```

```typescript
function meanVector(X: number[][]): number[] {
  const n = X.length;
  const d = X[0].length;
  const mu = new Array(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) mu[j] += row[j] / n;
  return mu;
}

function withinClassScatter(
  X0: number[][],
  X1: number[][],
  mu0: number[],
  mu1: number[],
): number[][] {
  const d = mu0.length;
  const sw = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const [X, mu] of [
    [X0, mu0],
    [X1, mu1],
  ] as [number[][], number[]][]) {
    for (const row of X) {
      const diff = row.map((v, j) => v - mu[j]);
      for (let i = 0; i < d; i++)
        for (let j = 0; j < d; j++) sw[i][j] += diff[i] * diff[j];
    }
  }
  return sw;
}

// ガウスの消去法でAx=bを解く(正則行列を仮定)
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pivVal = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= pivVal;
    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const factor = M[r][col];
        for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
      }
    }
  }
  return M.map((row) => row[n]);
}

// 2クラスLDAを学習し、射影方向wと分類閾値thresholdを返す
function fitLda(
  X0: number[][],
  X1: number[][],
): { w: number[]; threshold: number } {
  const mu0 = meanVector(X0);
  const mu1 = meanVector(X1);
  const sw = withinClassScatter(X0, X1, mu0, mu1);
  const meanDiff = mu1.map((v, j) => v - mu0[j]);
  const w = solveLinearSystem(sw, meanDiff); // w = S_W^-1 (mu1 - mu0)
  const proj0 = w.reduce((s, wi, j) => s + wi * mu0[j], 0);
  const proj1 = w.reduce((s, wi, j) => s + wi * mu1[j], 0);
  const threshold = (proj0 + proj1) / 2;
  return { w, threshold };
}

function predict(w: number[], threshold: number, x: number[]): number {
  const projection = w.reduce((s, wi, j) => s + wi * x[j], 0);
  return projection >= threshold ? 1 : 0;
}
```
