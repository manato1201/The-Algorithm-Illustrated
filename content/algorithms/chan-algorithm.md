---
name: Chanのアルゴリズム(出力鋭敏型凸包)
category: 計算幾何
subcategory: 凸包・多角形
complexity: O(n log h)(hは凸包の頂点数)
summary: 点群を小グループに分けて各グループの凸包をグラハムスキャンで求め、それらをギフト包装法的に併合することで、出力点数hに応じて計算量が変動する出力鋭敏型の凸包アルゴリズム。
---

## 概要

凸包を求めるアルゴリズムには、[グラハムスキャン](/algorithms/graham-scan)のようにO(n log n)で確実に動くものと、[ジャービスの行進法](/algorithms/jarvis-march)(ギフト包装法)のように出力される凸包の頂点数`h`が小さいときにO(nh)で高速に動くものがある。しかし点数`n`に対して`h`が大きい場合、ジャービスの行進法はO(n²)に近づいてしまい、逆にグラハムスキャンは`h`が小さくてもO(n log n)より速くならない。ティモシー・チャン(Timothy Chan)が1996年に発表したこのアルゴリズムは、両者の良いところを組み合わせ、**入力点数`n`と出力頂点数`h`の両方に依存するO(n log h)**という、この問題に対して情報理論的に最適な計算量を達成する。「出力の大きさに応じて処理量が変わる」という性質から**出力鋭敏(output-sensitive)アルゴリズム**の代表例として知られる。

## 仕組み

Chanのアルゴリズムは、「グループ分けしたグラハムスキャン」と「ジャービスの行進法による併合」を組み合わせる、2段階構成になっている。

**第1段階: 小グループへの分割と部分凸包の構築**

1. `n`個の点を、あらかじめ決めたサイズ`m`ごとの小グループに分割する(グループ数は`⌈n/m⌉`個)
2. 各グループについて、独立に[グラハムスキャン](/algorithms/graham-scan)を適用し、そのグループ内の凸包を求める。1グループの計算にO(m log m)かかり、グループ数は`n/m`個なので、この段階全体でO((n/m)・m log m) = O(n log m)

**第2段階: 部分凸包同士のジャービス行進法による併合**

3. 全体の最下点(必ず全体の凸包の頂点になる)を開始点とする
4. 現在の点から、**各部分凸包に対して「その部分凸包の中で、現在の点から見て最も反時計回りに位置する接線となる頂点」**を二分探索で求める(部分凸包は凸多角形なので、ある方向への接点は二分探索でO(log m)で見つかる)
5. 全ての部分凸包から得た候補点の中から、最も反時計回りの方向にある点を選び、それを全体の凸包の次の頂点とする
6. 開始点に戻るまで4〜5を繰り返す。全体の凸包の頂点数を`h`とすると、この段階はO(h・(n/m)・log m)(1歩ごとに全部分凸包を調べ、各部分凸包での接線探索がO(log m))

**パラメータ`m`の決定: 倍々ゲーム(doubling trick)**

事前に`h`はわからないため、`m`を直接`h`に設定することはできない。そこで**`m`を`2, 4, 8, 16, ...`と倍々に増やしながら、上記の処理を試行する**。具体的には、`m = 2^(2^t)`という急激に増加する数列を使い、各試行で第2段階の併合処理を「`h`ステップ以内で開始点に戻れなければ失敗として打ち切る」という制限付きで実行する。ある`t`で`m ≥ h`となった瞬間に処理が成功し、それ以前の全ての失敗試行の計算量の合計は幾何級数的に抑えられるため、全体としてO(n log h)に収まる。

## 特性・トレードオフ

- **出力鋭敏性の利点**: 点群のほとんどが凸包の内部に埋もれていて凸包の頂点数`h`が小さい(例えば円状のノイズを含むデータで、実際の凸包は少数の外れ値だけで構成される)ようなケースでは、O(n log n)のグラハムスキャンよりも高速に動作する。逆に`h`が`n`に近い(点群のほとんどが凸包の頂点になる)最悪ケースでも、O(n log n)に収まりO(nh)のジャービス行進法のような劣化は起きない
- **実装の複雑さ**: 倍々ゲームによる`m`の決定と、失敗時の打ち切り・再試行のロジックが必要なため、単純な[グラハムスキャン](/algorithms/graham-scan)と比べて実装は格段に複雑になる。実務では、`h`が小さいと事前にわかっている特殊なケースを除き、実装の単純さを優先してO(n log n)のアルゴリズムが選ばれることも多い
- **理論的な意義**: 凸包を求める問題は、出力の`h`点を並べ替えるという下限からΩ(n log h)の計算量が必要であることが知られており、Chanのアルゴリズムはこの下限に一致する最適アルゴリズムである
- **使いどころ**: 大量の点群からごく少数の外れ値(輪郭)だけを求めたい場合、リアルタイム処理で凸包の頂点数が動的に変わり得る場面、計算幾何の教育において出力鋭敏アルゴリズムの設計手法を学ぶ題材として

## 実装例

```python
import math

Point = tuple[float, float]


def cross(o: Point, a: Point, b: Point) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def graham_scan(points: list[Point]) -> list[Point]:
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    def build(seq: list[Point]) -> list[Point]:
        hull: list[Point] = []
        for p in seq:
            while len(hull) >= 2 and cross(hull[-2], hull[-1], p) <= 0:
                hull.pop()
            hull.append(p)
        return hull

    lower = build(pts)
    upper = build(pts[::-1])
    return lower[:-1] + upper[:-1]


def tangent_point(hull: list[Point], p: Point) -> Point:
    """点pから見て、部分凸包hullの中で最も反時計回りにある頂点を線形探索で求める
    (実務では凸性を利用した二分探索でO(log m)にできる)。"""
    best = hull[0]
    for q in hull[1:]:
        if cross(p, best, q) < 0:
            best = q
    return best


def chan_hull(points: list[Point]) -> list[Point]:
    n = len(points)
    if n < 3:
        return points

    t = 1
    while True:
        m = min(n, 1 << (1 << t))
        groups = [points[i : i + m] for i in range(0, n, m)]
        sub_hulls = [graham_scan(g) for g in groups]

        start = min(points, key=lambda p: (p[1], p[0]))
        hull = [start]
        current = start
        success = True

        for _ in range(m):
            candidates = [tangent_point(h, current) for h in sub_hulls if h]
            next_point = candidates[0]
            for c in candidates[1:]:
                if cross(current, next_point, c) < 0:
                    next_point = c
            if next_point == start:
                success = True
                break
            hull.append(next_point)
            current = next_point
        else:
            success = False

        if success:
            return hull
        t += 1
```

```typescript
type Point = [number, number];

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function grahamScan(pointsIn: Point[]): Point[] {
  const pts = [...pointsIn].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;

  const build = (seq: Point[]): Point[] => {
    const hull: Point[] = [];
    for (const p of seq) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
        hull.pop();
      }
      hull.push(p);
    }
    return hull;
  };

  const lower = build(pts);
  const upper = build([...pts].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// 点pから見て、部分凸包hullの中で最も反時計回りにある頂点を線形探索で求める
// (実務では凸性を利用した二分探索でO(log m)にできる)
function tangentPoint(hull: Point[], p: Point): Point {
  let best = hull[0];
  for (const q of hull.slice(1)) {
    if (cross(p, best, q) < 0) best = q;
  }
  return best;
}

function chanHull(points: Point[]): Point[] {
  const n = points.length;
  if (n < 3) return points;

  let t = 1;
  while (true) {
    const m = Math.min(n, 1 << (1 << t));
    const groups: Point[][] = [];
    for (let i = 0; i < n; i += m) groups.push(points.slice(i, i + m));
    const subHulls = groups.map(grahamScan);

    const start = points.reduce((a, b) => (b[1] < a[1] || (b[1] === a[1] && b[0] < a[0]) ? b : a));
    const hull: Point[] = [start];
    let current = start;
    let success = false;

    for (let step = 0; step < m; step++) {
      const candidates = subHulls.filter((h) => h.length > 0).map((h) => tangentPoint(h, current));
      let next = candidates[0];
      for (const c of candidates.slice(1)) {
        if (cross(current, next, c) < 0) next = c;
      }
      if (next[0] === start[0] && next[1] === start[1]) {
        success = true;
        break;
      }
      hull.push(next);
      current = next;
    }

    if (success) return hull;
    t++;
  }
}
```
