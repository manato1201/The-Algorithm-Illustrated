---
name: 自己組織化マップ(SOM)
category: 機械学習
subcategory: 教師なし学習
complexity: 1反復 O(ユニット数 × 次元数)(勝者の探索 + 近傍の更新)
summary: 格子状に並べたユニットが入力データに近づくよう少しずつ動き、隣り合うユニットが似た入力を担当するようになる、高次元データを2次元の地図に写す教師なし学習。
---

## 概要

何十次元もあるデータを人間が眺めるには、低次元に落とす必要がある。主成分分析は線形な射影に限られ、[t-SNE](/algorithms/t-sne-dimensionality-reduction)は点ごとの配置を最適化するので新しいデータを後から置けない。

自己組織化マップ(Self-Organizing Map、Teuvo Kohonen、1982年)は、脳の感覚野で似た刺激が近い場所に写るという性質にヒントを得た。**2次元の格子状に並べたユニット(ノード)が、それぞれ入力と同じ次元の重みベクトルを持つ**。入力が来るたびに、最も近い重みを持つユニット(勝者、BMU: best matching unit)とその格子上の近隣が、入力に引き寄せられる。繰り返すと、格子上で近いユニットが入力空間でも近い領域を担当し、データの位相的な構造を保った「地図」ができる。

## 仕組み

格子は `W × H` 個のユニットで、各ユニット `u` は重みベクトル `w_u` を持つ(最初はランダム)。

1. 入力ベクトル `x` を1つ選ぶ
2. 全ユニットのうち、`‖x − w_u‖` が最小のユニット(勝者 `c`)を探す
3. 勝者と、格子上でその近くにあるユニットの重みを、入力に近づける
   `w_u ← w_u + α(t) · h(u, c, t) · (x − w_u)`
   - `α(t)`: 学習率。時間とともに小さくする
   - `h(u, c, t)`: 近傍関数。格子上での `u` と `c` の距離 `d` に対し、ガウス関数 `exp(−d² / (2σ(t)²))` のように、近いほど大きく、遠いほど0に近い。`σ(t)` も時間とともに小さくする
4. 1〜3を、学習率と近傍の半径が十分小さくなるまで多数回繰り返す

最初は近傍の半径が大きいので、格子全体が大まかにデータの広がりに沿って動く。半径が小さくなるにつれて、局所的な微調整が進む。この二段階が、地図の全体の向きとなめらかさを両立させる。

## 特性・トレードオフ

- **位相を保つ**: 入力空間で近い点は、格子上でも近いユニットに写る。クラスタの数や位置を事前に指定しなくても、全体の形が見える
- **新しいデータを後から配置できる**: 学習後は、各入力の勝者ユニットを求めるだけで、地図上の位置が決まる
- **ハイパーパラメータの調整が要る**: 格子の大きさ、学習率と近傍半径の減らし方、反復回数が結果に影響する。同じデータでも、初期値によって地図の向きが変わる
- **評価が難しい**: 結果の良し悪しは、量子化誤差(入力と勝者の距離の平均)と位相誤差(第1・第2勝者が格子上で隣り合っていない割合)などで測るが、決定的な基準はない
- **似た手法との違い**: k-means は各点を最も近い代表に割り当てる(代表間に格子の関係がない)。SOM は代表(ユニット)に格子の近さの制約を持たせたk-meansに近い、と考えると位置づけが分かりやすい
- **使いどころ**: 高次元データの可視化(顧客や文書の分類地図)、画像や音声の特徴の整理、異常検知(勝者との距離が大きい入力を異常とみなす)、色の量子化

## 実装例

```python
import math
import random


def train_som(data, width=5, height=5, epochs=3000, seed=0):
    rng = random.Random(seed)
    dim = len(data[0])
    weights = [[[rng.random() for _ in range(dim)] for _ in range(width)] for _ in range(height)]
    for t in range(epochs):
        progress = t / epochs
        alpha = 0.5 * (1 - progress)                          # 学習率
        sigma = max(0.5, (max(width, height) / 2) * (1 - progress))  # 近傍の半径
        x = rng.choice(data)
        best = min(((r, q) for r in range(height) for q in range(width)),
                   key=lambda rq: sum((a - b) ** 2 for a, b in zip(weights[rq[0]][rq[1]], x)))
        for r in range(height):
            for q in range(width):
                d2 = (r - best[0]) ** 2 + (q - best[1]) ** 2
                h = math.exp(-d2 / (2 * sigma * sigma))
                w = weights[r][q]
                for i in range(dim):
                    w[i] += alpha * h * (x[i] - w[i])
    return weights


def quantization_error(data, weights):
    flat = [w for row in weights for w in row]
    return sum(min(math.dist(x, w) for w in flat) for x in data) / len(data)


rng = random.Random(1)
data = [(rng.random(), rng.random()) for _ in range(300)]  # 正方形の中の一様な点
before = [[[0.5, 0.5] for _ in range(5)] for _ in range(5)]  # 全ユニットが中央にある初期状態
after = train_som(data)
print(round(quantization_error(data, before), 3), "->", round(quantization_error(data, after), 3))
```

```typescript
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Vec = number[];

function trainSom(
  data: Vec[],
  width = 5,
  height = 5,
  epochs = 3000,
  seed = 0,
): Vec[][] {
  const rng = makeRng(seed);
  const dim = data[0].length;
  const weights: Vec[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () =>
      Array.from({ length: dim }, () => rng()),
    ),
  );
  for (let t = 0; t < epochs; t++) {
    const progress = t / epochs;
    const alpha = 0.5 * (1 - progress);
    const sigma = Math.max(0.5, (Math.max(width, height) / 2) * (1 - progress));
    const x = data[Math.floor(rng() * data.length)];
    let best: [number, number] = [0, 0];
    let bestDist = Infinity;
    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const d = weights[r][q].reduce((s, w, i) => s + (w - x[i]) ** 2, 0);
        if (d < bestDist) {
          bestDist = d;
          best = [r, q];
        }
      }
    }
    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const d2 = (r - best[0]) ** 2 + (q - best[1]) ** 2;
        const h = Math.exp(-d2 / (2 * sigma * sigma));
        for (let i = 0; i < dim; i++)
          weights[r][q][i] += alpha * h * (x[i] - weights[r][q][i]);
      }
    }
  }
  return weights;
}

function quantizationError(data: Vec[], weights: Vec[][]): number {
  const flat = weights.flat();
  const dist = (a: Vec, b: Vec) => Math.hypot(...a.map((v, i) => v - b[i]));
  return (
    data.reduce((s, x) => s + Math.min(...flat.map((w) => dist(x, w))), 0) /
    data.length
  );
}

const rng = makeRng(1);
const data: Vec[] = Array.from({ length: 300 }, () => [rng(), rng()]);
const init = Array.from({ length: 5 }, () =>
  Array.from({ length: 5 }, () => [0.5, 0.5]),
);
console.log(
  quantizationError(data, init).toFixed(3),
  "->",
  quantizationError(data, trainSom(data)).toFixed(3),
);
```
