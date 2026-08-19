---
name: クジラ最適化アルゴリズム(WOA)
category: シミュレーション・群知能
subcategory: 群知能最適化
complexity: O(n)(1反復あたり、nはクジラの個体数)
summary: ザトウクジラが渦巻き状の泡で獲物を包囲して捕食するバブルネット採餌行動を模し、包囲・渦巻き型攻撃・ランダム探索の3挙動を確率的に切り替える群知能最適化アルゴリズム。
---

## 概要

ザトウクジラは「バブルネット採餌(bubble-net feeding)」と呼ばれる独特の集団狩猟法を持つ——獲物の群れの下に潜り込みながら渦巻き状に泡を吐き出し、泡でできた網によって獲物を水面近くの狭い範囲に追い込んでから一気に飲み込む。2016年にSeyedali MirjaliliとAndrew Lewisがこの行動を模して考案したのがクジラ最適化アルゴリズム(Whale Optimization Algorithm, WOA)であり、各「クジラ」を候補解とみなし、**獲物の包囲(encircling prey)**・**渦巻き型の泡ネット攻撃(spiral bubble-net attack)**・**ランダムな獲物探索(search for prey)**という3つの挙動を確率的に切り替えながら探索空間を狩り歩く。[粒子群最適化](/algorithms/particle-swarm-optimization)や[灰オオカミ最適化](/algorithms/grey-wolf-optimizer)と同じく「現時点の最良解に向かって群れが収束していく」という構造を持ちながら、渦巻き軌道という独自の更新式によって局所探索の精度を高めている点が特徴。

## 仕組み

WOAでは目的関数の値が最良の個体を「現在見えている獲物の位置」`X*`とみなし、各反復で以下のいずれかの挙動を確率的に選んで各クジラの位置`X`を更新する。

1. **獲物の包囲**: 確率`p < 0.5`かつ収束係数`|A| < 1`のとき、最良解`X*`に向かって位置を縮めるように更新する:
   `D = |C・X* - X|`、`X ← X* - A・D`
   ここで`A`と`C`は反復が進むにつれて変域が縮小するランダム係数で、探索初期は大きく動き、後期は最良解の近傍に収束していく
2. **渦巻き型の泡ネット攻撃**: 確率`p < 0.5`かつ`|A| < 1`のとき、上記の直線的な包囲の代わりに、最良解`X*`との距離`D' = |X* - X|`を保ちながら**らせん軌道**で近づく更新も選択肢としてあり(実装によりどちらかを確率0.5で選ぶ):
   `X ← D'・e^(b・l)・cos(2πl) + X*`
   `b`はらせんの形状を決める定数、`l`は`[-1, 1]`の乱数。バブルネットの渦巻き形状をそのまま更新式に落とし込んだのがWOAの核心的なアイデア
3. **ランダムな獲物探索**: `|A| ≥ 1`のとき(=収束係数がまだ大きく、探索の余地が大きい段階)は、最良解ではなく群れの中からランダムに選んだ個体`X_rand`を基準に位置を更新する:
   `D = |C・X_rand - X|`、`X ← X_rand - A・D`
   これにより探索初期は大域的な探索が優先され、局所最適への早すぎる収束を防ぐ
4. 全個体の位置を評価し、最良解`X*`を更新する。収束係数`A`の変域を反復数に応じて縮小させながら、終了条件(反復回数の上限など)を満たすまで1〜3を繰り返す

## 特性・トレードオフ

- **計算量**: 1反復あたりクジラの数`n`に比例するO(n)。目的関数の評価コストと反復回数の積で総計算量が決まり、他の群知能アルゴリズムと同様に厳密解を保証しない
- **探索と活用の自動的な切り替え**: 収束係数`|A|`が1より大きいか小さいかで「ランダム探索」と「最良解への収束」を切り替える設計は[灰オオカミ最適化](/algorithms/grey-wolf-optimizer)の包囲係数の考え方に近く、反復の進行だけで探索フェーズから活用フェーズへ滑らかに移行する。追加の適応パラメータのチューニングが比較的少なくて済む
- **らせん軌道による局所探索の精度**: 直線的に最良解へ近づく更新に加えて、らせん(対数螺旋)軌道での接近を選択肢に持つことで、単純な直線的収束よりも局所最適周辺を多様な角度から探ることができ、[粒子群最適化](/algorithms/particle-swarm-optimization)に比べて局所最適への早すぎる収束をある程度緩和できるとされる
- **[灰オオカミ最適化](/algorithms/grey-wolf-optimizer)との違い**: GWOがα・β・δという上位3個体の情報を平均して次の位置を決めるのに対し、WOAは常に単一の最良解`X*`(またはランダム個体)のみを参照する、よりシンプルな参照構造を持つ。その分アルゴリズムの実装は単純だが、上位複数個体の情報を統合するGWOに比べると多様性の維持は探索フェーズの確率分岐に依存する
- **使いどころ**: 連続最適化(工学設計、電力系統の最適化、画像のしきい値処理)、特徴量選択のような離散化拡張、ニューラルネットワークのハイパーパラメータ・重み最適化など、[粒子群最適化](/algorithms/particle-swarm-optimization)や[灰オオカミ最適化](/algorithms/grey-wolf-optimizer)と競合する応用範囲で広く使われる

## 実装例

球面関数(`f(x) = Σxᵢ²`、最小値は原点でゼロ)を目的関数として、クジラ最適化アルゴリズムを示す。

```python
import math
import random


def sphere(x: list[float]) -> float:
    return sum(xi**2 for xi in x)


def whale_optimization(
    objective,
    dim: int,
    bounds: tuple[float, float],
    n_whales: int = 25,
    iterations: int = 200,
    b: float = 1.0,
    seed: int = 0,
) -> tuple[list[float], float]:
    rng = random.Random(seed)
    lo, hi = bounds
    positions = [[rng.uniform(lo, hi) for _ in range(dim)] for _ in range(n_whales)]
    fitness = [objective(x) for x in positions]

    best_idx = min(range(n_whales), key=lambda i: fitness[i])
    best, best_val = list(positions[best_idx]), fitness[best_idx]

    for t in range(iterations):
        a = 2.0 - 2.0 * t / iterations  # 反復とともに2から0へ線形に縮小
        for i in range(n_whales):
            r1, r2 = rng.random(), rng.random()
            A = 2 * a * r1 - a
            C = 2 * r2
            p = rng.random()

            if p < 0.5:
                if abs(A) < 1:
                    # 獲物の包囲: 現在の最良解に向かって縮む
                    new_pos = [
                        best[d] - A * abs(C * best[d] - positions[i][d])
                        for d in range(dim)
                    ]
                else:
                    # ランダムな獲物探索: 群れの中のランダムな個体を基準にする
                    rand_whale = positions[rng.randrange(n_whales)]
                    new_pos = [
                        rand_whale[d] - A * abs(C * rand_whale[d] - positions[i][d])
                        for d in range(dim)
                    ]
            else:
                # 渦巻き型の泡ネット攻撃: らせん軌道で最良解に近づく
                l = rng.uniform(-1, 1)
                new_pos = []
                for d in range(dim):
                    dist = abs(best[d] - positions[i][d])
                    new_pos.append(
                        dist * math.exp(b * l) * math.cos(2 * math.pi * l) + best[d]
                    )

            positions[i] = [max(lo, min(hi, v)) for v in new_pos]
            fitness[i] = objective(positions[i])
            if fitness[i] < best_val:
                best_val, best = fitness[i], list(positions[i])

    return best, best_val
```

```typescript
function sphere(x: number[]): number {
  return x.reduce((s, xi) => s + xi * xi, 0);
}

function whaleOptimization(
  objective: (x: number[]) => number,
  dim: number,
  bounds: [number, number],
  nWhales = 25,
  iterations = 200,
  b = 1.0,
  rand: () => number = Math.random,
): { best: number[]; val: number } {
  const [lo, hi] = bounds;
  const positions = Array.from({ length: nWhales }, () =>
    Array.from({ length: dim }, () => lo + rand() * (hi - lo)),
  );
  const fitness = positions.map(objective);

  let bestIdx = 0;
  for (let i = 1; i < nWhales; i++)
    if (fitness[i] < fitness[bestIdx]) bestIdx = i;
  let best = [...positions[bestIdx]];
  let bestVal = fitness[bestIdx];

  for (let t = 0; t < iterations; t++) {
    const a = 2.0 - (2.0 * t) / iterations; // 反復とともに2から0へ線形に縮小
    for (let i = 0; i < nWhales; i++) {
      const r1 = rand();
      const r2 = rand();
      const A = 2 * a * r1 - a;
      const C = 2 * r2;
      const p = rand();

      let newPos: number[];
      if (p < 0.5) {
        if (Math.abs(A) < 1) {
          // 獲物の包囲: 現在の最良解に向かって縮む
          newPos = best.map(
            (bd, d) => bd - A * Math.abs(C * bd - positions[i][d]),
          );
        } else {
          // ランダムな獲物探索: 群れの中のランダムな個体を基準にする
          const randWhale = positions[Math.floor(rand() * nWhales)];
          newPos = randWhale.map(
            (rd, d) => rd - A * Math.abs(C * rd - positions[i][d]),
          );
        }
      } else {
        // 渦巻き型の泡ネット攻撃: らせん軌道で最良解に近づく
        const l = rand() * 2 - 1;
        newPos = best.map((bd, d) => {
          const dist = Math.abs(bd - positions[i][d]);
          return dist * Math.exp(b * l) * Math.cos(2 * Math.PI * l) + bd;
        });
      }

      positions[i] = newPos.map((v) => Math.max(lo, Math.min(hi, v)));
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
