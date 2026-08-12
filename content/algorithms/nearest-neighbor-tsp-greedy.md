---
name: 最近傍法によるTSP近似(Nearest Neighbor TSP)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n^2)
summary: 巡回セールスマン問題を「常に最も近い未訪問都市へ移動する」という単純な貪欲規則で近似する手法で、実装は容易だが最悪ケースの近似比は都市数に対して対数オーダーで悪化しうる。
---

## 概要

巡回セールスマン問題(TSP: Traveling Salesman Problem)は「全ての都市をちょうど1回ずつ訪れて出発地に戻る、最短の巡回路を求めよ」という組合せ最適化の代表格で、都市数が増えると厳密解を求めるのは計算量的に非現実的になる(NP困難)。最近傍法は、この難問に対して「今いる都市から、まだ訪れていない都市の中で最も近い都市へ移動する」という直感的な貪欲規則を、全都市を訪れ終えるまで繰り返すだけの近似アルゴリズム。実装が極めて単純で高速な反面、**局所的な近さだけを追いかけた結果、終盤に遠く離れた都市への"つけ" が回ってくる**という弱点があり、最適解からの乖離が理論的にも大きくなりうることが知られている。

## 仕組み

1. 出発都市を1つ選び、現在地とする。全都市を「未訪問」としてマークする
2. 現在地から見て、未訪問の都市の中で**最も距離が近い**都市を選び、そこへ移動する。移動先を「訪問済み」にし、現在地を更新する
3. 未訪問の都市が無くなるまで2を繰り返す
4. 最後に、出発都市へ戻って巡回路を閉じる

各ステップで「今この瞬間、最も近い都市はどこか」だけを見て決定し、将来的に巡回路全体がどうなるかは一切考慮しない、という点が典型的な貪欲法の性質を表している。

## 特性・トレードオフ

- **計算量**: 各ステップで未訪問都市から最も近いものを線形探索するとO(n)、これをn回繰り返すのでO(n²)。空間分割構造(k-d木など)を使えば平均的にはより高速化できる
- **反例(最悪ケースで近似比が悪化する構造)**: 最近傍法は「今近い都市」を優先するあまり、遠くに1つだけ孤立した都市を後回しにしがちで、最後にその都市への長距離移動と、そこから出発地への長距離の帰還が発生する。このような入力を意図的に構成すると、最近傍法が出す巡回路の長さが最適解の**Θ(log n)倍**にまで悪化することが理論的に示されている(都市数nに対して対数オーダーで近似比が崩れていく)。これは[LPT法](/algorithms/lpt-scheduling-greedy)や[First-Fit Decreasingビンパッキング](/algorithms/first-fit-decreasing-bin-packing)のような定数倍の近似保証を持つ貪欲近似アルゴリズムとは対照的で、最近傍法には**都市数に依存しない一定の近似比の保証がない**という弱点がある
- **出発都市への依存性**: 同じ都市集合でも、どの都市から出発するかによって得られる巡回路の長さが変わる。全ての都市を出発点として試し、最短のものを採用する(nスタート最近傍法)ことで改善する余地はあるが、計算量はO(n³)に増える
- **改善手法との組み合わせ**: 最近傍法単体の解の質は高くないため、実務では最近傍法で初期解を高速に作り、その後2-opt法やOr-optなどの局所探索でエッジの交換を繰り返して改善する、という2段階の使い方が一般的。より理論的な近似保証が欲しい場合は、最小全域木を利用したChristofidesのアルゴリズム(三角不等式を満たす距離であれば1.5倍以内を保証)が使われる
- **使いどころ**: 配送ルートの初期解生成、巡回セールスマン問題のベンチマークにおけるベースライン手法、リアルタイム性が求められ多少の非最適性は許容できる経路計画など。厳密な最適性が必要な小規模問題には動的計画法(ビットDP)、大規模問題には局所探索やメタヒューリスティクスと組み合わせるのが実務的

## 実装例

```python
import math


def nearest_neighbor_tsp(
    points: list[tuple[float, float]], start: int = 0
) -> list[int]:
    n = len(points)
    visited = [False] * n
    tour = [start]
    visited[start] = True
    current = start

    for _ in range(n - 1):
        nearest = -1
        nearest_dist = float("inf")
        for j in range(n):
            if visited[j]:
                continue
            dx = points[current][0] - points[j][0]
            dy = points[current][1] - points[j][1]
            dist = math.hypot(dx, dy)
            if dist < nearest_dist:
                nearest_dist = dist
                nearest = j
        tour.append(nearest)
        visited[nearest] = True
        current = nearest

    return tour


def tour_length(points: list[tuple[float, float]], tour: list[int]) -> float:
    total = 0.0
    for i in range(len(tour)):
        a = points[tour[i]]
        b = points[tour[(i + 1) % len(tour)]]
        total += math.hypot(a[0] - b[0], a[1] - b[1])
    return total
```

```typescript
type Point = [number, number];

function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function nearestNeighborTsp(points: Point[], start = 0): number[] {
  const n = points.length;
  const visited = new Array(n).fill(false);
  const tour: number[] = [start];
  visited[start] = true;
  let current = start;

  for (let step = 0; step < n - 1; step++) {
    let nearest = -1;
    let nearestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const dist = distance(points[current], points[j]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = j;
      }
    }
    tour.push(nearest);
    visited[nearest] = true;
    current = nearest;
  }

  return tour;
}

function tourLength(points: Point[], tour: number[]): number {
  let total = 0;
  for (let i = 0; i < tour.length; i++) {
    const a = points[tour[i]];
    const b = points[tour[(i + 1) % tour.length]];
    total += distance(a, b);
  }
  return total;
}
```
