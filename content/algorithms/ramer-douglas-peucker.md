---
name: ラマー・ダグラス・ポイカー法(折れ線の簡略化)
category: 計算幾何
subcategory: 分割統治・走査
complexity: 平均 O(n log n)、最悪 O(n²)
summary: 折れ線の両端を結ぶ線分から最も遠い点を探し、許容誤差を超えるならそこで二分して再帰、超えないなら間の点をすべて捨てる。形を保ったまま頂点数を減らす。
---

## 概要

GPSの軌跡、地図の海岸線、手書きのストロークは、細かい頂点が大量に並んでいる。そのまま描画・保存・送信すると重く、拡大率が小さいときは人間の目に違いも見えない。そこで「形を許容誤差の範囲で保ったまま、頂点を減らしたい」という需要が生まれる。

ラマー(1972年)とダグラス・ポイカー(1973年)が、独立にほぼ同じ方法を提案した。**折れ線の両端を直線で結び、その直線から最も遠い点を調べる**。遠い点が許容誤差 `ε` 以内なら、間の点はすべて不要。`ε` を超えるなら、その点は形を決めるうえで重要なので残し、そこで折れ線を2つに分けて同じ処理を再帰する。分割統治のかたちをしていて、考え方が直感的なのが人気の理由である。

## 仕組み

`simplify(points, ε)`:

1. 先頭の点 `A` と末尾の点 `B` を結ぶ線分を作る
2. 間にあるすべての点について、直線 `AB` への垂直距離(点と直線の距離)を計算し、最大のもの `d_max` とその点 `P` を求める
3. `d_max ≤ ε` なら、`A` と `B` だけを残して中間をすべて捨てる
4. `d_max > ε` なら、`P` を残して、`A..P` と `P..B` をそれぞれ再帰的に簡略化し、結果をつなぐ(`P` は重複しないように1回だけ入れる)

`A` と `B` が同じ位置のときは、直線ではなく `A` からの距離で代用する。

## 特性・トレードオフ

- **許容誤差の意味が明確**: 結果の折れ線は、元の折れ線から(各線分への垂直距離で)おおむね `ε` 以内に収まる。パラメータが1つで直感的
- **計算量**: 平均は2分割がバランスよく進み O(n log n)、最悪は毎回端の点が選ばれて O(n²)。凸包の考え方で O(n log n) の最悪を保証する改良もある
- **位相を保証しない**: 簡略化の結果、折れ線が自己交差したり、隣の折れ線と交わったりすることがある。地図の境界など、位相の整合が要る場面では位相を保つ改良版を使う
- **時間情報を無視する**: 点の時刻を考慮しない純粋な幾何的な誤差。軌跡の速度や滞在時間を保ちたい場合には、時間を含めた距離を使う版が必要
- **使いどころ**: 地図のタイル生成での線形地物の間引き、GPS軌跡の圧縮、手書き入力のストロークの平滑化・認識の前処理、CADの輪郭の簡略化

## 実装例

```python
from math import hypot


def perpendicular_distance(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    length = hypot(dx, dy)
    if length == 0:
        return hypot(px - ax, py - ay)
    return abs(dy * (px - ax) - dx * (py - ay)) / length


def rdp(points, epsilon):
    if len(points) < 3:
        return list(points)
    a, b = points[0], points[-1]
    dmax, index = 0.0, 0
    for i in range(1, len(points) - 1):
        d = perpendicular_distance(points[i], a, b)
        if d > dmax:
            dmax, index = d, i
    if dmax <= epsilon:
        return [a, b]
    left = rdp(points[: index + 1], epsilon)
    right = rdp(points[index:], epsilon)
    return left[:-1] + right  # 分割点の重複を除く


line = [(0, 0), (1, 0.1), (2, -0.1), (3, 5), (4, 6), (5, 7), (6, 8.1), (7, 9), (8, 9), (9, 9)]
print(rdp(line, 1.0))
```

```typescript
type Pt = [number, number];

function perpendicularDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / length;
}

function rdp(points: Pt[], epsilon: number): Pt[] {
  if (points.length < 3) return [...points];
  const a = points[0];
  const b = points[points.length - 1];
  let dmax = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], a, b);
    if (d > dmax) {
      dmax = d;
      index = i;
    }
  }
  if (dmax <= epsilon) return [a, b];
  const left = rdp(points.slice(0, index + 1), epsilon);
  const right = rdp(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

const line: Pt[] = [
  [0, 0],
  [1, 0.1],
  [2, -0.1],
  [3, 5],
  [4, 6],
  [5, 7],
  [6, 8.1],
  [7, 9],
  [8, 9],
  [9, 9],
];
console.log(rdp(line, 1.0));
```
