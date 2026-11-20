---
name: 反復局所探索(ILS)
category: 最適化・確率的手法
subcategory: 局所探索
complexity: 1反復あたり 摂動 + 局所探索のコスト(反復回数は任意)
summary: 局所最適に達したら解を少しだけ崩し(摂動)、再び局所探索をかけて、改善していれば乗り換える。局所最適から抜け出すための、最も単純な枠組みのひとつ。
---

## 概要

[山登り法](/algorithms/hill-climbing)や、2-opt のような局所探索は、近傍に改善がなくなると止まる。そこが局所最適で、全体の最適とは限らない。ランダムな初期解から何度もやり直せば(多点スタート)いくらか良くなるが、毎回ゼロから探索するので、良い解の構造を何も引き継がない。

反復局所探索(Iterated Local Search、ILS)は、**局所最適の解を出発点に、解を少しだけ崩してからもう一度局所探索する**という発想である。良い局所最適の近くには、別の良い局所最適がある、という経験則(巨大な谷の構造)を利用する。崩し方(摂動)は、局所探索の近傍では戻せない程度に大きく、それでも元の解の骨格が残る程度に小さくする。1990年代から2000年前後にかけて、この考え方が「ILS」として整理され(Lourenço、Martin、Stützle ら)、巡回セールスマン問題やスケジューリングで強い結果を示した。

## 仕組み

1. 初期解 `s` を作り、局所探索をかけて局所最適 `s*` を得る
2. 次を終了条件まで繰り返す
   - **摂動**: `s*` に、局所探索の近傍では簡単に元に戻せない変更を加えて `s'` を作る
   - **局所探索**: `s'` に局所探索をかけて局所最適 `s*'` を得る
   - **受理判定**: `s*'` が `s*` より良ければ乗り換える(より緩い基準として、同等以上なら受理する、確率的に悪化も受理する、などがある)
3. 見つかった最良の解を返す

巡回セールスマン問題での定番の組み合わせは、局所探索が 2-opt や Or-opt、摂動が**ダブルブリッジ**(経路を4つの区間に切り、2つ目と3つ目を入れ替える。2-opt の1手では元に戻せない)。

## 特性・トレードオフ

- **構成が単純**: 既存の局所探索に「摂動」と「受理判定」を付けるだけで作れる。メタヒューリスティクスの入門として扱いやすい
- **摂動の強さが勝負**: 弱すぎると同じ局所最適に戻る。強すぎるとランダム再スタートに近づき、構造を引き継げない。問題と近傍に合わせた調整が要る
- **受理判定の選択**: 「改善のみ受理」は集中的(局所最適の近くに留まる)。「毎回受理」は多様性が高いがランダムウォークに近い。両者の間を取る(わずかな悪化も許す、一定回数改善がなければ再スタート)ことが多い
- **他手法との関係**: 焼きなまし法や[タブーサーチ](/algorithms/tabu-search)は「探索中に悪い方向へも動く」、ILSは「局所最適に達してから崩す」という違いがある。[変数近傍探索](/algorithms/variable-neighborhood-search)は、摂動を段階的に強める同系統の手法
- **使いどころ**: 巡回セールスマン問題、二次割当問題、ジョブショップ・スケジューリング、パッキング問題など、強力な局所探索が用意できる組合せ最適化

## 実装例

```python
import math
import random


def tour_length(tour, pts):
    return sum(math.dist(pts[tour[i]], pts[tour[(i + 1) % len(tour)]]) for i in range(len(tour)))


def two_opt(tour, pts):
    improved = True
    while improved:
        improved = False
        n = len(tour)
        for i in range(n - 1):
            for j in range(i + 2, n):
                if i == 0 and j == n - 1:
                    continue
                a, b = pts[tour[i]], pts[tour[i + 1]]
                c, d = pts[tour[j]], pts[tour[(j + 1) % n]]
                if math.dist(a, c) + math.dist(b, d) < math.dist(a, b) + math.dist(c, d) - 1e-12:
                    tour[i + 1:j + 1] = reversed(tour[i + 1:j + 1])
                    improved = True
    return tour


def double_bridge(tour, rng):
    n = len(tour)
    i, j, k = sorted(rng.sample(range(1, n), 3))
    return tour[:i] + tour[j:k] + tour[i:j] + tour[k:]


def iterated_local_search(pts, iterations=200, seed=0):
    rng = random.Random(seed)
    best = two_opt(list(range(len(pts))), pts)
    best_len = tour_length(best, pts)
    for _ in range(iterations):
        candidate = two_opt(double_bridge(best, rng), pts)
        length = tour_length(candidate, pts)
        if length < best_len:  # 改善のみ受理
            best, best_len = candidate, length
    return best, best_len


rng = random.Random(1)
points = [(rng.random() * 100, rng.random() * 100) for _ in range(30)]
start = two_opt(list(range(30)), points)
tour, length = iterated_local_search(points)
print(round(tour_length(start, points), 1), "->", round(length, 1))  # 2-opt だけ → ILS
```

```typescript
type P = [number, number];
const dist = (a: P, b: P): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const tourLength = (tour: number[], pts: P[]): number =>
  tour.reduce(
    (sum, v, i) => sum + dist(pts[v], pts[tour[(i + 1) % tour.length]]),
    0,
  );

function twoOpt(tour: number[], pts: P[]): number[] {
  const t = [...tour];
  const n = t.length;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const a = pts[t[i]],
          b = pts[t[i + 1]],
          c = pts[t[j]],
          d = pts[t[(j + 1) % n]];
        if (dist(a, c) + dist(b, d) < dist(a, b) + dist(c, d) - 1e-12) {
          const reversed = t.slice(i + 1, j + 1).reverse();
          t.splice(i + 1, j - i, ...reversed);
          improved = true;
        }
      }
    }
  }
  return t;
}

function doubleBridge(tour: number[], rng: () => number): number[] {
  const n = tour.length;
  const cuts = new Set<number>();
  while (cuts.size < 3) cuts.add(1 + Math.floor(rng() * (n - 1)));
  const [i, j, k] = [...cuts].sort((a, b) => a - b);
  return [
    ...tour.slice(0, i),
    ...tour.slice(j, k),
    ...tour.slice(i, j),
    ...tour.slice(k),
  ];
}

function iteratedLocalSearch(
  pts: P[],
  iterations = 200,
  seed = 0,
): { tour: number[]; length: number } {
  const rng = makeRng(seed);
  let best = twoOpt(
    pts.map((_, i) => i),
    pts,
  );
  let bestLen = tourLength(best, pts);
  for (let it = 0; it < iterations; it++) {
    const candidate = twoOpt(doubleBridge(best, rng), pts);
    const len = tourLength(candidate, pts);
    if (len < bestLen) {
      best = candidate;
      bestLen = len;
    }
  }
  return { tour: best, length: bestLen };
}

const rng = makeRng(1);
const points: P[] = Array.from({ length: 30 }, () => [
  rng() * 100,
  rng() * 100,
]);
const start = twoOpt(
  points.map((_, i) => i),
  points,
);
const result = iteratedLocalSearch(points);
console.log(
  tourLength(start, points).toFixed(1),
  "->",
  result.length.toFixed(1),
);
```
