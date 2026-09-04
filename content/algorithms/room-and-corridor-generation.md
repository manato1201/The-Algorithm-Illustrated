---
name: 部屋と通路によるダンジョン生成 (Room and Corridor Generation)
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(n log n)(部屋数nに対し、通路接続に最小全域木を使う場合)
summary: 矩形の部屋をランダムに配置し最小全域木などで通路を結ぶ、ローグライクで定番の離散的ダンジョン生成手法。
---

## 概要

[ドランカーズウォーク](/algorithms/drunkards-walk-cave-generation)のようなランダムウォーク系のアルゴリズムが有機的で不規則な洞窟形状を作るのに対し、Rogueやその系譜のローグライクゲームで採用されてきた部屋と通路によるダンジョン生成は、明確に区切られた矩形の「部屋」とそれらをつなぐ「通路」という、人工建造物らしい構造を生み出す。基本的な流れは、マップ上にランダムなサイズ・位置の矩形部屋を重ならないように複数配置し、それらの部屋の中心点(あるいは出入口)同士を通路でつなぐことでプレイ可能なマップを構成する、というものである。部屋の配置に[ポアソンディスクサンプリング](/algorithms/poisson-disk-sampling)やBSP(二分空間分割)、通路の接続に最小全域木やドロネー三角形分割を使うなど、多くのバリエーションがあり、探索性・迷いやすさ・戦闘バランスを調整しやすいことから現在も広く使われている。

## 仕組み

1. マップの範囲内に、幅・高さをランダムに変えた矩形部屋を複数個生成する。既存の部屋と重なる、あるいはマップ境界からはみ出す候補は棄却し、指定数の部屋が配置できるまで繰り返す(またはBSPで領域を再帰的に分割し各葉領域に1部屋ずつ配置する)
2. 各部屋の中心点(または代表点)をノードとするグラフを考え、部屋同士の距離を辺の重みとする完全グラフ、あるいはドロネー三角形分割で得られる疎なグラフを構築する
3. このグラフに対して[最小全域木](/algorithms/kruskal)を計算し、全ての部屋が(木構造で)連結されるために必要最小限の通路の骨格を得る
4. 最小全域木だけでは一本道になり迷路として単調なため、木に含まれない辺の一部をランダムに(あるいはドロネー三角形分割の残りの辺から)追加し、通路にループ(周回できる経路)を作ることでゲームプレイに幅を持たせる
5. 選ばれた各辺について、部屋の中心同士をL字型やジグザグの通路(あるいはA*で壁を避けた経路)としてタイルに書き出し、最終的なマップを完成させる

## 特性・トレードオフ

- **計算量**: 部屋数`n`に対し、完全グラフに最小全域木(クラスカル法)を適用する場合`O(n^2 log n)`、ドロネー三角形分割で辺数を`O(n)`に抑えれば`O(n log n)`。実用的な部屋数(数十〜数百)では十分高速
- **構造の明瞭さ**: 洞窟生成系のアルゴリズムに比べ、部屋・通路・行き止まりが明確に区別されるため、ダンジョンの部屋ごとにイベントや敵配置を割り当てる設計と相性が良い
- **接続性の保証**: 最小全域木を使うことで全ての部屋への到達可能性を数学的に保証できる。素朴なランダム接続では孤立した部屋が生まれるリスクがある
- **使いどころ**: ローグライクゲーム(Rogue、NetHack系譜)、ダンジョンクロウラー、見下ろし型RPGのマップ生成。人工的な建造物(遺跡・基地)の表現に向き、自然な洞窟には[ドランカーズウォーク](/algorithms/drunkards-walk-cave-generation)のような不規則生成手法が適する

## 実装例

矩形部屋をランダム配置し、部屋の中心を結ぶグラフに最小全域木(クラスカル法の簡易版)を適用して通路を決める骨格を示す。

```python
import random
from dataclasses import dataclass


@dataclass
class Room:
    x: int
    y: int
    w: int
    h: int

    def center(self) -> tuple[float, float]:
        return self.x + self.w / 2, self.y + self.h / 2

    def overlaps(self, other: "Room", margin: int = 1) -> bool:
        return not (
            self.x + self.w + margin < other.x
            or other.x + other.w + margin < self.x
            or self.y + self.h + margin < other.y
            or other.y + other.h + margin < self.y
        )


def generate_rooms(map_w: int, map_h: int, count: int, seed: int | None = None) -> list[Room]:
    rng = random.Random(seed)
    rooms: list[Room] = []
    attempts = 0
    while len(rooms) < count and attempts < count * 50:
        attempts += 1
        w, h = rng.randint(4, 8), rng.randint(4, 8)
        x, y = rng.randint(0, map_w - w - 1), rng.randint(0, map_h - h - 1)
        candidate = Room(x, y, w, h)
        if not any(candidate.overlaps(r) for r in rooms):
            rooms.append(candidate)
    return rooms


def minimum_spanning_corridors(rooms: list[Room]) -> list[tuple[int, int]]:
    """部屋の中心間の距離を重みとした完全グラフにプリム法を適用し、通路として結ぶ辺(部屋indexペア)を返す"""
    n = len(rooms)
    if n <= 1:
        return []
    in_tree = [False] * n
    in_tree[0] = True
    edges: list[tuple[int, int]] = []

    for _ in range(n - 1):
        best_dist = float("inf")
        best_pair = (-1, -1)
        for i in range(n):
            if not in_tree[i]:
                continue
            for j in range(n):
                if in_tree[j]:
                    continue
                ci, cj = rooms[i].center(), rooms[j].center()
                dist = (ci[0] - cj[0]) ** 2 + (ci[1] - cj[1]) ** 2
                if dist < best_dist:
                    best_dist, best_pair = dist, (i, j)
        in_tree[best_pair[1]] = True
        edges.append(best_pair)

    return edges
```

```typescript
interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

function center(r: Room): [number, number] {
  return [r.x + r.w / 2, r.y + r.h / 2];
}

function overlaps(a: Room, b: Room, margin = 1): boolean {
  return !(
    a.x + a.w + margin < b.x ||
    b.x + b.w + margin < a.x ||
    a.y + a.h + margin < b.y ||
    b.y + b.h + margin < a.y
  );
}

function generateRooms(mapW: number, mapH: number, count: number): Room[] {
  const rooms: Room[] = [];
  let attempts = 0;
  while (rooms.length < count && attempts < count * 50) {
    attempts++;
    const w = 4 + Math.floor(Math.random() * 5);
    const h = 4 + Math.floor(Math.random() * 5);
    const x = Math.floor(Math.random() * (mapW - w - 1));
    const y = Math.floor(Math.random() * (mapH - h - 1));
    const candidate: Room = { x, y, w, h };
    if (!rooms.some((r) => overlaps(candidate, r))) rooms.push(candidate);
  }
  return rooms;
}

function minimumSpanningCorridors(rooms: Room[]): Array<[number, number]> {
  // 部屋の中心間の距離を重みとした完全グラフにプリム法を適用し、通路として結ぶ辺(部屋indexペア)を返す
  const n = rooms.length;
  if (n <= 1) return [];
  const inTree = new Array<boolean>(n).fill(false);
  inTree[0] = true;
  const edges: Array<[number, number]> = [];

  for (let step = 0; step < n - 1; step++) {
    let bestDist = Infinity;
    let bestPair: [number, number] = [-1, -1];
    for (let i = 0; i < n; i++) {
      if (!inTree[i]) continue;
      for (let j = 0; j < n; j++) {
        if (inTree[j]) continue;
        const [cix, ciy] = center(rooms[i]);
        const [cjx, cjy] = center(rooms[j]);
        const dist = (cix - cjx) ** 2 + (ciy - cjy) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestPair = [i, j];
        }
      }
    }
    inTree[bestPair[1]] = true;
    edges.push(bestPair);
  }

  return edges;
}
```
