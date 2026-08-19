---
name: ベイズ最適化(Bayesian Optimization)
category: 最適化・確率的手法
subcategory: 進化的・確率的手法
complexity: O(反復ごとにガウス過程の更新でO(k^3)、kは評価済み点数)
summary: 目的関数をガウス過程等の確率的サロゲートモデルで近似し、獲得関数が最大になる点を次に評価することで評価コストの高い関数を少ない試行回数で最適化する手法。
---

## 概要

機械学習モデルのハイパーパラメータ探索や、シミュレーション・実験を伴う工学設計のように、目的関数`f(x)`の**1回の評価に長い時間やコストがかかる**問題では、[焼きなまし法](/algorithms/simulated-annealing)や[遺伝的アルゴリズム](/algorithms/genetic-algorithm)のように何千回も関数を評価する手法は現実的ではない。ベイズ最適化は、これまでに評価した(少数の)点とその結果から、目的関数の形を**ガウス過程**などの確率モデルで近似(サロゲートモデル)し、「次にどこを評価すれば最も情報が得られるか」を**獲得関数**という指標で判断しながら、少ない評価回数で最適解に近づいていく手法である。関数の評価自体は1回ごとに高コストでも、サロゲートモデルの更新と獲得関数の最大化は比較的安価に行えるという非対称性を利用している。深層学習のハイパーパラメータ探索(学習率・バッチサイズ・ネットワーク構造など)ツールの中核アルゴリズムとして広く実用化されている。

## 仕組み

1. 目的関数`f`をいくつかの点でランダムまたは計画的に評価し、初期データ`(x_1, f(x_1)), ..., (x_k, f(x_k))`を得る
2. この観測データをもとに、**ガウス過程**(あるいは他の確率的回帰モデル)で目的関数`f`の**サロゲートモデル**を構築する。ガウス過程は、任意の点`x`について「予測される平均値」と「その予測の不確実性(分散)」の両方を返す点が特徴である
3. サロゲートモデルの予測(平均と不確実性)をもとに、**獲得関数**(acquisition function)を計算する。獲得関数は「その点を次に評価する価値」を表す指標で、**期待改善量(Expected Improvement)**や**上側信頼限界(Upper Confidence Bound)**などがよく使われ、いずれも「予測平均が良い(活用)」と「不確実性が大きい(探索)」の両方を評価に組み込む
4. 獲得関数を最大化する点`x_next`を求める(この最大化自体は`f`の直接評価より遥かに安価なので、勾配法やグリッド探索など通常の最適化手法で解ける)
5. `x_next`で実際に目的関数`f`を評価し、観測データに`(x_next, f(x_next))`を追加する
6. サロゲートモデルを更新し、評価回数の上限に達するか十分収束するまで2〜5を繰り返す
7. これまでに観測した中で最良の`x`(あるいはサロゲートモデル上の予測最良点)を最終解として返す

「不確実性が高い(まだよく分かっていない)領域」と「予測が良い(有望そうな)領域」のバランスを獲得関数が数理的に取りながら、次にどこを試すべきかを毎回選び直す点が、ランダムサーチやグリッドサーチとの本質的な違いである。

## 特性・トレードオフ

- **評価コストの高い関数に強い**: サロゲートモデルの構築・更新コストを支払ってでも、目的関数自体の評価回数を減らせるなら得をする、という状況(ハイパーパラメータ探索、材料設計、実機実験を伴う制御パラメータ調整など)に特化した手法である
- **次元数と評価点数のスケーラビリティに限界がある**: ガウス過程の更新は評価済み点数`k`に対して`O(k^3)`のコストがかかるため、数百回を超える評価や、次元数が数十を超える問題では性能が劣化しやすい。この場合はランダムフォレストベースのサロゲート(SMAC)や、[進化戦略](/algorithms/evolution-strategies)・[CMA-ES](/algorithms/cma-es)のような別のアプローチが選ばれることもある
- **探索と活用のトレードオフが獲得関数の設計に集約される**: 期待改善量やUCBのパラメータ調整によって、序盤に広く探索するか早期に有望領域を活用するかの挙動が変わる。この点は[焼きなまし法](/algorithms/simulated-annealing)の冷却スケジュール設計に通じる課題である
- **[交差エントロピー法](/algorithms/cross-entropy-method)との違い**: 交差エントロピー法がサンプル集団の分布を逐次更新して有望領域に絞り込んでいくのに対し、ベイズ最適化は目的関数の形状そのものを確率モデルとして明示的に保持し、不確実性を定量化して次の評価点を選ぶ点が異なる
- **使いどころ**: 機械学習・深層学習のハイパーパラメータ探索(学習率、正則化係数、ネットワーク構造など)、化学・材料science実験の条件最適化、シミュレーションベースの工学設計、A/Bテストの設計における逐次的な条件選定

## 実装例

1次元の目的関数を対象に、簡易的なガウス過程(RBFカーネル)と期待改善量を用いたベイズ最適化の実装。線形代数ライブラリを使わず小規模な行列演算を手書きすることで仕組みを明示する。

```python
import math
import random


def rbf_kernel(x1: float, x2: float, length_scale: float = 1.0) -> float:
    return math.exp(-((x1 - x2) ** 2) / (2 * length_scale ** 2))


def gp_predict(x: float, xs: list[float], ys: list[float], noise: float = 1e-6) -> tuple[float, float]:
    """観測点(xs, ys)をもとに、点xでのガウス過程の事後平均・分散を計算する(小規模なのでガウス消去法で解く)。"""
    n = len(xs)
    k = [[rbf_kernel(xs[i], xs[j]) + (noise if i == j else 0.0) for j in range(n)] for i in range(n)]
    k_star = [rbf_kernel(x, xs[i]) for i in range(n)]

    # K * alpha = ys をガウス消去法で解く
    aug = [row[:] + [ys[i]] for i, row in enumerate(k)]
    for col in range(n):
        pivot_row = max(range(col, n), key=lambda r: abs(aug[r][col]))
        aug[col], aug[pivot_row] = aug[pivot_row], aug[col]
        pivot = aug[col][col]
        aug[col] = [v / pivot for v in aug[col]]
        for r in range(n):
            if r != col and aug[r][col] != 0:
                factor = aug[r][col]
                aug[r] = [aug[r][c] - factor * aug[col][c] for c in range(n + 1)]
    alpha = [aug[i][n] for i in range(n)]

    mean = sum(k_star[i] * alpha[i] for i in range(n))
    variance = max(1e-9, rbf_kernel(x, x) - sum(k_star[i] * k_star[i] for i in range(n)) / max(1, n))
    return mean, variance


def normal_cdf(z: float) -> float:
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def normal_pdf(z: float) -> float:
    return math.exp(-z * z / 2) / math.sqrt(2 * math.pi)


def expected_improvement(x: float, xs: list[float], ys: list[float], best_y: float, xi: float = 0.01) -> float:
    mean, variance = gp_predict(x, xs, ys)
    std = math.sqrt(variance)
    if std < 1e-9:
        return 0.0
    z = (best_y - mean - xi) / std  # 最小化問題なので改善は「小さいほど良い」
    return (best_y - mean - xi) * normal_cdf(z) + std * normal_pdf(z)


def bayesian_optimization(f, bounds: tuple[float, float], n_init: int = 3, n_iter: int = 15) -> tuple[float, float]:
    lo, hi = bounds
    xs = [random.uniform(lo, hi) for _ in range(n_init)]
    ys = [f(x) for x in xs]

    for _ in range(n_iter):
        best_y = min(ys)
        # 獲得関数(期待改善量)を候補点上で最大化する(簡易的にランダムサンプルで探索)
        candidates = [random.uniform(lo, hi) for _ in range(200)]
        x_next = max(candidates, key=lambda x: expected_improvement(x, xs, ys, best_y))
        xs.append(x_next)
        ys.append(f(x_next))

    best_idx = min(range(len(ys)), key=lambda i: ys[i])
    return xs[best_idx], ys[best_idx]
```

```typescript
function rbfKernel(x1: number, x2: number, lengthScale = 1.0): number {
  return Math.exp(-((x1 - x2) ** 2) / (2 * lengthScale ** 2));
}

function gpPredict(x: number, xs: number[], ys: number[], noise = 1e-6): [number, number] {
  // 観測点(xs, ys)をもとに、点xでのガウス過程の事後平均・分散を計算する(小規模なのでガウス消去法で解く)
  const n = xs.length;
  const k = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => rbfKernel(xs[i], xs[j]) + (i === j ? noise : 0)),
  );
  const kStar = xs.map((xi) => rbfKernel(x, xi));

  const aug = k.map((row, i) => [...row, ys[i]]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[pivotRow][col])) pivotRow = r;
    [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    const pivot = aug[col][col];
    aug[col] = aug[col].map((v) => v / pivot);
    for (let r = 0; r < n; r++) {
      if (r !== col && aug[r][col] !== 0) {
        const factor = aug[r][col];
        aug[r] = aug[r].map((v, c) => v - factor * aug[col][c]);
      }
    }
  }
  const alpha = aug.map((row) => row[n]);

  const mean = kStar.reduce((s, k_i, i) => s + k_i * alpha[i], 0);
  const variance = Math.max(1e-9, rbfKernel(x, x) - kStar.reduce((s, k_i) => s + k_i * k_i, 0) / Math.max(1, n));
  return [mean, variance];
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function erf(x: number): number {
  // Abramowitz-Stegun近似
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalPdf(z: number): number {
  return Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);
}

function expectedImprovement(x: number, xs: number[], ys: number[], bestY: number, xi = 0.01): number {
  const [mean, variance] = gpPredict(x, xs, ys);
  const std = Math.sqrt(variance);
  if (std < 1e-9) return 0;
  const z = (bestY - mean - xi) / std; // 最小化問題なので改善は「小さいほど良い」
  return (bestY - mean - xi) * normalCdf(z) + std * normalPdf(z);
}

function bayesianOptimization(
  f: (x: number) => number,
  bounds: [number, number],
  nInit = 3,
  nIter = 15,
): [number, number] {
  const [lo, hi] = bounds;
  const xs: number[] = Array.from({ length: nInit }, () => lo + Math.random() * (hi - lo));
  const ys: number[] = xs.map(f);

  for (let iter = 0; iter < nIter; iter++) {
    const bestY = Math.min(...ys);
    // 獲得関数(期待改善量)を候補点上で最大化する(簡易的にランダムサンプルで探索)
    const candidates = Array.from({ length: 200 }, () => lo + Math.random() * (hi - lo));
    let xNext = candidates[0];
    let bestEi = -Infinity;
    for (const c of candidates) {
      const ei = expectedImprovement(c, xs, ys, bestY);
      if (ei > bestEi) {
        bestEi = ei;
        xNext = c;
      }
    }
    xs.push(xNext);
    ys.push(f(xNext));
  }

  let bestIdx = 0;
  for (let i = 1; i < ys.length; i++) if (ys[i] < ys[bestIdx]) bestIdx = i;
  return [xs[bestIdx], ys[bestIdx]];
}
```
