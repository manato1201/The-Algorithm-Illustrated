---
name: イジング模型(メトロポリス法)
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: 1スイープ O(L²)(L×L格子の全スピンを1回ずつ更新)
summary: 格子上のスピン(±1)が隣と揃うとエネルギーが下がる模型を、ランダムに反転させて確率的に受理するメトロポリス法で動かす。温度によって秩序と無秩序が切り替わる相転移を再現する。
---

## 概要

鉄のような磁石は、熱すると磁力を失う。個々の原子の小さな磁石(スピン)が、低温では同じ向きに揃って強い磁化を生み、高温では熱運動でばらばらになって打ち消し合う。この「温度によって、全体の性質が急に変わる」相転移を、最も単純な形で説明するのがイジング模型である。1920年にLenzが提案し、1925年にその弟子のIsingが1次元の場合を解いた(1次元では相転移が起きない)。2次元の場合は、Onsagerが1944年に厳密解を求め、有限温度で相転移が起きること、その臨界温度が `T_c = 2 / ln(1+√2) ≈ 2.269`(結合定数 J=1、ボルツマン定数 k=1 の単位)であることが示された。

厳密解が得られない場合や、より複雑な系では、シミュレーションで調べる。メトロポリス法(Metropolis ら、1953年)は、「エネルギーが下がる変化は必ず、上がる変化も温度に応じた確率で受け入れる」という規則を繰り返すと、系が熱平衡の分布に従う状態を訪れる、というモンテカルロ法で、イジング模型の標準的な計算方法になった。格子の局所的な規則で全体が決まる点はセルオートマトンと似ているが、更新が確率的で、温度というパラメータを持つ。

## 仕組み

`L×L` の格子で、各サイト `i` にスピン `s_i = ±1` がある。周期境界条件を使う(端がつながっている)。系のエネルギーは `E = −J Σ_{隣接する i,j} s_i s_j`。隣り合うスピンが同じ向きなら `−J`(低い)、逆向きなら `+J`(高い)。

1. 初期状態を作る(全部上向き、またはランダム)
2. ランダムにサイト `i` を選び、そのスピンを反転させたときのエネルギー変化を計算する
   `ΔE = 2 J s_i Σ_{j ∈ 隣接4サイト} s_j`
3. **受理判定**:
   - `ΔE ≤ 0`: 必ず反転する
   - `ΔE > 0`: 確率 `exp(−ΔE / T)` で反転する(`T` は温度)
4. 2〜3を `L²` 回行うと「1スイープ」。多数回(平衡に達するまで)繰り返してから、磁化 `M = Σ s_i / L²` やエネルギーを測る

低温(`T < T_c`)では、スピンの大半が同じ向きに揃い、磁化の絶対値が1に近づく。高温(`T > T_c`)では、向きがばらばらで磁化の平均はほぼ0。臨界温度の近くでは、揃った領域の大きさが急速に増え、計算の収束も遅くなる(臨界減速)。

## 特性・トレードオフ

- **詳細釣り合い**: 上の受理規則は、系が温度 `T` の熱平衡(ボルツマン分布)に収束することを保証する。長い時間の平均が、統計力学の期待値になる
- **臨界減速**: `T_c` の近くでは、1回の反転が小さな変更しか生まないため、状態が変わるのに非常に多くのスイープが要る。Wolff法やSwendsen–Wang法のように、クラスタをまとめて反転させる方法で改善される
- **初期状態の影響**: 平衡に達する前の最初の部分(熱化)は、測定から除く。低温では、全部上向きから始めるか、ランダムから始めるかで、収束までの様子が違う
- **乱数の質**: 長いシミュレーションでは乱数の周期や相関が結果に影響する
- **応用の広がり**: 磁性だけでなく、合金の秩序、格子気体、ニューラルネットワーク(ホップフィールド網、ボルツマンマシン)、社会的な意見の同調モデル、画像のノイズ除去など、「隣と揃うと得をする」二値の系に広く使われる

## 実装例

```python
import math
import random


def simulate(L, T, sweeps, seed=0):
    rng = random.Random(seed)
    spin = [[1] * L for _ in range(L)]              # 全部上向きから始める
    magnetization = []
    for sweep in range(sweeps):
        for _ in range(L * L):
            i, j = rng.randrange(L), rng.randrange(L)
            neighbors = spin[(i + 1) % L][j] + spin[(i - 1) % L][j] + spin[i][(j + 1) % L] + spin[i][(j - 1) % L]
            delta = 2 * spin[i][j] * neighbors      # 反転したときのエネルギー変化(J=1)
            if delta <= 0 or rng.random() < math.exp(-delta / T):
                spin[i][j] *= -1
        if sweep >= sweeps // 2:                    # 前半は熱化として捨てる
            magnetization.append(abs(sum(map(sum, spin))) / (L * L))
    return sum(magnetization) / len(magnetization)


for T in (1.5, 2.269, 4.0):
    print(f"T={T}: |M| = {simulate(16, T, 400):.2f}")  # 低温は1に近く、高温は0に近い(臨界温度付近は不安定で、小さな格子では値がばらつく)
```

```typescript
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function simulate(L: number, T: number, sweeps: number, seed = 0): number {
  const rng = makeRng(seed);
  const spin = Array.from({ length: L }, () => new Array<number>(L).fill(1));
  let total = 0;
  let count = 0;
  for (let sweep = 0; sweep < sweeps; sweep++) {
    for (let k = 0; k < L * L; k++) {
      const i = Math.floor(rng() * L);
      const j = Math.floor(rng() * L);
      const neighbors =
        spin[(i + 1) % L][j] +
        spin[(i - 1 + L) % L][j] +
        spin[i][(j + 1) % L] +
        spin[i][(j - 1 + L) % L];
      const delta = 2 * spin[i][j] * neighbors;
      if (delta <= 0 || rng() < Math.exp(-delta / T)) spin[i][j] *= -1;
    }
    if (sweep >= sweeps / 2) {
      total += Math.abs(spin.flat().reduce((a, b) => a + b, 0)) / (L * L);
      count++;
    }
  }
  return total / count;
}

for (const T of [1.5, 2.269, 4.0])
  console.log(`T=${T}: |M| = ${simulate(16, T, 400).toFixed(2)}`);
```
