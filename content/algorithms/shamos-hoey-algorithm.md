---
name: Shamos-Hoeyアルゴリズム(線分交差の有無判定)
category: 計算幾何
subcategory: 分割統治・走査
complexity: O(n log n)
summary: 複数線分の中に交差する組が1つでも存在するかだけをO(n log n)で判定する走査線アルゴリズムで、全ての交点を列挙する走査線法より軽量な判定に特化する。
---

## 概要

n本の線分が与えられたとき、「その中に交差するペアが1つでも存在するか」だけを知りたい場合がある(例えば、地図データにおける道路網の自己交差チェックや、多角形の頂点列が単純多角形(自己交差しない)かどうかの検証など)。Michael ShamosとDan Hoeyが1976年に発表したこのアルゴリズムは、[線分交差判定(走査線法)](/algorithms/line-sweep-intersection)と同じ走査線の発想を使いながら、**「交差の有無」というYES/NO判定だけに的を絞る**ことで、シンプルかつ確実にO(n log n)で答えを出す。計算幾何において走査線法(sweep line)という設計パターンが最初に脚光を浴びた歴史的に重要なアルゴリズムのひとつでもある。

## 仕組み

基本的な走査の流れは[線分交差判定(走査線法)](/algorithms/line-sweep-intersection)と同様に、縦の走査線をx座標の小さい方から大きい方へ動かしながらイベント処理を行う。

1. 全ての線分の始点・終点をx座標順にイベントとして並べる(同じx座標なら、始点を終点より先に処理する)
2. 走査線と交差している線分の集合(アクティブ集合)を、走査線上のy座標順に並べた平衡構造(実装では順序付き集合や二分探索木)で管理する
3. **線分の始点に到達したら**、その線分をアクティブ集合に挿入し、**y座標順で直上・直下に隣接することになる線分**とだけ交差判定を行う。交差していれば、その時点で直ちに「交差あり」として処理を打ち切り、結果を返す
4. **線分の終点に到達したら**、その線分をアクティブ集合から削除し、削除によって新たに隣接することになった上下の線分同士を交差判定する。交差していれば同様に打ち切る
5. 全てのイベントを処理し終えても交差が見つからなければ、「交差するペアは存在しない」と判定して終了する

この判定が正しい理由は、「2本の線分が交差するなら、その交差点にたどり着くまでのどこかの時点で、走査線上でその2本が必ず隣接する瞬間がある」という性質にある。したがって、隣接ペアだけを常にチェックしていれば、交差が存在する限り必ず発見できる。

## 特性・トレードオフ

- **[線分交差判定(走査線法)](/algorithms/line-sweep-intersection)との目的・計算量の違い**: [線分交差判定(走査線法)](/algorithms/line-sweep-intersection)は「全ての交点を列挙する」ことを目的とし、計算量はO((n + k) log n)(kは実際の交差数)で、交差が多いと`k`に比例して遅くなる。一方Shamos-Hoeyアルゴリズムは「交差が1つでもあるか」だけを判定するため、**交差が実際に何組あっても、最初の1組を見つけた時点で打ち切れる**。交差が全く存在しない最悪ケースでも、走査線上の全イベント処理はO(n log n)に収まるため、計算量が入力の交差数に依存せず**常にO(n log n)で確定する**点が本質的な違い
- **単純多角形の判定への応用**: 多角形の頂点列を辺の集合とみなし、隣接しない辺同士に交差がないかをShamos-Hoeyアルゴリズムで判定すれば、その多角形が自己交差のない単純多角形かどうかをO(n log n)で検証できる。多角形分割・三角形分割アルゴリズムの前処理としてよく使われる
- **早期打ち切りの実務的価値**: 交点そのものではなく交差の有無だけが必要な場面(妥当性検証、衝突判定の一次スクリーニングなど)では、無駄に全交点を求める必要がなく、最初の交差を検出した時点で即座に終了できるため実用上は非常に高速に動作することが多い
- **使いどころ**: GISにおける道路網・境界線データの自己交差チェック(データの妥当性検証)、CADソフトウェアでの図形の自己交差検出、多角形が単純多角形であることの事前検証、配線設計における干渉の有無だけを高速に確認したい場面

## 実装例

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


def has_any_intersection(segments: list[Segment]) -> bool:
    """Shamos-Hoey: 交差が1組でも見つかった時点で即座にTrueを返し、
    全て確認してもなければFalseを返す(交点そのものは求めない)。"""
    segs = []
    for p, q in segments:
        segs.append((p, q) if p[0] <= q[0] else (q, p))

    events = []
    for i, (p, q) in enumerate(segs):
        events.append((p[0], 0, i))
        events.append((q[0], 1, i))
    events.sort(key=lambda e: (e[0], e[1]))

    active: list[int] = []

    for x, etype, idx in events:
        if etype == 0:
            target = _y_at(segs[idx], x)
            ys = [_y_at(segs[a], x) for a in active]
            pos = bisect.bisect_left(ys, target)
            if pos > 0 and segments_intersect(segs[idx], segs[active[pos - 1]]):
                return True
            if pos < len(active) and segments_intersect(segs[idx], segs[active[pos]]):
                return True
            active.insert(pos, idx)
        else:
            pos = active.index(idx)
            if pos > 0 and pos < len(active) - 1:
                if segments_intersect(segs[active[pos - 1]], segs[active[pos + 1]]):
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

// Shamos-Hoey: 交差が1組でも見つかった時点で即座にtrueを返し、
// 全て確認してもなければfalseを返す(交点そのものは求めない)
function hasAnyIntersection(rawSegments: Segment[]): boolean {
  const segments: Segment[] = rawSegments.map(([p, q]) => (p[0] <= q[0] ? [p, q] : [q, p]));
  const events: { x: number; type: 0 | 1; idx: number }[] = [];
  segments.forEach((seg, i) => {
    events.push({ x: seg[0][0], type: 0, idx: i });
    events.push({ x: seg[1][0], type: 1, idx: i });
  });
  events.sort((a, b) => (a.x !== b.x ? a.x - b.x : a.type - b.type));

  const active: number[] = [];

  for (const { x, type, idx } of events) {
    if (type === 0) {
      const target = yAt(segments[idx], x);
      let pos = 0;
      while (pos < active.length && yAt(segments[active[pos]], x) < target) pos++;
      if (pos > 0 && segmentsIntersect(segments[idx], segments[active[pos - 1]])) return true;
      if (pos < active.length && segmentsIntersect(segments[idx], segments[active[pos]])) return true;
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
