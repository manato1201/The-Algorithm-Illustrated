---
name: ジャービスの行進法(Gift Wrapping)
category: 計算幾何
subcategory: 凸包・多角形
complexity: O(nh)(nは点数、hは凸包上の頂点数)
summary: 最も左の点から出発し、常に「残りの全ての点が右手側に見える」ような次の点を選んで包み込むように進む、直感的で実装が単純な凸包構築アルゴリズム。
---

## 概要

[グラハムスキャン](/algorithms/graham-scan)が全点を偏角でソートしてから走査するのに対し、ジャービスの行進法(ギフトラッピング法とも呼ばれる)は、プレゼントを包装紙で包んでいくような直感的な発想を取る——最も左(または最も下)にある点を確実に凸包の頂点として選び、そこから「残りの全ての点が進行方向の右手側(または左手側)に見える」ような次の点を選んで進む、という操作を出発点に戻るまで繰り返すだけで凸包が完成する。ソートを一切必要とせず、各ステップが幾何学的に非常に直感的であるため、凸包アルゴリズムの入門として真っ先に紹介されることが多い古典的な手法である。

## 仕組み

1. 全点の中から最もx座標が小さい点(同点なら最もy座標が小さい点)を選び、凸包の始点とする——この点は必ず凸包の頂点になることが保証されている(それより左にある点が存在しないため)
2. 現在の頂点から、他の全ての点を候補として調べ、「現在の頂点から候補点へ向かう方向が、他のどの点よりも時計回りに最も外側(または反時計回りに最も外側)になる」点を次の頂点として選ぶ——これは各候補についてクロス積(外積)の符号を調べることで判定できる
3. 選ばれた点を凸包の頂点として確定し、そこを新しい現在の頂点として手順2を繰り返す
4. 始点に戻ってきたら凸包が完成する

## 特性・トレードオフ

- **計算量**: 各頂点を確定するのに残り全点(`O(n)`)を調べる必要があり、これを凸包の頂点数`h`回繰り返すため`O(nh)`。凸包の頂点数が少ない(`h`が`n`に対して小さい)場合は[グラハムスキャン](/algorithms/graham-scan)の`O(n log n)`より高速になりうるが、最悪ケース(全点が凸包上にある、`h=n`)では`O(n²)`まで悪化する
- **出力サイズに依存する計算量(output-sensitive)という特徴**: 計算量が入力点数`n`だけでなく出力(凸包の頂点数`h`)にも依存する「出力サイズ依存アルゴリズム」の代表例——多くの点が凸包の内側に密集している実データでは、この特性が実用上の強みになる
- **実装の単純さ**: ソートや複雑なデータ構造を必要とせず、クロス積の符号判定だけで実装できるため、教育目的やプロトタイピングに適している。ただし実用上の速度を求める場面では[グラハムスキャン](/algorithms/graham-scan)や[クイックハル](/algorithms/quickhull)がより高速な選択肢になる
- **使いどころ**: 凸包構築アルゴリズムの入門教材、点数が少なく凸包の頂点数も少ないことが分かっている場面、[回転するキャリパー法](/algorithms/rotating-calipers)などの後続処理の前段としての凸包計算

## 実装例

```python
def cross(o: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def jarvis_march(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    n = len(points)
    if n < 3:
        return list(points)
    start = min(range(n), key=lambda i: (points[i][0], points[i][1]))
    hull = []
    current = start
    while True:
        hull.append(points[current])
        candidate = (current + 1) % n
        for i in range(n):
            if i == current:
                continue
            c = cross(points[current], points[candidate], points[i])
            if c < 0:  # iのほうがより時計回りの外側にある候補
                candidate = i
            elif c == 0:  # 共線の場合は遠い方を選ぶ
                d_candidate = (points[candidate][0] - points[current][0]) ** 2 + (points[candidate][1] - points[current][1]) ** 2
                d_i = (points[i][0] - points[current][0]) ** 2 + (points[i][1] - points[current][1]) ** 2
                if d_i > d_candidate:
                    candidate = i
        current = candidate
        if current == start:
            break
    return hull
```

```typescript
type Point = [number, number];

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function jarvisMarch(points: Point[]): Point[] {
  const n = points.length;
  if (n < 3) return [...points];
  let start = 0;
  for (let i = 1; i < n; i++) {
    if (
      points[i][0] < points[start][0] ||
      (points[i][0] === points[start][0] && points[i][1] < points[start][1])
    ) {
      start = i;
    }
  }
  const hull: Point[] = [];
  let current = start;
  do {
    hull.push(points[current]);
    let candidate = (current + 1) % n;
    for (let i = 0; i < n; i++) {
      if (i === current) continue;
      const c = cross(points[current], points[candidate], points[i]);
      if (c < 0) {
        candidate = i;
      } else if (c === 0) {
        const dCandidate =
          (points[candidate][0] - points[current][0]) ** 2 +
          (points[candidate][1] - points[current][1]) ** 2;
        const dI =
          (points[i][0] - points[current][0]) ** 2 +
          (points[i][1] - points[current][1]) ** 2;
        if (dI > dCandidate) candidate = i;
      }
    }
    current = candidate;
  } while (current !== start);
  return hull;
}
```

```cpp
#include <vector>
#include <utility>
#include <cmath>

using Point = std::pair<double, double>;

double cross(const Point& o, const Point& a, const Point& b) {
    return (a.first - o.first) * (b.second - o.second) - (a.second - o.second) * (b.first - o.first);
}

std::vector<Point> jarvisMarch(const std::vector<Point>& points) {
    int n = static_cast<int>(points.size());
    if (n < 3) return points;
    int start = 0;
    for (int i = 1; i < n; i++) {
        if (points[i] < points[start]) start = i;
    }
    std::vector<Point> hull;
    int current = start;
    do {
        hull.push_back(points[current]);
        int candidate = (current + 1) % n;
        for (int i = 0; i < n; i++) {
            if (i == current) continue;
            double c = cross(points[current], points[candidate], points[i]);
            if (c < 0) {
                candidate = i;
            } else if (c == 0) {
                double dCandidate = std::pow(points[candidate].first - points[current].first, 2) +
                                     std::pow(points[candidate].second - points[current].second, 2);
                double dI = std::pow(points[i].first - points[current].first, 2) +
                            std::pow(points[i].second - points[current].second, 2);
                if (dI > dCandidate) candidate = i;
            }
        }
        current = candidate;
    } while (current != start);
    return hull;
}
```

```rust
type Point = (f64, f64);

fn cross(o: Point, a: Point, b: Point) -> f64 {
    (a.0 - o.0) * (b.1 - o.1) - (a.1 - o.1) * (b.0 - o.0)
}

fn jarvis_march(points: &[Point]) -> Vec<Point> {
    let n = points.len();
    if n < 3 {
        return points.to_vec();
    }
    let mut start = 0;
    for i in 1..n {
        if points[i] < points[start] {
            start = i;
        }
    }
    let mut hull = Vec::new();
    let mut current = start;
    loop {
        hull.push(points[current]);
        let mut candidate = (current + 1) % n;
        for i in 0..n {
            if i == current {
                continue;
            }
            let c = cross(points[current], points[candidate], points[i]);
            if c < 0.0 {
                candidate = i;
            } else if c == 0.0 {
                let d_candidate = (points[candidate].0 - points[current].0).powi(2)
                    + (points[candidate].1 - points[current].1).powi(2);
                let d_i = (points[i].0 - points[current].0).powi(2) + (points[i].1 - points[current].1).powi(2);
                if d_i > d_candidate {
                    candidate = i;
                }
            }
        }
        current = candidate;
        if current == start {
            break;
        }
    }
    hull
}
```

```csharp
static double Cross((double x, double y) o, (double x, double y) a, (double x, double y) b)
    => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

static List<(double x, double y)> JarvisMarch(List<(double x, double y)> points)
{
    int n = points.Count;
    if (n < 3) return new List<(double, double)>(points);
    int start = 0;
    for (int i = 1; i < n; i++)
    {
        if (points[i].x < points[start].x || (points[i].x == points[start].x && points[i].y < points[start].y))
            start = i;
    }
    var hull = new List<(double, double)>();
    int current = start;
    do
    {
        hull.Add(points[current]);
        int candidate = (current + 1) % n;
        for (int i = 0; i < n; i++)
        {
            if (i == current) continue;
            double c = Cross(points[current], points[candidate], points[i]);
            if (c < 0) candidate = i;
            else if (c == 0)
            {
                double dCandidate = Math.Pow(points[candidate].x - points[current].x, 2) + Math.Pow(points[candidate].y - points[current].y, 2);
                double dI = Math.Pow(points[i].x - points[current].x, 2) + Math.Pow(points[i].y - points[current].y, 2);
                if (dI > dCandidate) candidate = i;
            }
        }
        current = candidate;
    } while (current != start);
    return hull;
}
```
