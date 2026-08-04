---
name: 線分交差判定(走査線法)
category: 計算幾何
subcategory: 分割統治・走査
complexity: O(n log n)
summary: 平面を掃くように処理することで、素朴なO(n²)の全探索を避ける計算幾何の基本テクニック。
---

## 概要

n本の線分の集合から、交差しているペアを全て見つけたい場合、素朴に全ペアを総当たりで調べるとO(n²)かかる。走査線法(Sweep Line Algorithm)は、**縦線を左から右へ"掃いて"いく**という発想で、実際に交差する可能性のある線分同士だけに比較対象を絞り込み、O(n log n)まで高速化する、計算幾何における最も重要な設計テクニックのひとつ。

## 仕組み

1. 全ての線分の始点・終点を、x座標の順にイベントとして並べる
2. 仮想的な縦線(走査線)を左から右へ動かしていくと想定し、各イベント(線分の始点・終点)ごとに処理を行う
3. **線分の始点に到達したら**、その線分を「現在、走査線と交差している線分の集合」に追加する。この集合は、走査線とのy座標順に並べられた平衡二分探索木などで管理する
4. 追加された線分の、**y座標順で隣接する線分同士**だけを、実際に交差しているか確認する(隣接していない線分同士は、走査線上で間に別の線分があるため、この時点で交差していないと言える)
5. **線分の終点に到達したら**、その線分を集合から取り除き、取り除いたことで新たに隣接した線分同士を確認する

「今、走査線と交差している線分たちの中で、上下に隣接する線分同士だけをチェックすればよい」という洞察により、確認すべきペアの数を大幅に絞り込めるのが高速化の核心。

## 特性・トレードオフ

- **計算量**: O((n + k) log n)(kは実際の交差数)。全ペア比較のO(n²)に比べ、交差が少ない典型的な入力では劇的に高速
- **多くの計算幾何問題の基礎になる設計パターン**: 走査線法は線分交差判定だけでなく、矩形の合併面積の計算、最近点対問題の別解法、多角形の内部判定など、計算幾何の非常に広い範囲の問題に応用される汎用的な発想
- **イベント駆動的な処理**: 「空間を掃く」という連続的な操作を、「離散的なイベント(始点・終点)の集合」として処理するという発想の転換が、実装を現実的なものにしている
- **使いどころ**: CAD/CGソフトウェアにおける図形の交差判定、地理情報システムにおける道路・境界線の交差検出、VLSI設計における配線の干渉チェックなど、多数の線分・図形を扱う計算幾何の実務全般

## 実装例

x座標順のイベント(始点・終点)を処理しながら、走査線上でy座標順に隣接する線分同士だけを判定する。「アクティブな線分集合」は平衡二分探索木の代わりに挿入位置を二分探索で求めるソート済みリストで表現する(要素数が多い場合の挿入コストはO(n)だが、判定対象を隣接ペアに絞るという考え方自体は変わらない)。

```python
import bisect

Point = tuple[float, float]
Segment = tuple[Point, Point]

def orientation(p: Point, q: Point, r: Point) -> int:
    val = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    if abs(val) < 1e-12:
        return 0
    return 1 if val > 0 else -1

def on_segment(p: Point, q: Point, r: Point) -> bool:
    return (
        min(p[0], r[0]) - 1e-9 <= q[0] <= max(p[0], r[0]) + 1e-9
        and min(p[1], r[1]) - 1e-9 <= q[1] <= max(p[1], r[1]) + 1e-9
    )

def segments_intersect(seg1: Segment, seg2: Segment) -> bool:
    """2線分が交差(端点での接触含む)するかを向き判定で調べる。"""
    p1, q1 = seg1
    p2, q2 = seg2
    o1, o2 = orientation(p1, q1, p2), orientation(p1, q1, q2)
    o3, o4 = orientation(p2, q2, p1), orientation(p2, q2, q1)
    if o1 != o2 and o3 != o4:
        return True
    if o1 == 0 and on_segment(p1, p2, q1):
        return True
    if o2 == 0 and on_segment(p1, q2, q1):
        return True
    if o3 == 0 and on_segment(p2, p1, q2):
        return True
    if o4 == 0 and on_segment(p2, q1, q2):
        return True
    return False

def _y_at(seg: Segment, x: float) -> float:
    (x1, y1), (x2, y2) = seg
    if x2 == x1:
        return y1
    t = (x - x1) / (x2 - x1)
    return y1 + t * (y2 - y1)

def sweep_line_has_intersection(segments: list[Segment]) -> bool:
    """走査線法: x座標順にイベントを処理し、走査線上でy座標順に隣接する線分同士だけを比較する。"""
    events = []  # (x, type, index) type: 0=始点(終点より先に処理), 1=終点
    for i, (p, q) in enumerate(segments):
        if p[0] > q[0]:
            p, q = q, p
        events.append((p[0], 0, i))
        events.append((q[0], 1, i))
        segments[i] = (p, q)
    events.sort(key=lambda e: (e[0], e[1]))

    active: list[int] = []  # 現在走査線と交差している線分のインデックスを、y座標順に保持

    for x, etype, idx in events:
        if etype == 0:
            ys = [_y_at(segments[a], x) for a in active]
            pos = bisect.bisect_left(ys, _y_at(segments[idx], x))
            for nb in ([active[pos - 1]] if pos > 0 else []) + ([active[pos]] if pos < len(active) else []):
                if segments_intersect(segments[idx], segments[nb]):
                    return True
            active.insert(pos, idx)
        else:
            pos = active.index(idx)
            if 0 < pos < len(active) - 1:
                if segments_intersect(segments[active[pos - 1]], segments[active[pos + 1]]):
                    return True
            active.pop(pos)
    return False
```

```typescript
type Point = [number, number];
type Segment = [Point, Point];

function orientation(p: Point, q: Point, r: Point): number {
  const val = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : -1;
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return (
    Math.min(p[0], r[0]) - 1e-9 <= q[0] &&
    q[0] <= Math.max(p[0], r[0]) + 1e-9 &&
    Math.min(p[1], r[1]) - 1e-9 <= q[1] &&
    q[1] <= Math.max(p[1], r[1]) + 1e-9
  );
}

// 2線分が交差(端点での接触含む)するかを向き判定で調べる
function segmentsIntersect(seg1: Segment, seg2: Segment): boolean {
  const [p1, q1] = seg1;
  const [p2, q2] = seg2;
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

function yAt(seg: Segment, x: number): number {
  const [[x1, y1], [x2, y2]] = seg;
  if (x2 === x1) return y1;
  const t = (x - x1) / (x2 - x1);
  return y1 + t * (y2 - y1);
}

// 走査線法: x座標順にイベントを処理し、走査線上でy座標順に隣接する線分同士だけを比較する
function sweepLineHasIntersection(rawSegments: Segment[]): boolean {
  const segments: Segment[] = rawSegments.map(([p, q]) => (p[0] > q[0] ? [q, p] : [p, q]));
  const events: { x: number; type: 0 | 1; idx: number }[] = [];
  segments.forEach((seg, i) => {
    events.push({ x: seg[0][0], type: 0, idx: i }); // 始点(終点より先に処理)
    events.push({ x: seg[1][0], type: 1, idx: i }); // 終点
  });
  events.sort((a, b) => (a.x !== b.x ? a.x - b.x : a.type - b.type));

  const active: number[] = []; // 現在走査線と交差している線分のインデックスを、y座標順に保持

  for (const { x, type, idx } of events) {
    if (type === 0) {
      const ys = active.map((a) => yAt(segments[a], x));
      const target = yAt(segments[idx], x);
      let pos = 0;
      while (pos < ys.length && ys[pos] < target) pos++;
      const neighbors: number[] = [];
      if (pos > 0) neighbors.push(active[pos - 1]);
      if (pos < active.length) neighbors.push(active[pos]);
      for (const nb of neighbors) if (segmentsIntersect(segments[idx], segments[nb])) return true;
      active.splice(pos, 0, idx);
    } else {
      const pos = active.indexOf(idx);
      if (pos > 0 && pos < active.length - 1) {
        if (segmentsIntersect(segments[active[pos - 1]], segments[active[pos + 1]])) return true;
      }
      active.splice(pos, 1);
    }
  }
  return false;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <cmath>

using Point = std::pair<double, double>;
using Segment = std::pair<Point, Point>;

int orientation(const Point& p, const Point& q, const Point& r) {
    double val = (q.first - p.first) * (r.second - p.second) - (q.second - p.second) * (r.first - p.first);
    if (std::abs(val) < 1e-12) return 0;
    return val > 0 ? 1 : -1;
}

bool onSegment(const Point& p, const Point& q, const Point& r) {
    return std::min(p.first, r.first) - 1e-9 <= q.first && q.first <= std::max(p.first, r.first) + 1e-9 &&
           std::min(p.second, r.second) - 1e-9 <= q.second && q.second <= std::max(p.second, r.second) + 1e-9;
}

// 2線分が交差(端点での接触含む)するかを向き判定で調べる
bool segmentsIntersect(const Segment& s1, const Segment& s2) {
    const auto& [p1, q1] = s1;
    const auto& [p2, q2] = s2;
    int o1 = orientation(p1, q1, p2), o2 = orientation(p1, q1, q2);
    int o3 = orientation(p2, q2, p1), o4 = orientation(p2, q2, q1);
    if (o1 != o2 && o3 != o4) return true;
    if (o1 == 0 && onSegment(p1, p2, q1)) return true;
    if (o2 == 0 && onSegment(p1, q2, q1)) return true;
    if (o3 == 0 && onSegment(p2, p1, q2)) return true;
    if (o4 == 0 && onSegment(p2, q1, q2)) return true;
    return false;
}

double yAt(const Segment& seg, double x) {
    auto [x1, y1] = seg.first;
    auto [x2, y2] = seg.second;
    if (x2 == x1) return y1;
    double t = (x - x1) / (x2 - x1);
    return y1 + t * (y2 - y1);
}

struct Event { double x; int type; int idx; };

// 走査線法: x座標順にイベントを処理し、走査線上でy座標順に隣接する線分同士だけを比較する
bool sweepLineHasIntersection(std::vector<Segment> segments) {
    for (auto& seg : segments) {
        if (seg.first.first > seg.second.first) std::swap(seg.first, seg.second);
    }
    std::vector<Event> events;
    for (size_t i = 0; i < segments.size(); i++) {
        events.push_back({segments[i].first.first, 0, static_cast<int>(i)});
        events.push_back({segments[i].second.first, 1, static_cast<int>(i)});
    }
    std::sort(events.begin(), events.end(), [](const Event& a, const Event& b) {
        return a.x != b.x ? a.x < b.x : a.type < b.type;
    });

    std::vector<int> active; // 現在走査線と交差している線分のインデックスを、y座標順に保持

    for (const auto& ev : events) {
        if (ev.type == 0) {
            double target = yAt(segments[ev.idx], ev.x);
            size_t pos = 0;
            while (pos < active.size() && yAt(segments[active[pos]], ev.x) < target) pos++;
            if (pos > 0 && segmentsIntersect(segments[ev.idx], segments[active[pos - 1]])) return true;
            if (pos < active.size() && segmentsIntersect(segments[ev.idx], segments[active[pos]])) return true;
            active.insert(active.begin() + pos, ev.idx);
        } else {
            auto it = std::find(active.begin(), active.end(), ev.idx);
            size_t pos = it - active.begin();
            if (pos > 0 && pos + 1 < active.size()) {
                if (segmentsIntersect(segments[active[pos - 1]], segments[active[pos + 1]])) return true;
            }
            active.erase(it);
        }
    }
    return false;
}
```

```rust
type Point = (f64, f64);
type Segment = (Point, Point);

fn orientation(p: Point, q: Point, r: Point) -> i32 {
    let val = (q.0 - p.0) * (r.1 - p.1) - (q.1 - p.1) * (r.0 - p.0);
    if val.abs() < 1e-12 {
        0
    } else if val > 0.0 {
        1
    } else {
        -1
    }
}

fn on_segment(p: Point, q: Point, r: Point) -> bool {
    p.0.min(r.0) - 1e-9 <= q.0 && q.0 <= p.0.max(r.0) + 1e-9 &&
    p.1.min(r.1) - 1e-9 <= q.1 && q.1 <= p.1.max(r.1) + 1e-9
}

// 2線分が交差(端点での接触含む)するかを向き判定で調べる
fn segments_intersect(s1: Segment, s2: Segment) -> bool {
    let (p1, q1) = s1;
    let (p2, q2) = s2;
    let (o1, o2) = (orientation(p1, q1, p2), orientation(p1, q1, q2));
    let (o3, o4) = (orientation(p2, q2, p1), orientation(p2, q2, q1));
    if o1 != o2 && o3 != o4 {
        return true;
    }
    if o1 == 0 && on_segment(p1, p2, q1) { return true; }
    if o2 == 0 && on_segment(p1, q2, q1) { return true; }
    if o3 == 0 && on_segment(p2, p1, q2) { return true; }
    if o4 == 0 && on_segment(p2, q1, q2) { return true; }
    false
}

fn y_at(seg: Segment, x: f64) -> f64 {
    let ((x1, y1), (x2, y2)) = seg;
    if (x2 - x1).abs() < 1e-15 {
        return y1;
    }
    let t = (x - x1) / (x2 - x1);
    y1 + t * (y2 - y1)
}

// 走査線法: x座標順にイベントを処理し、走査線上でy座標順に隣接する線分同士だけを比較する
fn sweep_line_has_intersection(raw_segments: &[Segment]) -> bool {
    let segments: Vec<Segment> = raw_segments
        .iter()
        .map(|&(p, q)| if p.0 > q.0 { (q, p) } else { (p, q) })
        .collect();

    // (x, type, idx) type: 0=始点(終点より先に処理), 1=終点
    let mut events: Vec<(f64, u8, usize)> = Vec::new();
    for (i, &(p, q)) in segments.iter().enumerate() {
        events.push((p.0, 0, i));
        events.push((q.0, 1, i));
    }
    events.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap().then(a.1.cmp(&b.1)));

    let mut active: Vec<usize> = Vec::new(); // 現在走査線と交差している線分のインデックスを、y座標順に保持

    for &(x, etype, idx) in &events {
        if etype == 0 {
            let target = y_at(segments[idx], x);
            let mut pos = 0;
            while pos < active.len() && y_at(segments[active[pos]], x) < target {
                pos += 1;
            }
            if pos > 0 && segments_intersect(segments[idx], segments[active[pos - 1]]) {
                return true;
            }
            if pos < active.len() && segments_intersect(segments[idx], segments[active[pos]]) {
                return true;
            }
            active.insert(pos, idx);
        } else {
            let pos = active.iter().position(|&a| a == idx).unwrap();
            if pos > 0 && pos + 1 < active.len() {
                if segments_intersect(segments[active[pos - 1]], segments[active[pos + 1]]) {
                    return true;
                }
            }
            active.remove(pos);
        }
    }
    false
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

record struct Point(double X, double Y);
record struct Segment(Point P, Point Q);

static class LineSweep
{
    static int Orientation(Point p, Point q, Point r)
    {
        double val = (q.X - p.X) * (r.Y - p.Y) - (q.Y - p.Y) * (r.X - p.X);
        if (Math.Abs(val) < 1e-12) return 0;
        return val > 0 ? 1 : -1;
    }

    static bool OnSegment(Point p, Point q, Point r) =>
        Math.Min(p.X, r.X) - 1e-9 <= q.X && q.X <= Math.Max(p.X, r.X) + 1e-9 &&
        Math.Min(p.Y, r.Y) - 1e-9 <= q.Y && q.Y <= Math.Max(p.Y, r.Y) + 1e-9;

    // 2線分が交差(端点での接触含む)するかを向き判定で調べる
    public static bool SegmentsIntersect(Segment s1, Segment s2)
    {
        var (p1, q1) = (s1.P, s1.Q);
        var (p2, q2) = (s2.P, s2.Q);
        int o1 = Orientation(p1, q1, p2), o2 = Orientation(p1, q1, q2);
        int o3 = Orientation(p2, q2, p1), o4 = Orientation(p2, q2, q1);
        if (o1 != o2 && o3 != o4) return true;
        if (o1 == 0 && OnSegment(p1, p2, q1)) return true;
        if (o2 == 0 && OnSegment(p1, q2, q1)) return true;
        if (o3 == 0 && OnSegment(p2, p1, q2)) return true;
        if (o4 == 0 && OnSegment(p2, q1, q2)) return true;
        return false;
    }

    static double YAt(Segment seg, double x)
    {
        var (x1, y1) = (seg.P.X, seg.P.Y);
        var (x2, y2) = (seg.Q.X, seg.Q.Y);
        if (x2 == x1) return y1;
        double t = (x - x1) / (x2 - x1);
        return y1 + t * (y2 - y1);
    }

    // 走査線法: x座標順にイベントを処理し、走査線上でy座標順に隣接する線分同士だけを比較する
    public static bool SweepLineHasIntersection(List<Segment> rawSegments)
    {
        var segments = rawSegments.Select(s => s.P.X > s.Q.X ? new Segment(s.Q, s.P) : s).ToList();
        var events = new List<(double X, int Type, int Idx)>();
        for (int i = 0; i < segments.Count; i++)
        {
            events.Add((segments[i].P.X, 0, i));
            events.Add((segments[i].Q.X, 1, i));
        }
        events.Sort((a, b) => a.X != b.X ? a.X.CompareTo(b.X) : a.Type.CompareTo(b.Type));

        var active = new List<int>(); // 現在走査線と交差している線分のインデックスを、y座標順に保持

        foreach (var (x, type, idx) in events)
        {
            if (type == 0)
            {
                double target = YAt(segments[idx], x);
                int pos = 0;
                while (pos < active.Count && YAt(segments[active[pos]], x) < target) pos++;
                if (pos > 0 && SegmentsIntersect(segments[idx], segments[active[pos - 1]])) return true;
                if (pos < active.Count && SegmentsIntersect(segments[idx], segments[active[pos]])) return true;
                active.Insert(pos, idx);
            }
            else
            {
                int pos = active.IndexOf(idx);
                if (pos > 0 && pos + 1 < active.Count)
                {
                    if (SegmentsIntersect(segments[active[pos - 1]], segments[active[pos + 1]])) return true;
                }
                active.RemoveAt(pos);
            }
        }
        return false;
    }
}
```
