---
name: CMA-ES(共分散行列適応進化戦略)
category: 最適化・確率的手法
subcategory: 進化的・確率的手法
complexity: O(λ・n²)(1世代あたり、λは個体数、nは次元数)
summary: 探索分布を単なる等方的な正規分布から任意の向きに伸縮する多変量正規分布へ拡張し、共分散行列そのものを世代ごとに学習することでパラメータ間の相関構造・地形の歪みに追従する、[進化戦略](/algorithms/evolution-strategies)の具体的な発展形であり勾配不要な連続最適化の代表格。
---

## 概要

[進化戦略](/algorithms/evolution-strategies)の基本形は、探索の中心`m`の周りに標準偏差`σ`だけを持つ**等方的な**(全方向に同じ広がりの)正規分布からサンプリングする。しかし現実の目的関数の等高線は、多くの場合パラメータ間に強い相関を持つ細長い谷のような形をしており、等方的な分布では谷に沿った効率的な探索ができず収束が遅くなる。CMA-ES(Covariance Matrix Adaptation Evolution Strategy)は、この探索分布を`σ`というスカラー1つではなく**共分散行列`C`**(パラメータ間の相関と各方向の広がりを表すn×nの行列)に置き換え、世代を重ねるごとに「実際にうまくいった移動方向」の情報を`C`にフィードバックして分布そのものの形・向きを地形に合わせて回転・伸縮させる。1996年にニコラウス・ハンセンらが提案し、パラメータ数が数十〜数百程度のブラックボックス最適化において、勾配法に頼れない場面での事実上の標準アルゴリズムとされている。

## 仕組み

CMA-ESは[進化戦略](/algorithms/evolution-strategies)の「サンプリング→評価→選択→分布更新」というループの骨格をそのまま引き継ぎ、分布更新の部分を大きく強化する。

1. 平均`m`、全体のステップサイズ`σ`、共分散行列`C`(初期値は単位行列、つまり等方的)を初期化する
2. 多変量正規分布`N(m, σ²C)`から`λ`個の候補解をサンプリングする。`C`が単位行列でなければ、サンプルは楕円状に(相関を持って)広がる
3. 候補解を評価し、成績上位`μ`個を選び、その**重み付き平均**を新しい`m`とする(進化戦略と同様)
4. **進化パス(evolution path)** と呼ばれる、過去数世代分の平均の移動方向を指数移動平均で蓄積したベクトルを更新する。これは単発のノイズではなく「一貫して同じ方向に進んでいる」という傾向を捉えるための仕掛けである
5. 進化パスの情報を使って共分散行列`C`を更新する。具体的には、成功した移動方向`m_new - m_old`の外積(その方向への広がりを表す行列)を`C`に加算する形で更新する(ランクμ更新・ランク1更新)。これにより、繰り返し成功してきた方向には分布が伸び、失敗してきた方向には分布が縮む
6. 進化パスの長さ(ランダムウォークとして期待される長さと比較した実際の長さ)を使って、全体のステップサイズ`σ`も別途調整する(**累積ステップサイズ適応、CSA**)。移動が直線的すぎれば`σ`を増やして歩幅を大きくし、ジグザグしていれば`σ`を減らす
7. 2〜6を、目的関数値が収束するか一定世代数に達するまで繰り返す

## 特性・トレードオフ

- **[進化戦略](/algorithms/evolution-strategies)との違いはただ1点、共分散行列の適応**: 基本の進化戦略が`σ`という1スカラーで探索範囲の「大きさ」だけを調整するのに対し、CMA-ESは`C`というn×n行列で探索範囲の「形と向き」まで学習する。これにより、パラメータ間に強い相関がある(例えば2つの変数を同時に増減させないと改善しない)目的関数でも、進化戦略よりはるかに少ない世代数で収束できる
- **準ニュートン法に匹敵する収束特性**: CMA-ESが学習する共分散行列`C`は、局所的には目的関数のヘッセ行列の逆行列に近づいていくことが理論的にも実験的にも知られており、勾配・ヘッセ行列を一切計算しないにもかかわらず、2次収束的な振る舞い(準ニュートン法に近い効率)を示す場合がある
- **計算コストは次元の2乗**: 共分散行列`C`の保持・固有値分解に`O(n²)`〜`O(n³)`のコストがかかるため、パラメータ数が数千を超える深層学習のネットワーク全体のような超高次元では実用的でなくなる。対角共分散のみを扱う簡略版(sep-CMA-ES)や、共分散行列を陽に持たない自然進化戦略(NES)系の手法で緩和されることが多い
- **ハイパーパラメータがほぼ不要**: 学習率や個体数`λ`などの主要パラメータは、次元数`n`から理論的に導出されるデフォルト値が用意されており、他の多くの最適化手法と異なりユーザーが細かくチューニングする必要がほとんどない点が実務上重宝される
- **使いどころ**: ロボット制御・強化学習における方策パラメータの直接探索(OpenAIの研究で深層強化学習の代替として比較対象にされた)、ハイパーパラメータ最適化、工学設計の空力最適化のように目的関数の評価にシミュレーションを要し勾配が得られない問題、[進化戦略](/algorithms/evolution-strategies)では収束が遅い、変数間の相関が強い連続最適化問題

## 実装例

共分散行列の固有値分解を用いた、簡略化した`(μ/μ_W, λ)`-CMA-ESを示す(進化パスによるステップサイズ適応は省略し、共分散行列の適応に絞って実装する)。

```python
import numpy as np


def cma_es(
    objective_fn,
    dim: int,
    initial_mean: np.ndarray | None = None,
    sigma: float = 1.0,
    lam: int = 20,
    generations: int = 100,
) -> np.ndarray:
    mean = initial_mean if initial_mean is not None else np.zeros(dim)
    cov = np.eye(dim)  # 共分散行列(初期値は等方的)
    mu = lam // 2
    weights = np.log(mu + 0.5) - np.log(np.arange(1, mu + 1))
    weights /= weights.sum()  # 上位個体ほど大きい重みを持つ

    for _ in range(generations):
        eigvals, eigvecs = np.linalg.eigh(cov)
        eigvals = np.clip(eigvals, 1e-20, None)
        b_d = eigvecs @ np.diag(np.sqrt(eigvals))  # C^(1/2) に相当

        z = np.random.randn(lam, dim)  # 等方的な標準正規分布のサンプル
        candidates = mean + sigma * (z @ b_d.T)  # C^(1/2) で回転・伸縮させる

        scores = np.array([objective_fn(c) for c in candidates])
        order = np.argsort(scores)  # 最小化を仮定
        elites = candidates[order[:mu]]

        new_mean = weights @ elites  # 重み付き平均で次世代の中心を決める

        # 「成功した移動方向」に沿って共分散行列を伸ばす(簡略化したランクμ更新)
        diffs = (elites - mean) / sigma
        cov = 0.8 * cov + 0.2 * (diffs.T * weights) @ diffs

        mean = new_mean

    return mean
```

```typescript
type Matrix = number[][];

function eyeMatrix(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

function matVec(m: Matrix, v: number[]): number[] {
  return m.map((row) => row.reduce((s, x, i) => s + x * v[i], 0));
}

function gaussianRandom(rand: () => number = Math.random): number {
  const u1 = rand(),
    u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function cmaEs(
  objectiveFn: (x: number[]) => number,
  dim: number,
  initialMean: number[] | null = null,
  sigma = 1.0,
  lam = 20,
  generations = 100,
): number[] {
  let mean = initialMean ?? new Array(dim).fill(0);
  // 共分散行列は簡略化のため対角成分(各次元の分散)のみを適応させる
  let variances = new Array(dim).fill(1.0);
  const mu = Math.floor(lam / 2);
  const rawWeights = Array.from(
    { length: mu },
    (_, i) => Math.log(mu + 0.5) - Math.log(i + 1),
  );
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const weights = rawWeights.map((w) => w / weightSum);

  for (let gen = 0; gen < generations; gen++) {
    const candidates: number[][] = [];
    for (let i = 0; i < lam; i++) {
      candidates.push(
        mean.map(
          (m, d) => m + sigma * Math.sqrt(variances[d]) * gaussianRandom(),
        ),
      );
    }

    candidates.sort((a, b) => objectiveFn(a) - objectiveFn(b));
    const elites = candidates.slice(0, mu);

    const newMean = mean.map((_, d) =>
      elites.reduce((s, e, i) => s + weights[i] * e[d], 0),
    );

    // 成功した移動方向に沿って各次元の分散を更新(ランクμ更新の対角版)
    variances = variances.map((v, d) => {
      const spread = elites.reduce((s, e, i) => {
        const diff = (e[d] - mean[d]) / sigma;
        return s + weights[i] * diff * diff;
      }, 0);
      return 0.8 * v + 0.2 * spread;
    });

    mean = newMean;
  }

  return mean;
}
```
