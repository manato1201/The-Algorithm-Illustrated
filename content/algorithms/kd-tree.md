---
name: kd木
category: データ構造
subcategory: 空間分割構造
complexity: O(log n)(平衡時)
summary: 多次元空間を軸ごとに分割する木構造。最近傍探索や範囲検索に使う。
---

## 概要

二分探索木の「1次元の値で左右に分ける」という発想を、**2次元・3次元、あるいはそれ以上の多次元空間**に拡張した木構造(kはdimension=次元数を表す)。「ある地点に最も近い点はどれか(最近傍探索)」「ある矩形範囲に含まれる点は何個あるか(範囲検索)」といった、地理情報システムや機械学習で頻出するクエリを高速に処理する。

## 仕組み

1. 木の各階層ごとに、分割に使う**軸(次元)を切り替えながら**空間を分割していく(2次元なら「x軸で分割→y軸で分割→x軸で分割→...」を繰り返す)
2. ある階層で、その軸における中央値の点を選び、それより小さい点を左の子、大きい点を右の子に振り分ける
3. これを再帰的に繰り返すと、木全体が完成した時点で、空間全体が長方形(あるいは超直方体)の領域に分割されている
4. **最近傍探索**では、木を降りながら候補点を絞り込み、「今見つかっている最良の候補より、反対側の領域に近い点が存在しうるか」を分割境界との距離で判定し、可能性がなければその部分木を刈り取る(枝刈り)
5. **範囲検索**も同様に、分割領域とクエリ範囲の重なりを見ながら、探索する価値のない部分木を刈り取っていく

「軸を交互に切り替えながら分割する」ことで、多次元空間の情報を1本の木構造の中に落とし込んでいるのが本質。

## 特性・トレードオフ

- **計算量**: 木が平衡していればO(log n)。ただし**次元数が増えると、枝刈りの効果が薄れて性能が劣化する(次元の呪い)**——おおよそ次元数が10〜20を超えると、力任せの全探索とあまり変わらなくなることが知られている
- **静的データ向き**: 中央値をもとに構築するため、動的な挿入・削除には向いておらず、データが決まってから一括構築して使う用途が中心
- **他の空間分割構造との比較**: 2次元に特化した四分木、より高次元での近似最近傍探索に強いLSH(局所性鋭敏型ハッシュ)など、次元数やデータの性質に応じて使い分けられる
- **使いどころ**: 地理情報システム(GIS)における近隣施設検索、機械学習のk近傍法(k-NN)の高速化、コンピュータグラフィックスにおける衝突判定・レイトレーシング、点群データの処理など

## 実装例

```python
class KdNode:
    __slots__ = ("point", "left", "right", "axis")

    def __init__(self, point, left, right, axis):
        self.point = point
        self.left = left
        self.right = right
        self.axis = axis


def build(points: list[tuple[float, float]], depth: int = 0) -> KdNode | None:
    if not points:
        return None
    axis = depth % 2
    points = sorted(points, key=lambda p: p[axis])
    mid = len(points) // 2
    return KdNode(
        points[mid],
        build(points[:mid], depth + 1),
        build(points[mid + 1:], depth + 1),
        axis,
    )


def _sq_dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def nearest(root: KdNode | None, target: tuple[float, float]):
    best = [None, float("inf")]

    def visit(node: KdNode | None) -> None:
        if node is None:
            return
        d = _sq_dist(node.point, target)
        if d < best[1]:
            best[0], best[1] = node.point, d
        axis = node.axis
        diff = target[axis] - node.point[axis]
        near, far = (node.left, node.right) if diff < 0 else (node.right, node.left)
        visit(near)
        # 分割境界までの距離の2乗が現在の最良距離より小さい場合のみ反対側を探索する(枝刈り)
        if diff * diff < best[1]:
            visit(far)

    visit(root)
    return best[0], best[1]
```

```typescript
type Point = [number, number];

interface KdNode {
  point: Point;
  left: KdNode | null;
  right: KdNode | null;
  axis: number;
}

function build(points: Point[], depth = 0): KdNode | null {
  if (points.length === 0) return null;
  const axis = depth % 2;
  const sorted = [...points].sort((a, b) => a[axis] - b[axis]);
  const mid = Math.floor(sorted.length / 2);
  return {
    point: sorted[mid],
    left: build(sorted.slice(0, mid), depth + 1),
    right: build(sorted.slice(mid + 1), depth + 1),
    axis,
  };
}

function sqDist(a: Point, b: Point): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function nearest(root: KdNode | null, target: Point): [Point | null, number] {
  let bestPoint: Point | null = null;
  let bestDist = Infinity;

  function visit(node: KdNode | null): void {
    if (node === null) return;
    const d = sqDist(node.point, target);
    if (d < bestDist) {
      bestPoint = node.point;
      bestDist = d;
    }
    const axis = node.axis;
    const diff = target[axis] - node.point[axis];
    const [near, far] = diff < 0 ? [node.left, node.right] : [node.right, node.left];
    visit(near);
    if (diff * diff < bestDist) visit(far);
  }

  visit(root);
  return [bestPoint, bestDist];
}
```

```cpp
#include <vector>
#include <array>
#include <algorithm>
#include <limits>
#include <memory>

using Point = std::array<double, 2>;

struct KdNode {
    Point point;
    std::unique_ptr<KdNode> left;
    std::unique_ptr<KdNode> right;
    int axis;
};

std::unique_ptr<KdNode> build(std::vector<Point> points, int depth = 0) {
    if (points.empty()) return nullptr;
    int axis = depth % 2;
    std::sort(points.begin(), points.end(),
              [axis](const Point& a, const Point& b) { return a[axis] < b[axis]; });
    size_t mid = points.size() / 2;
    auto node = std::make_unique<KdNode>();
    node->point = points[mid];
    node->axis = axis;
    node->left = build(std::vector<Point>(points.begin(), points.begin() + mid), depth + 1);
    node->right = build(std::vector<Point>(points.begin() + mid + 1, points.end()), depth + 1);
    return node;
}

double sqDist(const Point& a, const Point& b) {
    double dx = a[0] - b[0], dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

void visit(const KdNode* node, const Point& target, Point& bestPoint, double& bestDist) {
    if (node == nullptr) return;
    double d = sqDist(node->point, target);
    if (d < bestDist) {
        bestPoint = node->point;
        bestDist = d;
    }
    int axis = node->axis;
    double diff = target[axis] - node->point[axis];
    const KdNode* near = diff < 0 ? node->left.get() : node->right.get();
    const KdNode* far = diff < 0 ? node->right.get() : node->left.get();
    visit(near, target, bestPoint, bestDist);
    // 分割境界までの距離の2乗が現在の最良距離より小さい場合のみ反対側を探索する(枝刈り)
    if (diff * diff < bestDist) visit(far, target, bestPoint, bestDist);
}

std::pair<Point, double> nearest(const KdNode* root, const Point& target) {
    Point bestPoint{};
    double bestDist = std::numeric_limits<double>::infinity();
    visit(root, target, bestPoint, bestDist);
    return {bestPoint, bestDist};
}
```

```rust
#[derive(Clone, Copy, Debug)]
struct Point(f64, f64);

struct KdNode {
    point: Point,
    left: Option<Box<KdNode>>,
    right: Option<Box<KdNode>>,
    axis: usize,
}

fn coord(p: &Point, axis: usize) -> f64 {
    if axis == 0 { p.0 } else { p.1 }
}

fn build(mut points: Vec<Point>, depth: usize) -> Option<Box<KdNode>> {
    if points.is_empty() {
        return None;
    }
    let axis = depth % 2;
    points.sort_by(|a, b| coord(a, axis).partial_cmp(&coord(b, axis)).unwrap());
    let mid = points.len() / 2;
    let right_points = points.split_off(mid + 1);
    let mid_point = points.pop().unwrap();
    let left_points = points;
    Some(Box::new(KdNode {
        point: mid_point,
        left: build(left_points, depth + 1),
        right: build(right_points, depth + 1),
        axis,
    }))
}

fn sq_dist(a: &Point, b: &Point) -> f64 {
    (a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)
}

fn visit(node: &Option<Box<KdNode>>, target: &Point, best_point: &mut Option<Point>, best_dist: &mut f64) {
    let node = match node {
        Some(n) => n,
        None => return,
    };
    let d = sq_dist(&node.point, target);
    if d < *best_dist {
        *best_point = Some(node.point);
        *best_dist = d;
    }
    let axis = node.axis;
    let diff = coord(target, axis) - coord(&node.point, axis);
    let (near, far) = if diff < 0.0 { (&node.left, &node.right) } else { (&node.right, &node.left) };
    visit(near, target, best_point, best_dist);
    // 分割境界までの距離の2乗が現在の最良距離より小さい場合のみ反対側を探索する(枝刈り)
    if diff * diff < *best_dist {
        visit(far, target, best_point, best_dist);
    }
}

fn nearest(root: &Option<Box<KdNode>>, target: &Point) -> (Option<Point>, f64) {
    let mut best_point = None;
    let mut best_dist = f64::INFINITY;
    visit(root, target, &mut best_point, &mut best_dist);
    (best_point, best_dist)
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

record Point(double X, double Y);

class KdNode
{
    public Point Point = null!;
    public KdNode? Left;
    public KdNode? Right;
    public int Axis;
}

static class KdTree
{
    static double Coord(Point p, int axis) => axis == 0 ? p.X : p.Y;

    public static KdNode? Build(List<Point> points, int depth = 0)
    {
        if (points.Count == 0) return null;
        int axis = depth % 2;
        var sorted = points.OrderBy(p => Coord(p, axis)).ToList();
        int mid = sorted.Count / 2;
        return new KdNode
        {
            Point = sorted[mid],
            Axis = axis,
            Left = Build(sorted.GetRange(0, mid), depth + 1),
            Right = Build(sorted.GetRange(mid + 1, sorted.Count - mid - 1), depth + 1),
        };
    }

    static double SqDist(Point a, Point b) => (a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y);

    static void Visit(KdNode? node, Point target, ref Point? bestPoint, ref double bestDist)
    {
        if (node == null) return;
        double d = SqDist(node.Point, target);
        if (d < bestDist)
        {
            bestPoint = node.Point;
            bestDist = d;
        }
        int axis = node.Axis;
        double diff = Coord(target, axis) - Coord(node.Point, axis);
        var (near, far) = diff < 0 ? (node.Left, node.Right) : (node.Right, node.Left);
        Visit(near, target, ref bestPoint, ref bestDist);
        // 分割境界までの距離の2乗が現在の最良距離より小さい場合のみ反対側を探索する(枝刈り)
        if (diff * diff < bestDist) Visit(far, target, ref bestPoint, ref bestDist);
    }

    public static (Point?, double) Nearest(KdNode? root, Point target)
    {
        Point? bestPoint = null;
        double bestDist = double.PositiveInfinity;
        Visit(root, target, ref bestPoint, ref bestDist);
        return (bestPoint, bestDist);
    }
}
```
