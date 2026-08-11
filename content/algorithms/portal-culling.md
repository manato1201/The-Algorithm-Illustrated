---
name: ポータルカリング(Portal Culling)
category: CG・3Dレンダリング
subcategory: 可視性・最適化
complexity: O(訪問するセル数 + ポータル数)
summary: 屋内シーンを「部屋(セル)」と「ドア・窓などの開口部(ポータル)」に分割し、カメラのいる部屋からポータルを通して見える部屋だけを再帰的に辿ることで、壁の向こうの部屋を確実に描画対象から除外する。
---

## 概要

[階層的Zバッファ法によるオクルージョンカリング](/algorithms/hierarchical-z-occlusion-culling)は任意の3Dシーンに汎用的に使える可視性判定だが、建物内部のような**部屋がはっきりと区切られた構造**を持つシーンでは、その構造をそのまま利用したより効率的で確実なカリング手法が使える。ポータルカリングは、シーンを「部屋(セル)」の集合として分割し、部屋同士をつなぐドア・窓・通路といった「開口部(ポータル)」を明示的に定義しておく。カメラが今いる部屋から出発し、**ポータルを通して見える部屋だけを再帰的に辿って描画対象に加える**ことで、壁で完全に仕切られた見えない部屋を計算コストほぼゼロで確実に除外できる。1990年代の『Duke Nukem 3D』や『Quake』のような屋内シーン主体のゲームで実用化され、以後も建築ビジュアライゼーションなど室内シーンの定番の可視性判定手法として使われている。

## 仕組み

1. シーンをオフラインで「セル(部屋・区画)」に分割し、隣接するセル同士をつなぐ「ポータル」(通常は凸多角形で表現される開口部)を定義する。この分割はレベルデザイナーが手動で行うか、自動分割ツールで生成する
2. カメラが現在いるセルを特定する
3. そのセルの全てのジオメトリを描画対象に加える
4. そのセルが持つ各ポータルについて、**ポータルの形状をカメラ視錐台に投影**し、視錐台と交差する(=カメラから見える可能性がある)かを判定する。交差しなければ、そのポータルの先にある部屋全体を無条件に除外できる
5. ポータルが視錐台と交差する場合、そのポータルの投影形状を**新しい(より絞り込まれた)視錐台**とみなし、隣接するセルへ再帰的に3〜4の処理を行う(奥の部屋を見るには、手前のポータルという「窓」を通してのみ見えるため、視錐台がポータルの形状でどんどん絞り込まれていく)
6. 再帰が終了したセルの集合が、そのフレームで実際に描画すべき部屋の集合になる

## 特性・トレードオフ

- **確実で計算コストの低いカリング**: 壁で完全に仕切られた部屋の内部は、ポータルを通して視錐台と交差しない限り絶対に見えないという幾何学的な事実に基づくため、[階層的Zバッファ法](/algorithms/hierarchical-z-occlusion-culling)のような近似ではなく、確実に見えない部屋を漏れなく除外できる。判定コストも訪問したセル・ポータルの数に比例するだけで軽量
- **屋内構造を前提とする適用範囲の限定**: ポータルカリングは「シーンが明確に区切られた部屋とドアの構造を持つ」ことを前提とする。オープンフィールドのような屋外シーンには自然には適用できず、屋外シーンには[フラスタムカリング](/algorithms/frustum-culling)や[階層的Zバッファ法](/algorithms/hierarchical-z-occlusion-culling)、あるいはBSPツリーのような別の空間分割手法が使われる
- **セル・ポータルの設計コスト**: レベルデザイナーがシーンをセルとポータルに分割する作業(または自動分割ツールの精度)が、カリングの効果を大きく左右する。部屋の分割が粗すぎると1つのセルに多くのジオメトリが含まれてカリングの効果が薄れ、細かすぎるとポータルの判定コストが増える
- **使いどころ**: 屋内シーン主体の3Dゲーム(初期のFPSゲームで広く採用)、建築・室内ビジュアライゼーションのウォークスルー、屋内外を行き来するオープンワールドゲームでの屋内パートの最適化、VRアプリケーションの室内シーン(フレームレート維持がクリティカルな用途)

## 実装例

```python
from dataclasses import dataclass

@dataclass
class Portal:
    target_cell: int
    # ポータルの投影範囲を単純化してxy平面上の矩形(x0, y0, x1, y1)で表す
    bounds: tuple[float, float, float, float]

def intersect_frustum(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> tuple[float, float, float, float] | None:
    x0, y0, x1, y1 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    if x0 >= x1 or y0 >= y1:
        return None
    return (x0, y0, x1, y1)

def portal_cull(
    start_cell: int, initial_frustum: tuple[float, float, float, float],
    portals_by_cell: dict[int, list[Portal]],
) -> set[int]:
    visible_cells: set[int] = set()

    def visit(cell: int, frustum: tuple[float, float, float, float]) -> None:
        if cell in visible_cells:
            return
        visible_cells.add(cell)
        for portal in portals_by_cell.get(cell, []):
            clipped = intersect_frustum(frustum, portal.bounds)
            if clipped is not None:
                visit(portal.target_cell, clipped)

    visit(start_cell, initial_frustum)
    return visible_cells
```

```typescript
type Portal = { targetCell: number; bounds: [number, number, number, number] };

function intersectFrustum(
  a: [number, number, number, number],
  b: [number, number, number, number],
): [number, number, number, number] | null {
  const x0 = Math.max(a[0], b[0]),
    y0 = Math.max(a[1], b[1]);
  const x1 = Math.min(a[2], b[2]),
    y1 = Math.min(a[3], b[3]);
  if (x0 >= x1 || y0 >= y1) return null;
  return [x0, y0, x1, y1];
}

function portalCull(
  startCell: number,
  initialFrustum: [number, number, number, number],
  portalsByCell: Map<number, Portal[]>,
): Set<number> {
  const visibleCells = new Set<number>();

  function visit(
    cell: number,
    frustum: [number, number, number, number],
  ): void {
    if (visibleCells.has(cell)) return;
    visibleCells.add(cell);
    for (const portal of portalsByCell.get(cell) ?? []) {
      const clipped = intersectFrustum(frustum, portal.bounds);
      if (clipped !== null) visit(portal.targetCell, clipped);
    }
  }

  visit(startCell, initialFrustum);
  return visibleCells;
}
```

```cpp
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <array>
#include <optional>
#include <algorithm>

struct Portal {
    int targetCell;
    std::array<double, 4> bounds; // x0, y0, x1, y1
};

std::optional<std::array<double, 4>> intersectFrustum(const std::array<double, 4>& a, const std::array<double, 4>& b) {
    double x0 = std::max(a[0], b[0]), y0 = std::max(a[1], b[1]);
    double x1 = std::min(a[2], b[2]), y1 = std::min(a[3], b[3]);
    if (x0 >= x1 || y0 >= y1) return std::nullopt;
    return std::array<double, 4>{x0, y0, x1, y1};
}

void visitCell(
    int cell, const std::array<double, 4>& frustum,
    const std::unordered_map<int, std::vector<Portal>>& portalsByCell,
    std::unordered_set<int>& visibleCells) {
    if (visibleCells.count(cell)) return;
    visibleCells.insert(cell);
    auto it = portalsByCell.find(cell);
    if (it == portalsByCell.end()) return;
    for (auto& portal : it->second) {
        auto clipped = intersectFrustum(frustum, portal.bounds);
        if (clipped) visitCell(portal.targetCell, *clipped, portalsByCell, visibleCells);
    }
}

std::unordered_set<int> portalCull(
    int startCell, const std::array<double, 4>& initialFrustum,
    const std::unordered_map<int, std::vector<Portal>>& portalsByCell) {
    std::unordered_set<int> visibleCells;
    visitCell(startCell, initialFrustum, portalsByCell, visibleCells);
    return visibleCells;
}
```

```rust
use std::collections::{HashMap, HashSet};

struct Portal {
    target_cell: i32,
    bounds: [f64; 4],
}

fn intersect_frustum(a: [f64; 4], b: [f64; 4]) -> Option<[f64; 4]> {
    let x0 = a[0].max(b[0]);
    let y0 = a[1].max(b[1]);
    let x1 = a[2].min(b[2]);
    let y1 = a[3].min(b[3]);
    if x0 >= x1 || y0 >= y1 {
        None
    } else {
        Some([x0, y0, x1, y1])
    }
}

fn visit_cell(
    cell: i32, frustum: [f64; 4], portals_by_cell: &HashMap<i32, Vec<Portal>>, visible_cells: &mut HashSet<i32>,
) {
    if visible_cells.contains(&cell) {
        return;
    }
    visible_cells.insert(cell);
    if let Some(portals) = portals_by_cell.get(&cell) {
        for portal in portals {
            if let Some(clipped) = intersect_frustum(frustum, portal.bounds) {
                visit_cell(portal.target_cell, clipped, portals_by_cell, visible_cells);
            }
        }
    }
}

fn portal_cull(start_cell: i32, initial_frustum: [f64; 4], portals_by_cell: &HashMap<i32, Vec<Portal>>) -> HashSet<i32> {
    let mut visible_cells = HashSet::new();
    visit_cell(start_cell, initial_frustum, portals_by_cell, &mut visible_cells);
    visible_cells
}
```

```csharp
class Portal
{
    public int TargetCell;
    public (double x0, double y0, double x1, double y1) Bounds;
}

static (double, double, double, double)? IntersectFrustum((double x0, double y0, double x1, double y1) a, (double x0, double y0, double x1, double y1) b)
{
    double x0 = Math.Max(a.x0, b.x0), y0 = Math.Max(a.y0, b.y0);
    double x1 = Math.Min(a.x1, b.x1), y1 = Math.Min(a.y1, b.y1);
    if (x0 >= x1 || y0 >= y1) return null;
    return (x0, y0, x1, y1);
}

static void VisitCell(int cell, (double, double, double, double) frustum, Dictionary<int, List<Portal>> portalsByCell, HashSet<int> visibleCells)
{
    if (!visibleCells.Add(cell)) return;
    if (!portalsByCell.TryGetValue(cell, out var portals)) return;
    foreach (var portal in portals)
    {
        var clipped = IntersectFrustum(frustum, portal.Bounds);
        if (clipped.HasValue) VisitCell(portal.TargetCell, clipped.Value, portalsByCell, visibleCells);
    }
}

static HashSet<int> PortalCull(int startCell, (double, double, double, double) initialFrustum, Dictionary<int, List<Portal>> portalsByCell)
{
    var visibleCells = new HashSet<int>();
    VisitCell(startCell, initialFrustum, portalsByCell, visibleCells);
    return visibleCells;
}
```
