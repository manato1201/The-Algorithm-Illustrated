---
name: 凸包(グラハムスキャン)
category: 計算幾何
subcategory: 凸包・多角形
complexity: O(n log n)
summary: 点群を角度順にソートしてスタックで包んでいく、凸包を求める代表的手法。
---

## 概要

平面上に散らばった点の集合を、輪ゴムでぐるっと囲んだときにできる最小の凸多角形——「凸包(Convex Hull)」を求めるアルゴリズム。1972年にロナルド・グラハムが考案した。点群の"外枠"を効率よく特定するこの問題は、衝突判定・図形認識・データの外れ値検出など、応用範囲が非常に広い計算幾何の基本問題。

## 仕組み

1. 全点の中から、最もy座標が低い点(同点なら最もx座標が小さい点)を「基準点」として選ぶ
2. 残りの全ての点を、基準点から見た**角度順**にソートする
3. 角度順に点を1つずつ処理しながら、スタックに積んでいく
4. 新しい点を追加する前に、スタックの上位2点と新しい点でできる曲がり方を確認する。**もし右回り(時計回り)に曲がっていたら(=凹んでいたら)**、スタックの最上位の点を取り除く(凸包の頂点ではないと判明したため)。これを、左回りの曲がりになるまで繰り返す
5. 全ての点を処理し終えたとき、スタックに残っている点が、凸包を構成する頂点(反時計回りの順)になっている

「角度順に見ていき、内側に凹む点が現れたら容赦なく取り除く」というシンプルなスタック操作だけで、外枠だけが自然に残っていくのがこのアルゴリズムの美しさ。

## 特性・トレードオフ

- **計算量**: O(n log n)。角度順のソートが支配的で、その後のスタック処理自体はO(n)で終わる(各点は高々1回スタックに積まれ、高々1回取り除かれるため)
- **他の凸包アルゴリズムとの比較**: Jarvis march(ギフト包装法)というO(nh)(hは凸包の頂点数)のアルゴリズムもあり、凸包の頂点数が少ないと予想される場合はこちらが有利になることがある。グラハムスキャンは点の総数にのみ依存する安定した計算量が特徴
- **数値誤差への配慮**: 「右回りか左回りか」の判定は外積(クロス積)の符号で行うが、浮動小数点演算では誤差により誤判定が起きうるため、実装上は許容誤差の扱いに注意が必要
- **使いどころ**: 衝突判定の前処理(複雑な形状を凸包で近似して高速に判定)、画像処理における物体の輪郭抽出、統計データの外れ値の視覚化、地理情報システムにおける領域の外枠計算など

## 実装例

```python
import math


def cross(o: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def graham_scan(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    points = list(set(points))
    if len(points) < 3:
        return points
    start = min(points, key=lambda p: (p[1], p[0]))

    def angle_key(p: tuple[float, float]):
        dx, dy = p[0] - start[0], p[1] - start[1]
        return (math.atan2(dy, dx), dx * dx + dy * dy)

    sorted_pts = sorted([p for p in points if p != start], key=angle_key)
    stack = [start]
    for p in sorted_pts:
        while len(stack) >= 2 and cross(stack[-2], stack[-1], p) <= 0:
            stack.pop()
        stack.append(p)
    return stack
```

```typescript
type Point = [number, number];

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function grahamScan(pointsIn: Point[]): Point[] {
  const seen = new Set<string>();
  const points: Point[] = [];
  for (const p of pointsIn) {
    const key = `${p[0]},${p[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      points.push(p);
    }
  }
  if (points.length < 3) return points;

  const start = points.reduce((a, b) => (b[1] < a[1] || (b[1] === a[1] && b[0] < a[0]) ? b : a));
  const rest = points.filter((p) => p !== start);
  rest.sort((p, q) => {
    const angP = Math.atan2(p[1] - start[1], p[0] - start[0]);
    const angQ = Math.atan2(q[1] - start[1], q[0] - start[0]);
    if (angP !== angQ) return angP - angQ;
    const dp = (p[0] - start[0]) ** 2 + (p[1] - start[1]) ** 2;
    const dq = (q[0] - start[0]) ** 2 + (q[1] - start[1]) ** 2;
    return dp - dq;
  });

  const stack: Point[] = [start];
  for (const p of rest) {
    while (stack.length >= 2 && cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
      stack.pop();
    }
    stack.push(p);
  }
  return stack;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <cmath>

using Point = std::pair<double, double>;

double cross(const Point& o, const Point& a, const Point& b) {
    return (a.first - o.first) * (b.second - o.second) - (a.second - o.second) * (b.first - o.first);
}

std::vector<Point> grahamScan(std::vector<Point> points) {
    std::sort(points.begin(), points.end());
    points.erase(std::unique(points.begin(), points.end()), points.end());
    if (points.size() < 3) return points;

    Point start = *std::min_element(points.begin(), points.end(), [](const Point& a, const Point& b) {
        return a.second != b.second ? a.second < b.second : a.first < b.first;
    });

    std::vector<Point> rest;
    for (const auto& p : points) if (p != start) rest.push_back(p);

    std::sort(rest.begin(), rest.end(), [&](const Point& a, const Point& b) {
        double angA = std::atan2(a.second - start.second, a.first - start.first);
        double angB = std::atan2(b.second - start.second, b.first - start.first);
        if (angA != angB) return angA < angB;
        double da = (a.first - start.first) * (a.first - start.first) + (a.second - start.second) * (a.second - start.second);
        double db = (b.first - start.first) * (b.first - start.first) + (b.second - start.second) * (b.second - start.second);
        return da < db;
    });

    std::vector<Point> stack{start};
    for (const auto& p : rest) {
        while (stack.size() >= 2 && cross(stack[stack.size() - 2], stack.back(), p) <= 0) {
            stack.pop_back();
        }
        stack.push_back(p);
    }
    return stack;
}
```

```rust
type Point = (f64, f64);

fn cross(o: Point, a: Point, b: Point) -> f64 {
    (a.0 - o.0) * (b.1 - o.1) - (a.1 - o.1) * (b.0 - o.0)
}

fn graham_scan(points_in: &[Point]) -> Vec<Point> {
    let mut points: Vec<Point> = Vec::new();
    for &p in points_in {
        if !points.contains(&p) {
            points.push(p);
        }
    }
    if points.len() < 3 {
        return points;
    }

    let start = *points
        .iter()
        .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap().then(a.0.partial_cmp(&b.0).unwrap()))
        .unwrap();

    let mut rest: Vec<Point> = points.into_iter().filter(|&p| p != start).collect();
    rest.sort_by(|a, b| {
        let ang_a = (a.1 - start.1).atan2(a.0 - start.0);
        let ang_b = (b.1 - start.1).atan2(b.0 - start.0);
        ang_a.partial_cmp(&ang_b).unwrap().then_with(|| {
            let da = (a.0 - start.0).powi(2) + (a.1 - start.1).powi(2);
            let db = (b.0 - start.0).powi(2) + (b.1 - start.1).powi(2);
            da.partial_cmp(&db).unwrap()
        })
    });

    let mut stack: Vec<Point> = vec![start];
    for p in rest {
        while stack.len() >= 2 && cross(stack[stack.len() - 2], stack[stack.len() - 1], p) <= 0.0 {
            stack.pop();
        }
        stack.push(p);
    }
    stack
}
```

```csharp
record Point(double X, double Y);

static double Cross(Point o, Point a, Point b) =>
    (a.X - o.X) * (b.Y - o.Y) - (a.Y - o.Y) * (b.X - o.X);

static List<Point> GrahamScan(List<Point> pointsIn)
{
    var points = pointsIn.Distinct().ToList();
    if (points.Count < 3) return points;

    var start = points.OrderBy(p => p.Y).ThenBy(p => p.X).First();
    var rest = points.Where(p => p != start)
        .OrderBy(p => Math.Atan2(p.Y - start.Y, p.X - start.X))
        .ThenBy(p => (p.X - start.X) * (p.X - start.X) + (p.Y - start.Y) * (p.Y - start.Y))
        .ToList();

    var stack = new List<Point> { start };
    foreach (var p in rest)
    {
        while (stack.Count >= 2 && Cross(stack[^2], stack[^1], p) <= 0)
            stack.RemoveAt(stack.Count - 1);
        stack.Add(p);
    }
    return stack;
}
```
