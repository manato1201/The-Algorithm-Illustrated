---
name: 粘菌アルゴリズム(Slime Mould Algorithm)
category: シミュレーション・群知能
subcategory: 群知能最適化
complexity: O(n)(1反復あたり、nは個体数)
summary: 単細胞生物である変形菌が栄養源への経路を静脈状のネットワークとして最適化する生物学的挙動を模し、餌の質に応じて重みを動的に変えながら探索と活用を切り替える最適化アルゴリズム。
---

## 概要

変形菌(粘菌、スライムモールド)は単一の細胞でありながら、複数の栄養源が置かれた環境の中で、それらを結ぶ**静脈状のネットワーク**を自律的に形成することが知られている生物である。栄養が豊富な経路は太く強化され、乏しい経路は次第に細くなって消えていく——この動的な適応の結果、粘菌が作るネットワークは驚くほど効率的な輸送構造になることが実験的に示されており、実際の鉄道網の設計に着想を与えた研究例もある。2020年にShimin LiらがこのAM(activation/adaptation)的な挙動を模して考案したのが粘菌アルゴリズム(Slime Mould Algorithm, SMA)であり、各「個体」を候補解とみなし、餌の質(目的関数の値)に応じて動的に変化する**重み**を使って、良い餌に向かう経路を強化しつつランダムな探索も織り交ぜる最適化を行う。

## 仕組み

1. `n`個の個体の位置(候補解)`X`をランダムに初期化する
2. 各個体を評価し、目的関数の値で順位付けする。上位の個体(良い餌を見つけた個体)ほど大きな重み`W`が与えられるように、順位に応じて重みを計算する。重みは対数スケールで割り当てられ、さらにランダムな符号(振動)を持たせることで、良い解に近い個体でも常に一方向にだけ強化されるわけではない揺らぎを持たせる
3. 各反復で、探索と活用を切り替えるパラメータ`p`を、これまでに見つかった最良値と現在の個体の評価値から計算する。`p`が小さい(=現在の個体の評価値が良好で、最良値に近い)ほど活用寄りの更新になりやすい
4. **位置の更新**は確率的に3通りに分岐する:
   - 一定確率でランダムな位置に再配置する(未知の領域を探る)
   - `|r| < p`のとき、現在の最良解`X_best`に向かって、重み`W`で調整した経路上を移動する: `X ← X_best + vb・(W・X_A - X_B)`(`X_A`, `X_B`はランダムに選んだ2個体、`vb`は反復とともに変域が縮小する係数)
   - `|r| ≥ p`のとき、現在位置を係数`vc`(反復とともに0に近づく)でそのまま縮小させる(収束後期の微調整)
5. 全個体の位置を評価し、最良解を更新する。終了条件(反復回数の上限など)を満たすまで2〜4を繰り返す

栄養の乏しい経路が細って消えていくという生物学的な挙動は、評価の悪い個体に小さい重みしか与えず、良い個体への引力を相対的に強めるという形でアルゴリズムに反映されている。

## 特性・トレードオフ

- **計算量**: 1反復あたり個体数`n`に比例するO(n)。目的関数の評価コストと反復回数の積で総計算量が決まり、他の群知能アルゴリズムと同様に厳密解は保証しない
- **順位に基づく動的な重み付け**: 各個体の重みが固定パラメータではなく、その反復での評価順位から動的に計算される点が特徴的で、優れた解には強い引力を、劣った解には弱い引力しか与えないという淘汰圧が、[カッコウ探索](/algorithms/cuckoo-search-optimization)の托卵のような離散的な置き換えではなく、連続的な重みの形で滑らかに働く
- **探索・活用・ランダム再配置の3層構造**: パラメータ`p`による活用寄りの更新とランダムな再配置を反復ごとに確率的に切り替える設計は、[粘菌の実際の挙動](https://en.wikipedia.org/wiki/Physarum_polycephalum)——良い経路を強化しつつ、常に新しい方向への触手も伸ばし続ける——を反映しており、局所最適への早すぎる収束を防ぐ役割を果たす
- **[粒子群最適化](/algorithms/particle-swarm-optimization)との違い**: PSOが速度という慣性を持つ状態変数を各粒子が保持し続けるのに対し、SMAは速度を持たず、各反復で重みと確率分岐に基づいて位置を直接計算し直す。状態を持たない分実装はシンプルだが、収束の滑らかさはPSOの慣性項とは異なる挙動になる
- **使いどころ**: 連続最適化(工学設計のパラメータ探索、画像のしきい値処理)、特徴量選択やスケジューリングのような離散化拡張、ニューラルネットワークのハイパーパラメータ探索など、他の群知能最適化アルゴリズムと同様の応用範囲で提案されている

## 実装例

球面関数(`f(x) = Σxᵢ²`、最小値は原点でゼロ)を目的関数として、簡易版の粘菌アルゴリズムを示す。

```python
import math
import random


def sphere(x: list[float]) -> float:
    return sum(xi**2 for xi in x)


def slime_mould_algorithm(
    objective,
    dim: int,
    bounds: tuple[float, float],
    n_agents: int = 25,
    iterations: int = 200,
    z: float = 0.03,
    seed: int = 0,
) -> tuple[list[float], float]:
    rng = random.Random(seed)
    lo, hi = bounds
    positions = [[rng.uniform(lo, hi) for _ in range(dim)] for _ in range(n_agents)]
    fitness = [objective(x) for x in positions]

    best_idx = min(range(n_agents), key=lambda i: fitness[i])
    best, best_val = list(positions[best_idx]), fitness[best_idx]

    for t in range(iterations):
        order = sorted(range(n_agents), key=lambda i: fitness[i])
        worst_val = fitness[order[-1]]
        # 順位に応じた重み: 良い個体ほど大きく、ランダムな符号で揺らぎを持たせる
        weights = [0.0] * n_agents
        denom = (best_val - worst_val) or 1e-12
        for rank, idx in enumerate(order):
            sign = 1 if rng.random() < 0.5 else -1
            score = (best_val - fitness[idx]) / denom
            weights[idx] = 1 + sign * rng.random() * math.log10(score + 1)

        a = math.atanh(max(-0.999999, min(0.999999, 1 - (t + 1) / iterations)))
        vb_scale = a
        vc = 1 - (t + 1) / iterations

        for i in range(n_agents):
            if rng.random() < z:
                # ランダムな再配置: 未知の領域を探る
                positions[i] = [rng.uniform(lo, hi) for _ in range(dim)]
            else:
                p = math.tanh(abs(fitness[i] - best_val))
                r = rng.uniform(-1, 1)
                if abs(r) < p:
                    ia, ib = rng.randrange(n_agents), rng.randrange(n_agents)
                    vb = rng.uniform(-vb_scale, vb_scale)
                    positions[i] = [
                        best[d]
                        + vb * (weights[i] * positions[ia][d] - positions[ib][d])
                        for d in range(dim)
                    ]
                else:
                    positions[i] = [v * vc for v in positions[i]]

            positions[i] = [max(lo, min(hi, v)) for v in positions[i]]
            fitness[i] = objective(positions[i])
            if fitness[i] < best_val:
                best_val, best = fitness[i], list(positions[i])

    return best, best_val
```

```typescript
function sphere(x: number[]): number {
  return x.reduce((s, xi) => s + xi * xi, 0);
}

function slimeMouldAlgorithm(
  objective: (x: number[]) => number,
  dim: number,
  bounds: [number, number],
  nAgents = 25,
  iterations = 200,
  z = 0.03,
  rand: () => number = Math.random,
): { best: number[]; val: number } {
  const [lo, hi] = bounds;
  const positions = Array.from({ length: nAgents }, () =>
    Array.from({ length: dim }, () => lo + rand() * (hi - lo)),
  );
  const fitness = positions.map(objective);

  let bestIdx = 0;
  for (let i = 1; i < nAgents; i++)
    if (fitness[i] < fitness[bestIdx]) bestIdx = i;
  let best = [...positions[bestIdx]];
  let bestVal = fitness[bestIdx];

  for (let t = 0; t < iterations; t++) {
    const order = [...positions.keys()].sort((a, b) => fitness[a] - fitness[b]);
    const worstVal = fitness[order[order.length - 1]];
    // 順位に応じた重み: 良い個体ほど大きく、ランダムな符号で揺らぎを持たせる
    const weights = new Array(nAgents).fill(0);
    const denom = bestVal - worstVal || 1e-12;
    for (const idx of order) {
      const sign = rand() < 0.5 ? 1 : -1;
      const score = (bestVal - fitness[idx]) / denom;
      weights[idx] = 1 + sign * rand() * Math.log10(score + 1);
    }

    const vbScale = Math.atanh(
      Math.max(-0.999999, Math.min(0.999999, 1 - (t + 1) / iterations)),
    );
    const vc = 1 - (t + 1) / iterations;

    for (let i = 0; i < nAgents; i++) {
      if (rand() < z) {
        // ランダムな再配置: 未知の領域を探る
        positions[i] = Array.from(
          { length: dim },
          () => lo + rand() * (hi - lo),
        );
      } else {
        const p = Math.tanh(Math.abs(fitness[i] - bestVal));
        const r = rand() * 2 - 1;
        if (Math.abs(r) < p) {
          const ia = Math.floor(rand() * nAgents);
          const ib = Math.floor(rand() * nAgents);
          const vb = (rand() * 2 - 1) * vbScale;
          positions[i] = best.map(
            (bd, d) =>
              bd + vb * (weights[i] * positions[ia][d] - positions[ib][d]),
          );
        } else {
          positions[i] = positions[i].map((v) => v * vc);
        }
      }

      positions[i] = positions[i].map((v) => Math.max(lo, Math.min(hi, v)));
      fitness[i] = objective(positions[i]);
      if (fitness[i] < bestVal) {
        bestVal = fitness[i];
        best = [...positions[i]];
      }
    }
  }

  return { best, val: bestVal };
}
```
