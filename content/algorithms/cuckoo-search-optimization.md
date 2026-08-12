---
name: カッコウ探索(Cuckoo Search)
category: シミュレーション・群知能
subcategory: 群知能最適化
complexity: O(n)(1反復あたり、nは巣の数)
summary: カッコウの托卵行動と、鳥や昆虫の探索軌跡に見られるレヴィ飛行を組み合わせ、局所探索と大域的な飛躍をバランスさせる確率的メタヒューリスティック最適化アルゴリズム。
---

## 概要

カッコウは自分で巣を作らず、他の鳥の巣に卵を産みつけて育てさせる「托卵」という繁殖戦略を取る鳥として知られる。宿主の親鳥がカッコウの卵に気づけば、その卵は巣から捨てられるか、宿主が巣ごと放棄して新しい巣を作り直す。2009年にXin-She YangとSuash Debがこの行動と、多くの動物の探索行動に見られる**レヴィ飛行(Lévy flight)**——「短い移動を繰り返しながら、時折とても長い距離をジャンプする」という重い裾を持つ確率分布に従う移動パターン——を組み合わせて考案したのがカッコウ探索である。各「巣」を最適化問題の候補解とみなし、托卵(悪い解を良い解で置き換える)とレヴィ飛行(局所的な微調整と大域的な飛躍を織り交ぜた解の更新)という2つのアイデアだけで、[粒子群最適化](/algorithms/particle-swarm-optimization)や[蟻コロニー最適化](/algorithms/ant-colony-optimization)と並ぶ有力なメタヒューリスティックとして評価されている。

## 仕組み

1. `n`個の「巣」(候補解)をランダムに初期化する
2. **レヴィ飛行による新しい卵の生成**: ランダムに選んだ巣`i`の解`x_i`から、レヴィ飛行の分布に従うステップ幅でランダムに移動した新しい解`x_new = x_i + α・Lévy(λ)`を生成する。レヴィ飛行は正規分布よりも裾が重く、ほとんどは小さな移動だが稀に非常に大きな飛躍が起きるため、局所探索と大域探索を自然に両立できる
3. **托卵の判定**: 生成した`x_new`を評価し、ランダムに選んだ別の巣`j`の解より良ければ、巣`j`を`x_new`で置き換える(=カッコウの卵が宿主に気づかれず巣を乗っ取る)
4. **発見と巣の放棄**: 一定の確率`p_a`(典型的には0.25程度)で、評価の悪い巣の一部を「宿主に卵を見破られた」とみなし、その巣をランダムな新しい解で置き換える
5. 全ての巣の中から最良の解を記録し、終了条件(反復回数の上限など)を満たすまで2〜4を繰り返す

「良い解ほど生き残りやすい」という淘汰圧(托卵の成功)と、「一定確率で解を強制的にリセットする」という多様性維持の仕組み(発見と巣の放棄)が組み合わさることで、局所最適への収束と探索空間の探検のバランスを取っている。

## 特性・トレードオフ

- **計算量**: 1反復あたり巣の数`n`に比例するO(n)。目的関数の評価コストと反復回数を掛け合わせた総計算量は問題依存で、他の群知能アルゴリズムと同様に厳密解を保証しない
- **レヴィ飛行による探索の効率**: 移動幅がべき乗則に従うレヴィ飛行は、正規分布に基づくランダムウォークよりも探索空間を効率よくカバーすることが理論的に知られており(多くの生物の採餌行動が実際にレヴィ飛行に近い統計的性質を持つことが観測されている)、[粒子群最適化](/algorithms/particle-swarm-optimization)のような速度ベースの更新よりも局所最適から脱出しやすい傾向がある
- **調整すべきパラメータの少なさ**: 巣の数`n`・発見確率`p_a`程度が主要なパラメータであり、粒子群最適化の慣性・加速係数のような複数のパラメータを細かくチューニングする必要が比較的少ない、と提案論文では主張されている
- **[粒子群最適化](/algorithms/particle-swarm-optimization)との違い**: PSOが「自己ベスト・全体ベストへ向かう速度」という決定論的な方向性を持つ更新であるのに対し、カッコウ探索は托卵(淘汰)とレヴィ飛行(確率的なジャンプ)という2段構えの確率的な更新に依っており、探索の多様性を保ちやすい反面、収束の速さは問題やパラメータに依存する
- **使いどころ**: 連続最適化・組み合わせ最適化の両方に適用例があり、エンジニアリング設計の最適化、ニューラルネットワークのハイパーパラメータ探索、スケジューリング問題、多くの局所最適解を持つ非凸な目的関数の大域的探索など

## 実装例

球面関数(`f(x) = Σxᵢ²`、最小値は原点でゼロ)を目的関数として、簡易版のレヴィ飛行(Mantegnaのアルゴリズム)を使ったカッコウ探索を示す。

```python
import math
import random


def sphere(x: list[float]) -> float:
    return sum(xi**2 for xi in x)


def levy_step(dim: int, rng: random.Random, beta: float = 1.5) -> list[float]:
    # Mantegnaのアルゴリズムによるレヴィ分布に従うステップの近似生成
    num = math.gamma(1 + beta) * math.sin(math.pi * beta / 2)
    den = math.gamma((1 + beta) / 2) * beta * (2 ** ((beta - 1) / 2))
    sigma_u = (num / den) ** (1 / beta)
    step = []
    for _ in range(dim):
        u = rng.gauss(0, sigma_u)
        v = rng.gauss(0, 1)
        step.append(u / (abs(v) ** (1 / beta)))
    return step


def cuckoo_search(
    objective,
    dim: int,
    bounds: tuple[float, float],
    n_nests: int = 25,
    iterations: int = 200,
    pa: float = 0.25,
    alpha: float = 0.01,
    seed: int = 0,
) -> tuple[list[float], float]:
    rng = random.Random(seed)
    lo, hi = bounds
    nests = [[rng.uniform(lo, hi) for _ in range(dim)] for _ in range(n_nests)]
    fitness = [objective(x) for x in nests]

    best_idx = min(range(n_nests), key=lambda i: fitness[i])
    best, best_val = list(nests[best_idx]), fitness[best_idx]

    for _ in range(iterations):
        # レヴィ飛行による新しい卵の生成と托卵
        i = rng.randrange(n_nests)
        step = levy_step(dim, rng)
        candidate = [
            max(lo, min(hi, nests[i][d] + alpha * step[d])) for d in range(dim)
        ]
        candidate_val = objective(candidate)
        j = rng.randrange(n_nests)
        if candidate_val < fitness[j]:
            nests[j], fitness[j] = candidate, candidate_val

        # 発見確率paで悪い巣の一部を放棄し、ランダムな新しい解に置き換える
        for k in range(n_nests):
            if rng.random() < pa:
                nests[k] = [rng.uniform(lo, hi) for _ in range(dim)]
                fitness[k] = objective(nests[k])

        gen_best_idx = min(range(n_nests), key=lambda idx: fitness[idx])
        if fitness[gen_best_idx] < best_val:
            best_val = fitness[gen_best_idx]
            best = list(nests[gen_best_idx])

    return best, best_val
```

```typescript
function sphere(x: number[]): number {
  return x.reduce((s, xi) => s + xi * xi, 0);
}

function gaussian(rand: () => number, sigma: number): number {
  // Box-Muller法
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function gammaApprox(x: number): number {
  // Stirlingの近似(このアルゴリズムで必要な範囲で十分な精度)
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaApprox(1 - x));
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

function levyStep(dim: number, rand: () => number, beta = 1.5): number[] {
  const num = gammaApprox(1 + beta) * Math.sin((Math.PI * beta) / 2);
  const den = gammaApprox((1 + beta) / 2) * beta * Math.pow(2, (beta - 1) / 2);
  const sigmaU = Math.pow(num / den, 1 / beta);
  const step: number[] = [];
  for (let d = 0; d < dim; d++) {
    const u = gaussian(rand, sigmaU);
    const v = gaussian(rand, 1);
    step.push(u / Math.pow(Math.abs(v), 1 / beta));
  }
  return step;
}

function cuckooSearch(
  objective: (x: number[]) => number,
  dim: number,
  bounds: [number, number],
  nNests = 25,
  iterations = 200,
  pa = 0.25,
  alpha = 0.01,
  rand: () => number = Math.random,
): { best: number[]; val: number } {
  const [lo, hi] = bounds;
  const nests: number[][] = Array.from({ length: nNests }, () =>
    Array.from({ length: dim }, () => lo + rand() * (hi - lo)),
  );
  const fitness = nests.map(objective);

  let bestIdx = 0;
  for (let i = 1; i < nNests; i++)
    if (fitness[i] < fitness[bestIdx]) bestIdx = i;
  let best = [...nests[bestIdx]];
  let bestVal = fitness[bestIdx];

  for (let iter = 0; iter < iterations; iter++) {
    const i = Math.floor(rand() * nNests);
    const step = levyStep(dim, rand);
    const candidate = nests[i].map((v, d) =>
      Math.max(lo, Math.min(hi, v + alpha * step[d])),
    );
    const candidateVal = objective(candidate);
    const j = Math.floor(rand() * nNests);
    if (candidateVal < fitness[j]) {
      nests[j] = candidate;
      fitness[j] = candidateVal;
    }

    for (let k = 0; k < nNests; k++) {
      if (rand() < pa) {
        nests[k] = Array.from({ length: dim }, () => lo + rand() * (hi - lo));
        fitness[k] = objective(nests[k]);
      }
    }

    let genBestIdx = 0;
    for (let i2 = 1; i2 < nNests; i2++)
      if (fitness[i2] < fitness[genBestIdx]) genBestIdx = i2;
    if (fitness[genBestIdx] < bestVal) {
      bestVal = fitness[genBestIdx];
      best = [...nests[genBestIdx]];
    }
  }

  return { best, val: bestVal };
}
```
