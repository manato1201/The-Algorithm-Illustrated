---
name: 多角形の三角形分割(耳切り法)
category: 計算幾何
subcategory: 三角形分割・分割図
complexity: O(n²)(素朴な耳切り法)、O(n log n)(平面走査を使う高度な手法)
summary: 単純多角形を「耳(隣接2辺が凸で、内部に他の頂点を含まない三角形)」を1つずつ切り落としていくことで、n-2個の三角形に分解する古典的なアルゴリズム。
---

## 概要

任意の単純多角形(自己交差のない多角形)は、必ずn-2個の三角形に分割できることが幾何学的に知られている(多角形の三角形分割定理)。この分割は、コンピュータグラフィックスでの描画(GPUは三角形しか直接扱えない)や面積計算、衝突判定など、様々な場面で必要になる基礎的な前処理である。耳切り法(Ear Clipping)は、この分割を求める最も直感的なアルゴリズムで、「耳」——隣接する2辺が作る三角形が凸であり、かつその三角形の内部に他のどの頂点も含まれない頂点——を1つずつ見つけて切り落としていく、という単純な繰り返しで多角形全体を三角形に分解する。

## 仕組み

1. 多角形の各頂点`v`について、その頂点と両隣の頂点が作る三角形が「耳」の条件を満たすかを判定する: (a) 頂点`v`における内角が180度未満(凸である)こと、(b) その三角形の内部に多角形の他の頂点が1つも含まれないこと
2. 耳の条件を満たす頂点(耳の頂点)が必ず少なくとも2つ存在することが「2つの耳の定理(Two Ears Theorem)」として証明されている——単純多角形であればアルゴリズムが行き詰まることはない
3. 見つけた耳の頂点をリストから取り除き、その頂点を作っていた三角形を1つの分割結果として記録する。取り除かれた頂点の両隣が新たに隣接する頂点同士になる
4. 残った頂点数が3になるまで手順1〜3を繰り返す。最後に残った3頂点がそのまま最後の三角形になる
5. 最終的にn-2個の三角形が得られる

## 特性・トレードオフ

- **計算量**: 各ステップで耳の判定に`O(n)`(多角形の全頂点との内包判定)かかり、これをn-2回(1つの耳を切るごとに頂点が1つ減る)繰り返すため素朴な実装で`O(n²)`。平面走査法や[Delaunay三角形分割](/algorithms/delaunay-triangulation)ベースの高度な手法を使えば`O(n log n)`まで改善できるが、実装の複雑さが大きく増す
- **凹多角形にも対応できる汎用性**: [凸包](/algorithms/graham-scan)を求めるアルゴリズムと異なり、耳切り法は凹んだ部分を持つ任意の単純多角形(星型や複雑な輪郭)にも直接適用できる——「凸な部分から順に切り落としていく」という発想が凹凸を問わず機能する理由になっている
- **穴を持つ多角形への拡張**: 内部に穴(別の多角形の輪郭)を持つ多角形を三角形分割したい場合、穴の輪郭を外側の輪郭に橋渡しする辺を1本導入して単一の単純多角形に変換してから耳切り法を適用する、という前処理が必要になる
- **使いどころ**: コンピュータグラフィックスにおける多角形メッシュのGPU描画用三角形分解、地理情報システム(GIS)における多角形領域の面積計算・点群処理、ゲーム開発におけるナビゲーションメッシュの生成、[Delaunay三角形分割](/algorithms/delaunay-triangulation)が不要な単純な用途での軽量な代替手法

## 実装例

```python
def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def is_convex(prev, cur, nxt):
    return cross(prev, cur, nxt) > 0  # CCW前提: 外積が正なら凸


def point_in_triangle(p, a, b, c):
    d1, d2, d3 = cross(a, b, p), cross(b, c, p), cross(c, a, p)
    has_neg = d1 < 0 or d2 < 0 or d3 < 0
    has_pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (has_neg and has_pos)


def signed_area(poly):
    n = len(poly)
    s = 0.0
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return s / 2


def ear_clip(polygon: list[tuple[float, float]]) -> list[tuple[tuple, tuple, tuple]]:
    poly = polygon[:]
    if signed_area(poly) < 0:
        poly.reverse()  # 反時計回り(CCW)に統一する

    indices = list(range(len(poly)))
    triangles = []

    while len(indices) > 3:
        ear_found = False
        n = len(indices)
        for k in range(n):
            i_prev, i_cur, i_next = indices[(k - 1) % n], indices[k], indices[(k + 1) % n]
            a, b, c = poly[i_prev], poly[i_cur], poly[i_next]
            if not is_convex(a, b, c):
                continue
            # 三角形(a, b, c)の内部に他の頂点が含まれていれば耳ではない
            if any(
                idx not in (i_prev, i_cur, i_next) and point_in_triangle(poly[idx], a, b, c)
                for idx in indices
            ):
                continue
            triangles.append((a, b, c))
            indices.pop(k)
            ear_found = True
            break
        if not ear_found:
            raise RuntimeError("no ear found; polygon may be invalid")

    a, b, c = poly[indices[0]], poly[indices[1]], poly[indices[2]]
    triangles.append((a, b, c))
    return triangles
```

```typescript
type Pt = [number, number];

function cross(o: Pt, a: Pt, b: Pt): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function isConvex(prev: Pt, cur: Pt, next: Pt): boolean {
  return cross(prev, cur, next) > 0;
}

function pointInTriangle(p: Pt, a: Pt, b: Pt, c: Pt): boolean {
  const d1 = cross(a, b, p);
  const d2 = cross(b, c, p);
  const d3 = cross(c, a, p);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function signedArea(poly: Pt[]): number {
  const n = poly.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % n];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function earClip(polygon: Pt[]): [Pt, Pt, Pt][] {
  const poly = [...polygon];
  if (signedArea(poly) < 0) poly.reverse();

  let indices = poly.map((_, i) => i);
  const triangles: [Pt, Pt, Pt][] = [];

  while (indices.length > 3) {
    let earFound = false;
    const n = indices.length;
    for (let k = 0; k < n; k++) {
      const iPrev = indices[(k - 1 + n) % n];
      const iCur = indices[k];
      const iNext = indices[(k + 1) % n];
      const a = poly[iPrev], b = poly[iCur], c = poly[iNext];
      if (!isConvex(a, b, c)) continue;
      const hasPointInside = indices.some(
        (idx) => idx !== iPrev && idx !== iCur && idx !== iNext && pointInTriangle(poly[idx], a, b, c)
      );
      if (hasPointInside) continue;
      triangles.push([a, b, c]);
      indices = indices.filter((_, idx2) => idx2 !== k);
      earFound = true;
      break;
    }
    if (!earFound) throw new Error("no ear found; polygon may be invalid");
  }

  triangles.push([poly[indices[0]], poly[indices[1]], poly[indices[2]]]);
  return triangles;
}
```

```cpp
#include <vector>
#include <tuple>
#include <stdexcept>
#include <algorithm>

using Pt = std::pair<double, double>;

double cross(Pt o, Pt a, Pt b) {
    return (a.first - o.first) * (b.second - o.second) - (a.second - o.second) * (b.first - o.first);
}

bool isConvex(Pt prev, Pt cur, Pt next) {
    return cross(prev, cur, next) > 0;
}

bool pointInTriangle(Pt p, Pt a, Pt b, Pt c) {
    double d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p);
    bool hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    bool hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
}

double signedArea(const std::vector<Pt>& poly) {
    int n = static_cast<int>(poly.size());
    double s = 0;
    for (int i = 0; i < n; i++) {
        auto [x1, y1] = poly[i];
        auto [x2, y2] = poly[(i + 1) % n];
        s += x1 * y2 - x2 * y1;
    }
    return s / 2;
}

std::vector<std::tuple<Pt, Pt, Pt>> earClip(std::vector<Pt> polygon) {
    if (signedArea(polygon) < 0) std::reverse(polygon.begin(), polygon.end());

    std::vector<int> indices(polygon.size());
    for (size_t i = 0; i < indices.size(); i++) indices[i] = static_cast<int>(i);
    std::vector<std::tuple<Pt, Pt, Pt>> triangles;

    while (indices.size() > 3) {
        bool earFound = false;
        int n = static_cast<int>(indices.size());
        for (int k = 0; k < n; k++) {
            int iPrev = indices[(k - 1 + n) % n];
            int iCur = indices[k];
            int iNext = indices[(k + 1) % n];
            Pt a = polygon[iPrev], b = polygon[iCur], c = polygon[iNext];
            if (!isConvex(a, b, c)) continue;
            bool hasPointInside = false;
            for (int idx : indices) {
                if (idx == iPrev || idx == iCur || idx == iNext) continue;
                if (pointInTriangle(polygon[idx], a, b, c)) { hasPointInside = true; break; }
            }
            if (hasPointInside) continue;
            triangles.emplace_back(a, b, c);
            indices.erase(indices.begin() + k);
            earFound = true;
            break;
        }
        if (!earFound) throw std::runtime_error("no ear found; polygon may be invalid");
    }
    triangles.emplace_back(polygon[indices[0]], polygon[indices[1]], polygon[indices[2]]);
    return triangles;
}
```

```rust
type Pt = (f64, f64);

fn cross(o: Pt, a: Pt, b: Pt) -> f64 {
    (a.0 - o.0) * (b.1 - o.1) - (a.1 - o.1) * (b.0 - o.0)
}

fn is_convex(prev: Pt, cur: Pt, next: Pt) -> bool {
    cross(prev, cur, next) > 0.0
}

fn point_in_triangle(p: Pt, a: Pt, b: Pt, c: Pt) -> bool {
    let (d1, d2, d3) = (cross(a, b, p), cross(b, c, p), cross(c, a, p));
    let has_neg = d1 < 0.0 || d2 < 0.0 || d3 < 0.0;
    let has_pos = d1 > 0.0 || d2 > 0.0 || d3 > 0.0;
    !(has_neg && has_pos)
}

fn signed_area(poly: &[Pt]) -> f64 {
    let n = poly.len();
    let mut s = 0.0;
    for i in 0..n {
        let (x1, y1) = poly[i];
        let (x2, y2) = poly[(i + 1) % n];
        s += x1 * y2 - x2 * y1;
    }
    s / 2.0
}

fn ear_clip(polygon: &[Pt]) -> Vec<(Pt, Pt, Pt)> {
    let mut poly = polygon.to_vec();
    if signed_area(&poly) < 0.0 {
        poly.reverse();
    }

    let mut indices: Vec<usize> = (0..poly.len()).collect();
    let mut triangles = Vec::new();

    while indices.len() > 3 {
        let mut ear_found = false;
        let n = indices.len();
        for k in 0..n {
            let i_prev = indices[(k + n - 1) % n];
            let i_cur = indices[k];
            let i_next = indices[(k + 1) % n];
            let (a, b, c) = (poly[i_prev], poly[i_cur], poly[i_next]);
            if !is_convex(a, b, c) {
                continue;
            }
            let has_point_inside = indices.iter().any(|&idx| {
                idx != i_prev && idx != i_cur && idx != i_next && point_in_triangle(poly[idx], a, b, c)
            });
            if has_point_inside {
                continue;
            }
            triangles.push((a, b, c));
            indices.remove(k);
            ear_found = true;
            break;
        }
        if !ear_found {
            panic!("no ear found; polygon may be invalid");
        }
    }
    triangles.push((poly[indices[0]], poly[indices[1]], poly[indices[2]]));
    triangles
}
```

```csharp
static double Cross((double x, double y) o, (double x, double y) a, (double x, double y) b) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

static bool IsConvex((double x, double y) prev, (double x, double y) cur, (double x, double y) next) =>
    Cross(prev, cur, next) > 0;

static bool PointInTriangle((double x, double y) p, (double x, double y) a, (double x, double y) b, (double x, double y) c)
{
    double d1 = Cross(a, b, p), d2 = Cross(b, c, p), d3 = Cross(c, a, p);
    bool hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    bool hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
}

static double SignedArea(List<(double x, double y)> poly)
{
    int n = poly.Count;
    double s = 0;
    for (int i = 0; i < n; i++)
    {
        var (x1, y1) = poly[i];
        var (x2, y2) = poly[(i + 1) % n];
        s += x1 * y2 - x2 * y1;
    }
    return s / 2;
}

static List<((double, double), (double, double), (double, double))> EarClip(List<(double x, double y)> polygon)
{
    var poly = new List<(double x, double y)>(polygon);
    if (SignedArea(poly) < 0) poly.Reverse();

    var indices = Enumerable.Range(0, poly.Count).ToList();
    var triangles = new List<((double, double), (double, double), (double, double))>();

    while (indices.Count > 3)
    {
        bool earFound = false;
        int n = indices.Count;
        for (int k = 0; k < n; k++)
        {
            int iPrev = indices[(k - 1 + n) % n];
            int iCur = indices[k];
            int iNext = indices[(k + 1) % n];
            var a = poly[iPrev]; var b = poly[iCur]; var c = poly[iNext];
            if (!IsConvex(a, b, c)) continue;
            bool hasPointInside = indices.Any(idx =>
                idx != iPrev && idx != iCur && idx != iNext && PointInTriangle(poly[idx], a, b, c));
            if (hasPointInside) continue;
            triangles.Add((a, b, c));
            indices.RemoveAt(k);
            earFound = true;
            break;
        }
        if (!earFound) throw new Exception("no ear found; polygon may be invalid");
    }
    triangles.Add((poly[indices[0]], poly[indices[1]], poly[indices[2]]));
    return triangles;
}
```
