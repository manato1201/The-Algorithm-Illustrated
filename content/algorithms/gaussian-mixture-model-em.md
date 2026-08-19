---
name: 混合ガウスモデルとEM法(Gaussian Mixture Model)
category: 機械学習
subcategory: 教師なし学習
complexity: O(nkd)(1反復あたり、n=サンプル数、k=混合成分数、d=次元数)
summary: データが複数の正規分布の重み付き混合から生成されたと仮定し、E-step(各点の所属確率の推定)とM-step(各分布のパラメータ更新)を交互に繰り返して最尤推定する、ソフトな確率的所属を持つ教師なしクラスタリング手法。
---

## 概要

[k-means法](/algorithms/k-means)は各データ点をちょうど1つのクラスタに割り当てる「ハードな」クラスタリングだが、現実のデータでは「クラスタの境界付近の点がどちらに属するか曖昧」「クラスタの形が真円ではなく楕円に伸びている」といった状況が珍しくない。混合ガウスモデル(Gaussian Mixture Model、GMM)は、データが`k`個の正規分布(ガウス分布)の重み付き混合から生成されたと仮定する確率モデルで、各点は特定のクラスタに「所属する確率」を持つ**ソフトな所属**として扱われる。このモデルのパラメータ(各正規分布の平均・共分散・混合比率)を最尤推定する標準的な方法が、EM法(Expectation-Maximization algorithm)である。EM法は「各点がどの分布から来たか(潜在変数)」が観測できないという問題に対し、E-step(現在のパラメータのもとで各点の所属確率を計算する)とM-step(その所属確率で重み付けしてパラメータを更新する)を交互に繰り返すことで、直接は解けない最尤推定を反復的に解いていく汎用的な枠組みであり、GMMはその最も代表的な応用例である。

## 仕組み

1. 混合成分の数`k`を決め、各成分`j`の平均`μ_j`・共分散`Σ_j`・混合比率(事前確率)`π_j`を初期化する(`π_j`の合計は1、しばしば[k-means法](/algorithms/k-means)の結果で初期化する)
2. **E-step(期待値ステップ)**: 現在のパラメータのもとで、各データ点`x_i`が各成分`j`から生成された確率(責任度、responsibility)`γ_ij`をベイズの定理で計算する:
   `γ_ij = π_j・N(x_i; μ_j, Σ_j) / Σ_l π_l・N(x_i; μ_l, Σ_l)`
   ここで`N(x; μ, Σ)`は平均`μ`・共分散`Σ`の多変量正規分布の確率密度。`γ_ij`は0〜1の値を取り、全成分について合計すると1になる「ソフトな所属確率」である
3. **M-step(最大化ステップ)**: 各点の責任度`γ_ij`を重みとして、各成分のパラメータを更新する:
   - 混合比率: `π_j = (Σ_i γ_ij) / n`
   - 平均: `μ_j = (Σ_i γ_ij・x_i) / (Σ_i γ_ij)`
   - 共分散: `Σ_j = (Σ_i γ_ij・(x_i - μ_j)(x_i - μ_j)^T) / (Σ_i γ_ij)`
4. 対数尤度(全データがこの混合モデルから生成される確率の対数)を計算し、前回のE-step・M-stepからの改善量が十分小さくなるか、指定した反復回数に達するまで2〜3を繰り返す
5. EM法は各反復で対数尤度が単調に増加(悪化しない)ことが理論的に保証されているが、[k-means法](/algorithms/k-means)と同様に初期値によって局所最適解に収束しうるため、複数回の初期化から最良の結果を選ぶのが一般的

## 特性・トレードオフ

- **計算量**: 各反復でE-stepが`O(nkd)`(各点と各成分の密度を計算)、M-stepも`O(nkd)`程度——[k-means法](/algorithms/k-means)の`O(nkd)`と同オーダーだが、共分散行列を扱う分だけ定数倍は重い
- **[k-means法](/algorithms/k-means)との違い**: k-meansは各点を最も近い重心のクラスタに確定的に(ハードに)割り当てるのに対し、GMMは各点が各クラスタに属する確率を連続値で持つ(ソフトな所属)。実際、共分散を全成分で等しい球状(等方的)に固定したGMMのEM法は、k-meansとほぼ等価になることが知られている——GMMはk-measの確率的な一般化と見なせる
- **柔軟なクラスタ形状**: k-meansは球状のクラスタしか表現できないが、GMMは各成分が独自の共分散行列を持てるため、楕円形に伸びた・傾いたクラスタも自然に表現できる
- **成分数`k`の事前指定と過学習のリスク**: k-meansと同様に成分数`k`は事前に指定する必要があり、AIC・BICなどの情報量規準でモデル選択することが多い。また共分散行列の自由度が高いため、データが少ないと特定の点に極端に集中した(分散がほぼ0の)退化解に陥ることがあり、正則化(共分散に小さな値を加える等)が必要になる場合がある
- **使いどころ**: 話者認識・音声処理における特徴分布のモデリング、異常検知(尤度が低い点を外れ値とみなす)、[k-means法](/algorithms/k-means)よりも柔軟なソフトクラスタリングが必要な場面、EM法自体は隠れマルコフモデルの学習など潜在変数を含む他の多くの確率モデルの推定にも応用される汎用的な最適化の枠組み

## 実装例

1次元データを対象に、2つの正規分布の混合モデルをEM法で学習する(多次元への拡張は共分散が行列になるだけで同じ枠組み)。

```python
import math


def _gaussian_pdf(x: float, mu: float, sigma2: float) -> float:
    return math.exp(-((x - mu) ** 2) / (2 * sigma2)) / math.sqrt(2 * math.pi * sigma2)


def fit_gmm_1d(
    data: list[float], k: int, means: list[float], variances: list[float], weights: list[float],
    iterations: int = 100,
) -> tuple[list[float], list[float], list[float]]:
    """EM法で1次元k成分の混合ガウスモデルを学習する。means/variances/weightsは初期値。"""
    n = len(data)
    for _ in range(iterations):
        # E-step: 各点・各成分の責任度gammaを計算する
        gamma = [[0.0] * k for _ in range(n)]
        for i, x in enumerate(data):
            densities = [weights[j] * _gaussian_pdf(x, means[j], variances[j]) for j in range(k)]
            total = sum(densities)
            for j in range(k):
                gamma[i][j] = densities[j] / total if total > 0 else 1.0 / k

        # M-step: 責任度で重み付けしてパラメータを更新する
        for j in range(k):
            nj = sum(gamma[i][j] for i in range(n))
            weights[j] = nj / n
            means[j] = sum(gamma[i][j] * data[i] for i in range(n)) / nj
            variances[j] = max(
                sum(gamma[i][j] * (data[i] - means[j]) ** 2 for i in range(n)) / nj, 1e-6
            )
    return means, variances, weights


def predict_cluster(x: float, means: list[float], variances: list[float], weights: list[float]) -> int:
    densities = [weights[j] * _gaussian_pdf(x, means[j], variances[j]) for j in range(len(means))]
    return max(range(len(densities)), key=lambda j: densities[j])
```

```typescript
function gaussianPdf(x: number, mu: number, sigma2: number): number {
  return (
    Math.exp(-((x - mu) ** 2) / (2 * sigma2)) / Math.sqrt(2 * Math.PI * sigma2)
  );
}

// EM法で1次元k成分の混合ガウスモデルを学習する。means/variances/weightsは初期値
function fitGmm1d(
  data: number[],
  k: number,
  means: number[],
  variances: number[],
  weights: number[],
  iterations = 100,
): { means: number[]; variances: number[]; weights: number[] } {
  const n = data.length;
  for (let iter = 0; iter < iterations; iter++) {
    // E-step: 各点・各成分の責任度gammaを計算する
    const gamma: number[][] = Array.from({ length: n }, () => new Array(k).fill(0));
    for (let i = 0; i < n; i++) {
      const x = data[i];
      const densities = Array.from(
        { length: k },
        (_, j) => weights[j] * gaussianPdf(x, means[j], variances[j]),
      );
      const total = densities.reduce((a, b) => a + b, 0);
      for (let j = 0; j < k; j++) {
        gamma[i][j] = total > 0 ? densities[j] / total : 1 / k;
      }
    }

    // M-step: 責任度で重み付けしてパラメータを更新する
    for (let j = 0; j < k; j++) {
      let nj = 0;
      for (let i = 0; i < n; i++) nj += gamma[i][j];
      weights[j] = nj / n;

      let meanSum = 0;
      for (let i = 0; i < n; i++) meanSum += gamma[i][j] * data[i];
      means[j] = meanSum / nj;

      let varSum = 0;
      for (let i = 0; i < n; i++) varSum += gamma[i][j] * (data[i] - means[j]) ** 2;
      variances[j] = Math.max(varSum / nj, 1e-6);
    }
  }
  return { means, variances, weights };
}

function predictCluster(
  x: number,
  means: number[],
  variances: number[],
  weights: number[],
): number {
  const densities = means.map(
    (mu, j) => weights[j] * gaussianPdf(x, mu, variances[j]),
  );
  let best = 0;
  for (let j = 1; j < densities.length; j++) if (densities[j] > densities[best]) best = j;
  return best;
}
```
