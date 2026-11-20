---
name: Isolation Forest(孤立の森)
category: 機械学習
subcategory: 教師なし学習
complexity: 学習 O(t·ψ log ψ)(t=木の数、ψ=部分標本の大きさ)、スコア計算 O(t log ψ)
summary: データをランダムな分割で切り刻んでいき、「少ない分割で1点だけに孤立する点ほど異常」とみなす異常検知。距離や密度を計算しないので、高速で大きなデータにも向く。
---

## 概要

異常検知の古典的な方法は、「正常なデータの分布を作り、そこから外れた点を異常と呼ぶ」もので、距離や密度を計算する(近傍法、LOFなど)。しかしこれらは、点の数が増えると計算が重く、高次元では距離が意味を失いやすい。

Isolation Forest(Liu、Ting、Zhou、2008年)は発想を逆にした。**正常な点を表現するのでなく、異常な点を「孤立させる」のが簡単だ**という性質を使う。異常な点は少数で、他の点から遠くに離れている。したがって、「ランダムな特徴量を選び、その範囲内でランダムな位置で切る」を繰り返すと、異常な点は**少ない分割回数で一人きりになる**。正常な点は密集しているので、孤立させるのに何度も切らなければならない。この「孤立までの分割回数(木の深さ)」を異常度にする。

## 仕組み

1. **学習**: 全データからランダムに `ψ` 点の部分標本を取り、孤立木(isolation tree)を作る。これを `t` 本(例: 100本)繰り返す。部分標本が小さい(例: 256点)ほうが、異常と正常の区別が付きやすい(密な領域が他の点を隠す「マスキング」と、近い点が混ざる「スワンピング」を減らせる)
2. **孤立木の作り方**: 点の集合に対して、ランダムに特徴量を1つ選び、その特徴量の最小値と最大値の間でランダムに分割値を選ぶ。分割値より小さい点を左、そうでない点を右の部分木にして再帰する。点が1つになるか、深さの上限(`⌈log₂ ψ⌉`)に達したら止める
3. **経路長**: ある点 `x` が葉に至るまでの辺の数を `h(x)` とする。深さの上限で止まった葉にまだ複数の点があれば、その点数 `n` の二分探索木の平均的な未到達の深さ `c(n)` を足して補正する。ここで `c(n) = 2H(n−1) − 2(n−1)/n`、`H(i) ≈ ln(i) + 0.5772`(オイラーの定数)
4. **異常スコア**: `s(x) = 2^( −E[h(x)] / c(ψ) )`。`E[h(x)]` は全部の木での平均の経路長
   - `s` が1に近い: 異常(平均経路長が非常に短い)
   - `s` が0.5前後: 特に異常でない
   - `s` が0に近い: 正常(平均経路長が長い)

## 特性・トレードオフ

- **距離や密度を使わない**: 各木の作成は、ソートも距離計算もせず、ランダムな分割だけ。学習がほぼ線形時間で、大規模データでも扱える
- **学習は正常データだけで足りる**: ラベルは不要(教師なし)。ただし、異常が全体の多くを占めるデータには向かない
- **軸に平行な分割の癖**: 分割が特徴量の軸に平行なので、軸に対して斜めに伸びた分布では、実際より検出が鈍ることがある。この点を改良した Extended Isolation Forest がある
- **閾値の決め方**: スコアの閾値は、異常の割合(contamination)を想定して決める。スコアは「異常の順位付け」としては頼れるが、絶対的な確率ではない
- **局所的な異常には鈍い**: 全体から見て孤立している点を見つけるのは得意だが、密度の異なる領域の中で相対的に外れている点(局所異常)の検出は、LOFのほうが得意なことがある
- **使いどころ**: 不正取引の検出、サーバーログやセンサーデータの異常、製造工程の不良検知、データクリーニングでの外れ値の洗い出し

## 実装例

```python
import math
import random


def c(n):
    """n 点の二分探索木で、1点が見つかるまでの平均的な比較回数の補正項。"""
    if n <= 1:
        return 0.0
    return 2 * (math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n


def build_tree(points, depth, limit, rng):
    if depth >= limit or len(points) <= 1:
        return ("leaf", len(points), depth)
    dim = rng.randrange(len(points[0]))
    lo = min(p[dim] for p in points)
    hi = max(p[dim] for p in points)
    if lo == hi:
        return ("leaf", len(points), depth)
    split = rng.uniform(lo, hi)
    left = [p for p in points if p[dim] < split]
    right = [p for p in points if p[dim] >= split]
    return ("node", dim, split, build_tree(left, depth + 1, limit, rng), build_tree(right, depth + 1, limit, rng))


def path_length(tree, x):
    if tree[0] == "leaf":
        return tree[2] + c(tree[1])
    _, dim, split, left, right = tree
    return path_length(left if x[dim] < split else right, x)


def fit(data, trees=100, sample=16, seed=0):
    rng = random.Random(seed)
    limit = math.ceil(math.log2(sample))
    return [build_tree(rng.sample(data, sample), 0, limit, rng) for _ in range(trees)], sample


def score(forest, x):
    trees, sample = forest
    mean_h = sum(path_length(t, x) for t in trees) / len(trees)
    return 2 ** (-mean_h / c(sample))


rng = random.Random(1)
normal = [(rng.gauss(0, 1), rng.gauss(0, 1)) for _ in range(200)]
forest = fit(normal)
print(round(score(forest, (0.1, -0.2)), 3))  # 正常: 0.5 より小さい
print(round(score(forest, (6.0, 6.0)), 3))   # 異常: 正常より明らかに大きい(小さな標本・浅い木なので1には届かない)
```

```typescript
type Tree =
  | { leaf: true; size: number; depth: number }
  | { leaf: false; dim: number; split: number; left: Tree; right: Tree };

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const c = (n: number): number => (n <= 1 ? 0 : 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n);

function buildTree(points: number[][], depth: number, limit: number, rng: () => number): Tree {
  if (depth >= limit || points.length <= 1) return { leaf: true, size: points.length, depth };
  const dim = Math.floor(rng() * points[0].length);
  const values = points.map((p) => p[dim]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (lo === hi) return { leaf: true, size: points.length, depth };
  const split = lo + rng() * (hi - lo);
  return {
    leaf: false,
    dim,
    split,
    left: buildTree(points.filter((p) => p[dim] < split), depth + 1, limit, rng),
    right: buildTree(points.filter((p) => p[dim] >= split), depth + 1, limit, rng),
  };
}

function pathLength(tree: Tree, x: number[]): number {
  if (tree.leaf) return tree.depth + c(tree.size);
  return pathLength(x[tree.dim] < tree.split ? tree.left : tree.right, x);
}

function fit(data: number[][], trees = 100, sample = 16, seed = 0) {
  const rng = makeRng(seed);
  const limit = Math.ceil(Math.log2(sample));
  const forest: Tree[] = [];
  for (let t = 0; t < trees; t++) {
    const pool = [...data];
    const picked: number[][] = [];
    for (let i = 0; i < sample; i++) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    forest.push(buildTree(picked, 0, limit, rng));
  }
  return { forest, sample };
}

function score(model: ReturnType<typeof fit>, x: number[]): number {
  const mean = model.forest.reduce((s, t) => s + pathLength(t, x), 0) / model.forest.length;
  return 2 ** (-mean / c(model.sample));
}

const rng = makeRng(1);
const gauss = () => Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());
const data = Array.from({ length: 200 }, () => [gauss(), gauss()]);
const model = fit(data);
console.log(score(model, [0.1, -0.2]).toFixed(3)); // 正常
console.log(score(model, [6, 6]).toFixed(3)); // 異常(正常より大きい)
```
