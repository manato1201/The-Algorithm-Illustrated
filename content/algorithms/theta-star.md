---
name: Theta*(シータスター)
category: 探索
subcategory: グラフ・経路探索
complexity: O(E)(実用上はA*とほぼ同等)
summary: グリッドの格子線に縛られたA*経路の不自然なジグザグを、視線が通る限り親ノードを飛び越えて直線的につなぎ直す「任意角度」経路探索。
---

## 概要

グリッド上でA*探索を行うと、最短経路は必ず隣接する8方向(あるいは4方向)のマスをたどる形になり、本来なら斜めに一直線で行けるはずの道が、階段状のジグザグ経路として出力されてしまう。2010年にAlex NashらがKr Reyの研究を発展させて発表したTheta*は、この問題を「**視線が通るなら、隣接ノードを飛び越えて任意の角度で直接つなぐ**」というアイデアで解決する。グリッドの制約を離れ、より現実的で短い経路を出力できる「任意角度経路探索(any-angle pathfinding)」を代表するアルゴリズムである。

## 仕組み

1. 基本的な骨格はA*と同じで、`f = g + h` を優先度としてオープンリストからノードを取り出しながら探索する
2. 通常のA*は、あるノードのgコストを更新する際、その**直前の隣接ノード(親)**からのコストしか考えない
3. Theta*では、あるノードnの親候補pを更新する際に**もう一段階遡り、pの親parent(p)からnまで障害物なしに直線で見通せるか(line-of-sight)を確認する**
4. 見通せるなら、nの親をpではなくparent(p)に付け替え、gコストも「parent(p)からnまでのユークリッド距離」で直接計算し直す(グリッドの格子を経由しない斜めの直線コストになる)
5. 見通せないなら、通常のA*と同様にpを親とする
6. ゴールに到達するまで2〜5を繰り返し、最終的な経路は親リンクを辿ることで、視線が通る区間はすべて直線化された滑らかな経路になる

視線判定(line-of-sight)には、格子上でよく使われるBresenhamの線分描画アルゴリズムなどが用いられる。

## 特性・トレードオフ

- **計算量**: A*本体の計算量O(E)に、各ノードで視線判定O(グリッドの対角距離程度)が加わる。視線判定のコストはあるが、経路の質が大きく向上するため実用上は十分高速
- **経路の質が大きく向上**: A*が出力するジグザグ経路と比べ、Theta*は障害物を避けつつ可能な限り直線に近い、実際の移動距離がより短い経路を出力する
- **最短性は近似**: 厳密な意味での最短経路(あらゆる角度を考慮した理論上の最短路)を常に保証するわけではないが、実用上は非常に近い経路が得られる
- **視線判定のコストがボトルネックになりうる**: 各ノードで親の親まで視線を確認するため、障害物が多い複雑なマップでは視線判定の回数が増え、Lazy Theta*のような軽量化版が考案されている
- **使いどころ**: ロボットナビゲーション、リアルタイムストラテジーゲームやオープンワールドゲームでの自然なキャラクター移動経路の生成、ドローンや自律走行車の経路計画

## 実装例

```python
import heapq
import math
from typing import Callable

Point = tuple[int, int]


def line_of_sight(a: Point, b: Point, blocked: Callable[[Point], bool]) -> bool:
    """Bresenhamライクな格子走査でa-b間に障害物が無いか確認する"""
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


def theta_star(
    start: Point, goal: Point, neighbors_fn: Callable[[Point], list[Point]], blocked: Callable[[Point], bool]
) -> list[Point] | None:
    g_score: dict[Point, float] = {start: 0.0}
    parent: dict[Point, Point] = {start: start}
    open_heap: list[tuple[float, Point]] = [(heuristic(start, goal), start)]
    closed: set[Point] = set()

    while open_heap:
        _, current = heapq.heappop(open_heap)
        if current in closed:
            continue
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
            p = parent[current]
            if line_of_sight(p, nbr, blocked):
                # 親の親まで視線が通るなら、そちらへ直接つなぎ直す
                new_g = g_score[p] + heuristic(p, nbr)
                if new_g < g_score.get(nbr, math.inf):
                    g_score[nbr] = new_g
                    parent[nbr] = p
                    heapq.heappush(open_heap, (new_g + heuristic(nbr, goal), nbr))
            else:
                new_g = g_score[current] + heuristic(current, nbr)
                if new_g < g_score.get(nbr, math.inf):
                    g_score[nbr] = new_g
                    parent[nbr] = current
                    heapq.heappush(open_heap, (new_g + heuristic(nbr, goal), nbr))
    return None
```

```typescript
type Point = [number, number];

function lineOfSight(a: Point, b: Point, blocked: (p: Point) => boolean): boolean {
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

function thetaStar(
  start: Point,
  goal: Point,
  neighborsFn: (p: Point) => Point[],
  blocked: (p: Point) => boolean
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
      const p = parent.get(ck)!;
      if (lineOfSight(p, nbr, blocked)) {
        const newG = gScore.get(key(p))! + heuristic(p, nbr);
        if (newG < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, newG);
          parent.set(nk, p);
          open.push([newG + heuristic(nbr, goal), nbr]);
        }
      } else {
        const newG = gScore.get(ck)! + heuristic(current, nbr);
        if (newG < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, newG);
          parent.set(nk, current);
          open.push([newG + heuristic(nbr, goal), nbr]);
        }
      }
    }
  }
  return null;
}
```
