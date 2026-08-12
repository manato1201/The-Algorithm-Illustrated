---
name: グレイウルフ最適化(GWO)
category: シミュレーション・群知能
subcategory: 群知能最適化
complexity: O(n)(1反復あたり、nは狼の個体数)
summary: オオカミの群れの社会階層(α・β・δ・ω)と獲物を包囲して仕留める狩りの行動を模し、上位3頭の情報を頼りに群れ全体が獲物(最適解)へ収束していく最適化アルゴリズム。
---

## 概要

野生のハイイロオオカミ(グレイウルフ)の群れは、厳密な社会階層に従って統率された狩りを行う。群れを率いる**α(アルファ)**の決定を、次席の**β(ベータ)**が補佐し、若い個体や偵察役の**δ(デルタ)**がそれに続き、残りの**ω(オメガ)**は階層に従って行動する。狩りの際は、獲物の位置を探索しながら徐々に距離を詰め、最終的に群れ全体で獲物を包囲して仕留める。2014年にSeyedali Mirjaliliらがこの社会階層と包囲行動を最適化アルゴリズムとして定式化したのがグレイウルフ最適化(Grey Wolf Optimizer, GWO)である。群れの中で**最も良い解を見つけた上位3頭(α・β・δ)の位置を頼りに、残りの狼たちがその方向へ移動する**という単純な規則だけで、探索の初期は広く空間を探検し、後半は有望な領域へ収束していく挙動が自然に生まれる。

## 仕組み

各「狼」は探索空間上の1つの候補解を表す位置ベクトルを持つ。

1. `n`頭の狼をランダムな位置に初期化し、目的関数を評価する
2. 評価値が最も良い3頭をそれぞれ**α**・**β**・**δ**とし、残りは**ω**として扱う(この階層は反復のたびに評価し直す)
3. 各反復で、係数`a`を反復回数に応じて2から0へ線形に減少させる(探索の初期は大きく動き、後半は動きを小さくして収束を促す)
4. ω狼を含む全ての狼は、α・β・δそれぞれに対して「獲物を包囲する動き」を計算し、その3方向の平均を新しい位置とする:
   - `D_α = |C₁・X_α - X|`、`X₁ = X_α - A₁・D_α`(β・δについても同様に`X₂`・`X₃`を計算)
   - `X(t+1) = (X₁ + X₂ + X₃) / 3`
   - ここで`A = 2a・r₁ - a`、`C = 2・r₂`(`r₁, r₂`は`[0,1]`の一様乱数)。`|A| > 1`のときは獲物から離れる方向への探索(大域探索)、`|A| < 1`のときは獲物へ近づく方向への搾取(局所探索)が優勢になる
5. 全狼の位置を更新したら目的関数を再評価し、α・β・δを更新する。終了条件を満たすまで3〜5を繰り返す

**「群れの中の上位3頭の情報だけを頼りに全体が動く」**という単純な仕組みが、[粒子群最適化](/algorithms/particle-swarm-optimization)の「自己ベスト+全体ベスト」よりも多様な方向の情報(α・β・δの3方向)を使うことで、局所最適への早すぎる収束を防ぐ効果を持つとされる。

## 特性・トレードオフ

- **計算量**: 1反復あたり、各狼についてα・β・δとの距離計算はO(1)なのでO(n)(nは狼の数)。目的関数の評価コストと反復回数が全体の計算量を支配する点は他の群知能アルゴリズムと同様
- **探索と搾取の自動的な切り替え**: 係数`a`を2から0へ線形に減少させるだけで、反復の前半は`|A|>1`になりやすく大域探索が優勢に、後半は`|A|<1`になりやすく局所探索(獲物への収束)が優勢になる、という探索フェーズの移行が自然に組み込まれている。[粒子群最適化](/algorithms/particle-swarm-optimization)における慣性重みの減衰と似た役割を果たす
- **パラメータの少なさ**: チューニングが必要な主要パラメータは狼の数`n`程度で、粒子群最適化の慣性・加速係数や[カッコウ探索](/algorithms/cuckoo-search-optimization)の発見確率のような複数のハイパーパラメータの調整が比較的少なく済む、という点が実用上の利点として挙げられる
- **他の群知能最適化との位置づけ**: [粒子群最適化](/algorithms/particle-swarm-optimization)が「自己ベスト・全体ベスト」という2つの参照点、[カッコウ探索](/algorithms/cuckoo-search-optimization)が「托卵とレヴィ飛行」という確率的な淘汰と飛躍を使うのに対し、GWOは「階層上位3頭の平均」という決定論的な参照点の合成で群れを導く。動物の社会的地位の情報を直接アルゴリズムに落とし込んだ設計が特徴
- **使いどころ**: 連続最適化問題全般(エンジニアリング設計、機械学習のハイパーパラメータ探索)、電力システムの負荷配分最適化、特徴選択問題、多くの局所最適解を持つ非凸な目的関数の大域探索など、他のNature-inspired最適化と競合する応用領域で広く試されている

## 実装例

球面関数(`f(x) = Σxᵢ²`、最小値は原点でゼロ)を目的関数として、標準的なGWOを示す。

```python
import random


def sphere(x: list[float]) -> float:
    return sum(xi**2 for xi in x)


def grey_wolf_optimizer(
    objective,
    dim: int,
    bounds: tuple[float, float],
    n_wolves: int = 20,
    iterations: int = 100,
    seed: int = 0,
) -> tuple[list[float], float]:
    rng = random.Random(seed)
    lo, hi = bounds
    wolves = [[rng.uniform(lo, hi) for _ in range(dim)] for _ in range(n_wolves)]
    fitness = [objective(w) for w in wolves]

    def top3():
        order = sorted(range(n_wolves), key=lambda i: fitness[i])
        return order[0], order[1], order[2]

    for t in range(iterations):
        a = 2.0 - 2.0 * t / max(1, iterations - 1)
        alpha_idx, beta_idx, delta_idx = top3()
        x_alpha, x_beta, x_delta = wolves[alpha_idx], wolves[beta_idx], wolves[delta_idx]

        new_wolves = []
        for w in wolves:
            xs = []
            for leader in (x_alpha, x_beta, x_delta):
                pos = []
                for d in range(dim):
                    r1, r2 = rng.random(), rng.random()
                    A = 2 * a * r1 - a
                    C = 2 * r2
                    D = abs(C * leader[d] - w[d])
                    pos.append(leader[d] - A * D)
                xs.append(pos)
            new_pos = [sum(xs[k][d] for k in range(3)) / 3 for d in range(dim)]
            new_pos = [max(lo, min(hi, v)) for v in new_pos]
            new_wolves.append(new_pos)

        wolves = new_wolves
        fitness = [objective(w) for w in wolves]

    best_idx = min(range(n_wolves), key=lambda i: fitness[i])
    return wolves[best_idx], fitness[best_idx]
```

```typescript
function sphere(x: number[]): number {
  return x.reduce((s, xi) => s + xi * xi, 0);
}

function greyWolfOptimizer(
  objective: (x: number[]) => number,
  dim: number,
  bounds: [number, number],
  nWolves = 20,
  iterations = 100,
  rand: () => number = Math.random,
): { best: number[]; val: number } {
  const [lo, hi] = bounds;
  let wolves: number[][] = Array.from({ length: nWolves }, () =>
    Array.from({ length: dim }, () => lo + rand() * (hi - lo)),
  );
  let fitness = wolves.map(objective);

  const top3 = (): [number, number, number] => {
    const order = wolves
      .map((_, i) => i)
      .sort((a, b) => fitness[a] - fitness[b]);
    return [order[0], order[1], order[2]];
  };

  for (let t = 0; t < iterations; t++) {
    const a = 2.0 - (2.0 * t) / Math.max(1, iterations - 1);
    const [alphaIdx, betaIdx, deltaIdx] = top3();
    const leaders = [wolves[alphaIdx], wolves[betaIdx], wolves[deltaIdx]];

    const newWolves: number[][] = wolves.map((w) => {
      const xs: number[][] = leaders.map((leader) => {
        const pos: number[] = [];
        for (let d = 0; d < dim; d++) {
          const r1 = rand();
          const r2 = rand();
          const A = 2 * a * r1 - a;
          const C = 2 * r2;
          const D = Math.abs(C * leader[d] - w[d]);
          pos.push(leader[d] - A * D);
        }
        return pos;
      });
      const newPos: number[] = [];
      for (let d = 0; d < dim; d++) {
        const avg = (xs[0][d] + xs[1][d] + xs[2][d]) / 3;
        newPos.push(Math.max(lo, Math.min(hi, avg)));
      }
      return newPos;
    });

    wolves = newWolves;
    fitness = wolves.map(objective);
  }

  let bestIdx = 0;
  for (let i = 1; i < nWolves; i++)
    if (fitness[i] < fitness[bestIdx]) bestIdx = i;
  return { best: wolves[bestIdx], val: fitness[bestIdx] };
}
```
