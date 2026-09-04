---
name: Lazy Theta*(レイジー・シータスター)
category: 探索
subcategory: グラフ・経路探索
complexity: O(E)(視線判定の回数がTheta*より少ない)
summary: Theta*の視線判定を「本当に必要になるまで」先延ばしにし、見通せなかった場合だけ後から補正することで、計算コストの重い視線判定の回数を大幅に減らした任意角度経路探索。
---

## 概要

Theta*は、ノードを更新するたびに親候補への視線判定(line-of-sight)を行うことで滑らかな経路を作るが、この視線判定はグリッド上の距離に比例したコストがかかり、探索全体のボトルネックになりやすい。2010年にAlex Nash、Sven Koenig、Craig Tovey が発表したLazy Theta*は、「**視線が通ると楽観的に仮定してまず探索を進め、実際に経路として確定した後で、通っていなければ修正する**」という遅延評価(lazy evaluation)の発想で、視線判定の回数を大きく削減する。名前の通り「怠惰(lazy)」に判定を先送りすることで、Theta*とほぼ同等の経路品質を、より少ない計算コストで実現する。

## 仕組み

1. 基本の骨格はTheta*と同じくA*ベースの探索
2. ノードnを展開する際、Theta*のように毎回視線判定をするのではなく、**「親の親(parent(p))から直接見えるはず」と仮定して、視線判定なしでgコストとfコストを計算し、オープンリストに追加する**
3. このノードが実際にオープンリストから取り出されて展開される段階になって初めて、親parent(p)への視線判定を1回だけ行う
4. 視線が実際に通っていれば、その仮定は正しかったのでそのまま処理を続ける
5. **視線が通っていなかった場合**、そのノードの親を「実際に視線が通っている隣接ノードの中でgコストが最小のもの」に付け替えて再計算する(修正コスト)
6. ゴールに到達するまで2〜5を繰り返す

多くのノードは最終的な経路に採用されずに捨てられるため、「後で使われるかどうかも分からないノード全てに事前の視線判定をする」Theta*の無駄を、「実際に使われることが確定したノードだけ判定する」ことで省く点が本質的な改善である。

## 特性・トレードオフ

- **計算量**: Theta*と漸近的な最悪計算量のオーダーは同じだが、**視線判定の実行回数が大幅に少なくなる**ため、実測での実行速度はTheta*より優れることが多い。特に開けた(障害物が少ない)マップほど効果が大きい
- **経路品質はTheta*とほぼ同等**: 楽観的な仮定が誤っていた場合は事後的に補正されるため、最終的に出力される経路の滑らかさ・長さはTheta*とほとんど変わらない
- **視線判定が重いほど効果的**: 視線判定のコストが安い(グリッドが小さい、障害物が単純)場合はTheta*との差は縮まるが、3D空間や複雑な障害物形状など視線判定が高コストな環境ほどLazy Theta*の優位性が際立つ
- **実装の複雑さはTheta*とほぼ同等**: 視線判定を先送りするロジックを追加するだけで、全体のアルゴリズム構造はTheta*から大きく変わらない
- **使いどころ**: 大規模な3D環境でのロボット・ドローンの経路計画、視線判定コストが高いリアルタイムゲームのナビゲーションメッシュ上での移動、計算資源が限られる組み込みナビゲーションシステム

## 実装例

```python
import heapq
import math
from typing import Callable

Point = tuple[int, int]


def line_of_sight(a: Point, b: Point, blocked: Callable[[Point], bool]) -> bool:
    x0, y0 = a
    x1, y1 = b
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x1 > x0 else -1
    sy = 1 if y1 > y0 else -1
    err = dx - dy
    x, y = x0, y0
    while (x, y) != (x1, y1):
        if blocked((x, y)):
            return False
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x += sx
        if e2 < dx:
            err += dx
            y += sy
    return not blocked((x1, y1))


def heuristic(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def lazy_theta_star(
    start: Point, goal: Point, neighbors_fn: Callable[[Point], list[Point]], blocked: Callable[[Point], bool]
) -> list[Point] | None:
    g_score: dict[Point, float] = {start: 0.0}
    parent: dict[Point, Point] = {start: start}
    open_heap: list[tuple[float, Point]] = [(heuristic(start, goal), start)]
    closed: set[Point] = set()

    def update_vertex(current: Point, nbr: Point) -> None:
        # 楽観的に「親の親から見えるはず」と仮定して先にコストを計算する
        p = parent[current]
        old_g = g_score[nbr]
        candidate_g = g_score[p] + heuristic(p, nbr)
        if candidate_g < old_g:
            g_score[nbr] = candidate_g
            parent[nbr] = p
            heapq.heappush(open_heap, (candidate_g + heuristic(nbr, goal), nbr))

    while open_heap:
        _, current = heapq.heappop(open_heap)
        if current in closed:
            continue

        # 展開の直前になって初めて、仮定した視線が本当に通っているか確認する
        p = parent[current]
        if p != current and not line_of_sight(p, current, blocked):
            best_g = math.inf
            best_parent = None
            for nbr in neighbors_fn(current):
                if nbr in closed and (best_parent is None or g_score.get(nbr, math.inf) + heuristic(nbr, current) < best_g):
                    best_g = g_score.get(nbr, math.inf) + heuristic(nbr, current)
                    best_parent = nbr
            if best_parent is not None:
                parent[current] = best_parent
                g_score[current] = best_g

        if current == goal:
            path = [current]
            while parent[current] != current:
                current = parent[current]
                path.append(current)
            return path[::-1]
        closed.add(current)

        for nbr in neighbors_fn(current):
            if blocked(nbr) or nbr in closed:
                continue
            if nbr not in g_score:
                g_score[nbr] = math.inf
                parent[nbr] = current
            update_vertex(current, nbr)
    return None
```

```typescript
type Point = [number, number];

function lineOfSight(
  a: Point,
  b: Point,
  blocked: (p: Point) => boolean,
): boolean {
  let [x0, y0] = a;
  const [x1, y1] = b;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x1 > x0 ? 1 : -1;
  const sy = y1 > y0 ? 1 : -1;
  let err = dx - dy;

  while (x0 !== x1 || y0 !== y1) {
    if (blocked([x0, y0])) return false;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return !blocked([x1, y1]);
}

function heuristic(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function key(p: Point): string {
  return `${p[0]},${p[1]}`;
}

function lazyThetaStar(
  start: Point,
  goal: Point,
  neighborsFn: (p: Point) => Point[],
  blocked: (p: Point) => boolean,
): Point[] | null {
  const gScore = new Map<string, number>([[key(start), 0]]);
  const parent = new Map<string, Point>([[key(start), start]]);
  const closed = new Set<string>();
  const open: [number, Point][] = [[heuristic(start, goal), start]];

  const popMin = (): Point | undefined => {
    if (open.length === 0) return undefined;
    open.sort((a, b) => a[0] - b[0]);
    return open.shift()![1];
  };

  while (open.length > 0) {
    const current = popMin()!;
    const ck = key(current);
    if (closed.has(ck)) continue;

    // 展開直前に、仮定していた視線が本当に通っているか確認する
    const p = parent.get(ck)!;
    if (key(p) !== ck && !lineOfSight(p, current, blocked)) {
      let bestG = Infinity;
      let bestParent: Point | null = null;
      for (const nbr of neighborsFn(current)) {
        const nk = key(nbr);
        if (closed.has(nk)) {
          const cand = (gScore.get(nk) ?? Infinity) + heuristic(nbr, current);
          if (cand < bestG) {
            bestG = cand;
            bestParent = nbr;
          }
        }
      }
      if (bestParent) {
        parent.set(ck, bestParent);
        gScore.set(ck, bestG);
      }
    }

    if (current[0] === goal[0] && current[1] === goal[1]) {
      const path: Point[] = [current];
      let cur = current;
      while (key(parent.get(key(cur))!) !== key(cur)) {
        cur = parent.get(key(cur))!;
        path.push(cur);
      }
      return path.reverse();
    }
    closed.add(ck);

    for (const nbr of neighborsFn(current)) {
      const nk = key(nbr);
      if (blocked(nbr) || closed.has(nk)) continue;
      if (!gScore.has(nk)) {
        gScore.set(nk, Infinity);
        parent.set(nk, current);
      }
      const pp = parent.get(ck)!;
      const candidateG = gScore.get(key(pp))! + heuristic(pp, nbr);
      if (candidateG < gScore.get(nk)!) {
        gScore.set(nk, candidateG);
        parent.set(nk, pp);
        open.push([candidateG + heuristic(nbr, goal), nbr]);
      }
    }
  }
  return null;
}
```
