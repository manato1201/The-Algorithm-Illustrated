---
name: バットアルゴリズム(Bat Algorithm)
category: シミュレーション・群知能
subcategory: 群知能最適化
complexity: O(n)(1反復あたり、nはコウモリの個体数)
summary: コウモリのエコーロケーション(反響定位)行動を模し、個体ごとに周波数・パルス率・音量を動的調整しながら探索と活用を切り替える群知能最適化アルゴリズム。
---

## 概要

コウモリは暗闇の中で超音波(エコーロケーション)を発し、その反響(エコー)が獲物や障害物から返ってくるまでの時間と強さから、周囲の環境や獲物までの距離を把握する。獲物に近づくにつれてコウモリは発するパルスの周波数を上げ、パルスを発する頻度(パルス率)を高め、逆に音量を下げていく——これは「大まかに探っている段階では低頻度・大音量のパルスで広く探り、獲物に狙いを定めた段階では高頻度・小音量のパルスで精密に距離を測る」という、探索(exploration)から活用(exploitation)へと自然に移行する行動パターンである。2010年にXin-She Yangがこの生態を模して考案したのがバットアルゴリズムであり、各「コウモリ」を候補解とみなし、周波数・パルス率・音量という3つのパラメータを個体ごとに動的に変化させながら探索空間を飛び回らせることで、[粒子群最適化](/algorithms/particle-swarm-optimization)に似た速度ベースの更新に、確率的な局所探索の要素を組み合わせた最適化を行う。

## 仕組み

1. `n`匹のコウモリの位置(候補解)`x_i`と速度`v_i`をランダムに初期化する。各コウモリはパルス率`r_i`(高いほど頻繁にパルスを発する)と音量`A_i`(大きいほど探索的)を持ち、初期値はそれぞれ小さい値・大きい値付近に設定する
2. 各コウモリについて、周波数`f_i`を範囲`[f_min, f_max]`からランダムに選び、速度と位置を次式で更新する(現在の全体最良解`x_*`へ向かう力を含む点は[粒子群最適化](/algorithms/particle-swarm-optimization)に近い):
   `v_i ← v_i + (x_i - x_*)・f_i`
   `x_i ← x_i + v_i`
3. **局所探索への切り替え**: 確率`r_i`より大きい乱数が出た場合(=そのコウモリのパルス率が高く、獲物に近づいている段階を意味する)、全体最良解`x_*`の近傍でランダムに小さく揺らした新しい解を生成し、`x_i`を置き換える候補とする
4. **受理判定**: 生成した新しい解を評価し、それが改善していて、かつ乱数が音量`A_i`より小さければ(=このコウモリの音量がまだ十分大きく探索を許容する段階であれば)新しい解を受理する
5. 解を受理した場合、パルス率`r_i`を徐々に増加させ、音量`A_i`を徐々減少させる(獲物に近づくほど頻繁かつ静かにパルスを発するようになるという生態を反映)。典型的には`r_i ← r_i^0・(1 - e^(-γt))`、`A_i ← α・A_i`のような式で更新する
6. 全体最良解`x_*`を更新し、終了条件(反復回数の上限など)を満たすまで2〜5を繰り返す

## 特性・トレードオフ

- **計算量**: 1反復あたりコウモリの数`n`に比例するO(n)。目的関数の評価コストと反復回数を掛け合わせた総計算量は問題依存で、他の群知能アルゴリズムと同様に厳密解は保証しない
- **周波数による探索範囲の自動調整**: 周波数`f_i`をランダムに変化させることで、コウモリごとに全体最良解へ向かう「歩幅」が自然にばらつき、[粒子群最適化](/algorithms/particle-swarm-optimization)よりも多様なステップサイズでの探索が起こりやすい
- **パルス率・音量による探索から活用への遷移**: 反復が進むにつれてパルス率が上がり音量が下がっていくよう設計されているため、探索初期は広い範囲を探り、後期には最良解周辺を集中的に磨き込むという、局所探索への自然な移行が個体ごとに(かつ確率的に)起こる。この切り替えを外部スケジュールではなく各個体の状態変数として持つ点が特徴的
- **[粒子群最適化](/algorithms/particle-swarm-optimization)との違い**: PSOは自己ベストと全体ベストの2つの引力で更新するのに対し、バットアルゴリズムは全体最良解のみを参照しつつ、パルス率・音量という追加の確率的制御変数で探索と活用のバランスを個体単位で調整する。パラメータが増える分チューニングの余地も増えるが、収束後期の局所探索能力は強化されやすい
- **使いどころ**: 連続最適化問題(工学設計のパラメータ最適化、ニューラルネットワークのハイパーパラメータ探索)、スケジューリングなどの組み合わせ最適化への離散化拡張、多峰性(局所最適解が多数存在する)の目的関数に対する大域的探索

## 実装例

球面関数(`f(x) = Σxᵢ²`、最小値は原点でゼロ)を目的関数として、簡易版のバットアルゴリズムを示す。

```python
import random


def sphere(x: list[float]) -> float:
    return sum(xi**2 for xi in x)


def bat_algorithm(
    objective,
    dim: int,
    bounds: tuple[float, float],
    n_bats: int = 25,
    iterations: int = 200,
    f_min: float = 0.0,
    f_max: float = 2.0,
    alpha: float = 0.9,
    gamma: float = 0.9,
    seed: int = 0,
) -> tuple[list[float], float]:
    rng = random.Random(seed)
    lo, hi = bounds
    positions = [[rng.uniform(lo, hi) for _ in range(dim)] for _ in range(n_bats)]
    velocities = [[0.0] * dim for _ in range(n_bats)]
    fitness = [objective(x) for x in positions]
    pulse_rate = [0.5] * n_bats
    loudness = [1.0] * n_bats

    best_idx = min(range(n_bats), key=lambda i: fitness[i])
    best, best_val = list(positions[best_idx]), fitness[best_idx]

    for t in range(iterations):
        for i in range(n_bats):
            freq = f_min + (f_max - f_min) * rng.random()
            for d in range(dim):
                velocities[i][d] += (positions[i][d] - best[d]) * freq
            candidate = [
                max(lo, min(hi, positions[i][d] + velocities[i][d]))
                for d in range(dim)
            ]

            # パルス率が高いほど、全体最良解の近傍を探る局所探索に切り替わる
            if rng.random() > pulse_rate[i]:
                eps = rng.uniform(-1, 1)
                avg_loudness = sum(loudness) / n_bats
                candidate = [
                    max(lo, min(hi, best[d] + eps * avg_loudness)) for d in range(dim)
                ]

            candidate_val = objective(candidate)
            # 改善していて、かつ音量の閾値を満たせば新しい解を受理する
            if candidate_val <= fitness[i] and rng.random() < loudness[i]:
                positions[i], fitness[i] = candidate, candidate_val
                loudness[i] *= alpha
                pulse_rate[i] = 0.5 * (1 - pow(2.718281828, -gamma * t))

            if fitness[i] < best_val:
                best_val, best = fitness[i], list(positions[i])

    return best, best_val
```

```typescript
function sphere(x: number[]): number {
  return x.reduce((s, xi) => s + xi * xi, 0);
}

function batAlgorithm(
  objective: (x: number[]) => number,
  dim: number,
  bounds: [number, number],
  nBats = 25,
  iterations = 200,
  fMin = 0.0,
  fMax = 2.0,
  alpha = 0.9,
  gamma = 0.9,
  rand: () => number = Math.random,
): { best: number[]; val: number } {
  const [lo, hi] = bounds;
  const positions = Array.from({ length: nBats }, () =>
    Array.from({ length: dim }, () => lo + rand() * (hi - lo)),
  );
  const velocities = Array.from({ length: nBats }, () =>
    new Array(dim).fill(0),
  );
  const fitness = positions.map(objective);
  const pulseRate = new Array(nBats).fill(0.5);
  const loudness = new Array(nBats).fill(1.0);

  let bestIdx = 0;
  for (let i = 1; i < nBats; i++)
    if (fitness[i] < fitness[bestIdx]) bestIdx = i;
  let best = [...positions[bestIdx]];
  let bestVal = fitness[bestIdx];

  for (let t = 0; t < iterations; t++) {
    for (let i = 0; i < nBats; i++) {
      const freq = fMin + (fMax - fMin) * rand();
      for (let d = 0; d < dim; d++) {
        velocities[i][d] += (positions[i][d] - best[d]) * freq;
      }
      let candidate = positions[i].map((v, d) =>
        Math.max(lo, Math.min(hi, v + velocities[i][d])),
      );

      // パルス率が高いほど、全体最良解の近傍を探る局所探索に切り替わる
      if (rand() > pulseRate[i]) {
        const eps = rand() * 2 - 1;
        const avgLoudness = loudness.reduce((s, a) => s + a, 0) / nBats;
        candidate = best.map((b) =>
          Math.max(lo, Math.min(hi, b + eps * avgLoudness)),
        );
      }

      const candidateVal = objective(candidate);
      // 改善していて、かつ音量の閾値を満たせば新しい解を受理する
      if (candidateVal <= fitness[i] && rand() < loudness[i]) {
        positions[i] = candidate;
        fitness[i] = candidateVal;
        loudness[i] *= alpha;
        pulseRate[i] = 0.5 * (1 - Math.exp(-gamma * t));
      }

      if (fitness[i] < bestVal) {
        bestVal = fitness[i];
        best = [...positions[i]];
      }
    }
  }

  return { best, val: bestVal };
}
```
