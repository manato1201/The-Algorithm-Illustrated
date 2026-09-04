---
name: Field D*(フィールド・ディースター)
category: 探索
subcategory: グラフ・経路探索
complexity: O(E log E)(再計画1回あたり、変化量に応じて増分更新)
summary: D* Liteのグリッド経路をノード間の直線移動を許す連続的な補間コストに拡張し、未知・変化する地形でも滑らかな経路をリアルタイムに再計画するロボット向け探索。
---

## 概要

D* Liteはセンサーで新たに発見した障害物や地形コストの変化に応じて経路を効率よく再計画できるが、A*と同様にグリッドの8方向移動に縛られるため、出力される経路はジグザグになりがちだった。2005年にDave FergusonとAnthony Stentzが火星探査ローバーなどの実運用を念頭に発表したField D*は、**各グリッドセルの境界上の任意の点を経由する「補間された移動コスト」を導入**し、D* Liteの持つ「未知環境への適応・効率的な再計画」という長所を保ちながら、Theta*のような滑らかで自然な経路を出力できるようにした探索アルゴリズムである。

## 仕組み

1. D* Liteと同様、ゴールから逆向きに `g` コスト(その地点からゴールまでの推定コスト)を伝播させる、インクリメンタルな探索の枠組みを使う
2. 通常のD* Liteはあるセルのコストを「隣接する1つのセルを経由する」形でしか計算しないが、Field D*は**あるセルの2つの隣接する頂点(セルの角)を結ぶ辺上の任意の点を通過する経路のコストを、線形補間によって連続的に計算する**
3. この補間計算では、2つの隣接セルの通過コストと、それぞれの頂点までの距離を使って「辺上のどの点を通れば最もコストが低いか」を解析的に求める(三角形分割された局所的な最適化問題を解く)
4. 求めた最小コストの通過点を使ってgコストを更新し、優先度付きキューで管理する点はD* Liteと同じ
5. センサーが新たな障害物やコスト変化を検知した場合も、D* Liteと同様に**影響を受けた範囲だけを局所的に再計算**し、探索全体をやり直さない
6. 最終的な経路はグリッドの辺に縛られず、セル境界上の任意の点を通る連続的な折れ線として得られる

## 特性・トレードオフ

- **計算量**: 基本構造はD* Liteのインクリメンタルな再計画(変化があった局所領域のみ更新)を踏襲するため、1回の再計画はO(変化の影響範囲)に収まる。各セルでの補間コスト計算がD* Liteより重いぶん定数倍は増える
- **経路の滑らかさ**: グリッドの格子に縛られないため、D* Liteのジグザグ経路と比べて明らかに自然で短い経路になる。Theta*が主に静的環境向けなのに対し、Field D*は動的な再計画とany-angle経路の両方を兼ね備える
- **実装の複雑さ**: 辺上の補間コスト計算には幾何学的な場合分け(隣接セルのコストが等しい場合、片方が通行不可の場合など)が多く、D* Liteそのものよりも実装が複雑になる
- **未知環境探査との相性**: 火星探査ローバー(MERミッション)で実際に採用された実績があるように、センサー範囲外の地形は未知として扱いながら進み、新たに分かった情報で経路を随時更新するロボティクスの用途に強い
- **使いどころ**: 惑星探査ローバーや屋外自律移動ロボットの経路計画、地形コストが滑らかに変化する(勾配や踏破性が連続的な)フィールドでのナビゲーション、センサーによる逐次的な地図構築(SLAM)と組み合わせた経路計画

## 実装例

```python
import heapq
import math
from typing import Callable

Point = tuple[int, int]


def interpolated_cost(g_s1: float, g_s2: float, cost1: float, cost2: float) -> float:
    """
    隣接する2セル(コストcost1, cost2)の間の辺を、g値g_s1, g_s2を持つ2頂点との
    組み合わせで通過するときの、単純化した補間コストを返す(Field D*のコア計算の簡略版)
    """
    if min(cost1, cost2) == math.inf:
        return min(g_s1 + max(cost1, cost2), g_s2 + max(cost1, cost2))
    if abs(g_s1 - g_s2) >= max(cost1, cost2):
        return min(g_s1, g_s2) + min(cost1, cost2)
    f = g_s1 - g_s2
    y = min(max(f / max(cost1, cost2), 0.0), 1.0)
    return y * cost2 + (1 - y) * cost1 + math.hypot(y, 1 - y) * min(cost1, cost2)


def field_d_star(
    start: Point,
    goal: Point,
    cell_cost: Callable[[Point], float],
    neighbors_fn: Callable[[Point], list[Point]],
    heuristic: Callable[[Point, Point], float],
) -> dict[Point, float]:
    """ゴールから逆伝播させた g コストマップを返す(再計画は簡略化して省略)"""
    g: dict[Point, float] = {goal: 0.0}
    open_heap: list[tuple[float, Point]] = [(heuristic(goal, start), goal)]
    visited: set[Point] = set()

    while open_heap:
        _, node = heapq.heappop(open_heap)
        if node in visited:
            continue
        visited.add(node)

        for nbr in neighbors_fn(node):
            cost = cell_cost(nbr)
            candidates = [g[node] + cost]
            for other in neighbors_fn(node):
                if other != nbr and other in g:
                    candidates.append(interpolated_cost(g[node], g[other], cost, cell_cost(other)))
            new_g = min(candidates)
            if new_g < g.get(nbr, math.inf):
                g[nbr] = new_g
                heapq.heappush(open_heap, (new_g + heuristic(nbr, start), nbr))
    return g
```

```typescript
type Point = [number, number];

function interpolatedCost(
  gS1: number,
  gS2: number,
  cost1: number,
  cost2: number,
): number {
  const maxCost = Math.max(cost1, cost2);
  if (Math.min(cost1, cost2) === Infinity) {
    return Math.min(gS1 + maxCost, gS2 + maxCost);
  }
  if (Math.abs(gS1 - gS2) >= maxCost) {
    return Math.min(gS1, gS2) + Math.min(cost1, cost2);
  }
  const f = gS1 - gS2;
  const y = Math.min(Math.max(f / maxCost, 0), 1);
  return (
    y * cost2 + (1 - y) * cost1 + Math.hypot(y, 1 - y) * Math.min(cost1, cost2)
  );
}

function key(p: Point): string {
  return `${p[0]},${p[1]}`;
}

function fieldDStar(
  start: Point,
  goal: Point,
  cellCost: (p: Point) => number,
  neighborsFn: (p: Point) => Point[],
  heuristic: (a: Point, b: Point) => number,
): Map<string, number> {
  const g = new Map<string, number>([[key(goal), 0]]);
  const visited = new Set<string>();
  const open: [number, Point][] = [[heuristic(goal, start), goal]];

  while (open.length > 0) {
    open.sort((a, b) => a[0] - b[0]);
    const [, node] = open.shift()!;
    const nodeKey = key(node);
    if (visited.has(nodeKey)) continue;
    visited.add(nodeKey);

    for (const nbr of neighborsFn(node)) {
      const cost = cellCost(nbr);
      const candidates = [g.get(nodeKey)! + cost];
      for (const other of neighborsFn(node)) {
        const otherKey = key(other);
        if (key(other) !== key(nbr) && g.has(otherKey)) {
          candidates.push(
            interpolatedCost(
              g.get(nodeKey)!,
              g.get(otherKey)!,
              cost,
              cellCost(other),
            ),
          );
        }
      }
      const newG = Math.min(...candidates);
      const nbrKey = key(nbr);
      if (newG < (g.get(nbrKey) ?? Infinity)) {
        g.set(nbrKey, newG);
        open.push([newG + heuristic(nbr, start), nbr]);
      }
    }
  }
  return g;
}
```
