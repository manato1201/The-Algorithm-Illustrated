---
name: Watershed法(分水嶺法)
category: コンピュータビジョン
subcategory: セグメンテーション・追跡
complexity: O(n log n)(n画素、優先度キュー実装)
summary: 画像の明るさを地形の標高に見立て、水を注いで谷ごとに集水域を分けるように、隣接する物体同士を境界で分離する画像分割法。
---

## 概要

画像を「物体ごとの領域」に分割するセグメンテーションは、単純な閾値処理だけでは、隣接する2つの物体がくっついて写っている場合(重なり合う細胞、密集した粒状の物体など)にうまく分離できないことが多い。Watershed法は、画像の明るさ(または勾配の強さ)を地形の標高とみなし、それぞれの谷底(局所的な最小値)から水を少しずつ注いでいくシミュレーションを行う——異なる谷から染み出した水がぶつかる稜線(分水嶺)を、物体同士の境界線として採用するという、地理学の比喩を巧みに使ったアルゴリズムである。

## 仕組み

1. 画像の勾配マップ(輪郭が強いほど標高が高い地形として扱う、[ソーベルフィルタ](/algorithms/sobel-filter)等で計算)を用意する
2. 局所的な最小値(谷底、通常は物体の内部の平坦な領域)を見つけ、それぞれに異なるラベル(マーカー)を割り当てる
3. 標高の低い順に画素を処理していく優先度キューを使い、各谷から「水位」を徐々に上げていくようにラベルを周囲の未処理画素へ伝播させる
4. ある画素に隣接する複数の異なるラベルの領域からの水が同時に到達しそうになったら、その画素は「分水嶺」(境界線)としてどちらのラベルにも属させず、そこで処理を止める
5. 全画素が処理されるまで続けると、画像は谷ごとの領域(集水域)に分割され、その境界線が物体同士の輪郭になる

素朴にこれを画像全体の明るさにそのまま適用すると、ノイズによって無数の小さな谷ができ、過剰に細かく分割されてしまう(over-segmentation)。実用の実装では、事前に注目したい物体の内部・背景に手動または自動でマーカーを置く「マーカー制御Watershed法」がよく使われる。

## 特性・トレードオフ

- **計算量**: 優先度キューを使った実装で`O(n log n)`(`n`は画素数)。全画素を1回ずつ処理する効率的なアルゴリズム
- **過剰分割の問題**: ノイズの多い画像にそのまま適用すると、無数の小さな極小値がそれぞれ独立した領域になってしまい、意味のある物体単位の分割にならないことが多い。事前の平滑化やマーカーによる制御が実用上ほぼ必須
- **接触・重なり合う物体の分離が得意**: 単純な閾値処理では1つの塊として認識されてしまう、接触した細胞や粒子を個別の領域に分離できるのが最大の強み
- **使いどころ**: 医療画像における細胞・組織の個別分離、工業製品の粒状物体のカウント・検査、地図の集水域解析(元々の地理学的な意味そのものの応用)、より高度なセマンティックセグメンテーション手法の前処理・後処理としても使われる

## 実装例

2つの谷底(マーカー)を持つ5×9の小さな標高マップに対してマーカー制御Watershed法を実行し、各画素が「どちらのマーカーに近いか」に応じて正しく2領域に分割され、等距離となる境界列が分水嶺(-1)として検出されることを検証する。

```python
import heapq


def watershed(elevation: list[list[int]], markers: list[list[int]]) -> list[list[int]]:
    rows, cols = len(elevation), len(elevation[0])
    labels = [row[:] for row in markers]
    WSHED = -1
    pq = []
    counter = 0

    def neighbors(r, c):
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                yield nr, nc

    for r in range(rows):
        for c in range(cols):
            if labels[r][c] > 0:
                for nr, nc in neighbors(r, c):
                    if labels[nr][nc] == 0:
                        heapq.heappush(pq, (elevation[nr][nc], counter, nr, nc))
                        counter += 1

    while pq:
        _, _, r, c = heapq.heappop(pq)
        if labels[r][c] != 0:
            continue
        neighbor_labels = {labels[nr][nc] for nr, nc in neighbors(r, c) if labels[nr][nc] > 0}
        if len(neighbor_labels) == 1:
            labels[r][c] = neighbor_labels.pop()
            for nr, nc in neighbors(r, c):
                if labels[nr][nc] == 0:
                    heapq.heappush(pq, (elevation[nr][nc], counter, nr, nc))
                    counter += 1
        elif len(neighbor_labels) > 1:
            # 複数の領域からの水が同時に到達 => 分水嶺(境界)として確定
            labels[r][c] = WSHED
    return labels
```

```typescript
type Cell = [number, number];

function neighborsOf(r: number, c: number, rows: number, cols: number): Cell[] {
  const result: Cell[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push([nr, nc]);
  }
  return result;
}

function watershed(elevation: number[][], markers: number[][]): number[][] {
  const rows = elevation.length;
  const cols = elevation[0].length;
  const labels = markers.map((row) => [...row]);
  const WSHED = -1;
  const pq: Array<[number, number, number, number]> = []; // [elevation, insertion順, r, c]
  let counter = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (labels[r][c] > 0) {
        for (const [nr, nc] of neighborsOf(r, c, rows, cols)) {
          if (labels[nr][nc] === 0) pq.push([elevation[nr][nc], counter++, nr, nc]);
        }
      }
    }
  }

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const [, , r, c] = pq.shift()!;
    if (labels[r][c] !== 0) continue;
    const neighborLabels = new Set<number>();
    for (const [nr, nc] of neighborsOf(r, c, rows, cols)) {
      if (labels[nr][nc] > 0) neighborLabels.add(labels[nr][nc]);
    }
    if (neighborLabels.size === 1) {
      labels[r][c] = [...neighborLabels][0];
      for (const [nr, nc] of neighborsOf(r, c, rows, cols)) {
        if (labels[nr][nc] === 0) pq.push([elevation[nr][nc], counter++, nr, nc]);
      }
    } else if (neighborLabels.size > 1) {
      labels[r][c] = WSHED;
    }
  }
  return labels;
}
```

```cpp
#include <vector>
#include <queue>
#include <set>
#include <array>

std::vector<std::vector<int>> watershed(const std::vector<std::vector<int>>& elevation,
                                         const std::vector<std::vector<int>>& markers) {
    int rows = static_cast<int>(elevation.size());
    int cols = static_cast<int>(elevation[0].size());
    auto labels = markers;
    const int WSHED = -1;
    using Entry = std::tuple<int, int, int, int>; // elevation, order, r, c
    std::priority_queue<Entry, std::vector<Entry>, std::greater<>> pq;
    int counter = 0;
    static const std::array<std::pair<int, int>, 4> dirs{{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}};

    auto forEachNeighbor = [&](int r, int c, auto&& fn) {
        for (auto [dr, dc] : dirs) {
            int nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
        }
    };

    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (labels[r][c] > 0) {
                forEachNeighbor(r, c, [&](int nr, int nc) {
                    if (labels[nr][nc] == 0) pq.push({elevation[nr][nc], counter++, nr, nc});
                });
            }
        }
    }

    while (!pq.empty()) {
        auto [elev, order, r, c] = pq.top();
        pq.pop();
        if (labels[r][c] != 0) continue;
        std::set<int> neighborLabels;
        forEachNeighbor(r, c, [&](int nr, int nc) {
            if (labels[nr][nc] > 0) neighborLabels.insert(labels[nr][nc]);
        });
        if (neighborLabels.size() == 1) {
            labels[r][c] = *neighborLabels.begin();
            forEachNeighbor(r, c, [&](int nr, int nc) {
                if (labels[nr][nc] == 0) pq.push({elevation[nr][nc], counter++, nr, nc});
            });
        } else if (neighborLabels.size() > 1) {
            labels[r][c] = WSHED;
        }
    }
    return labels;
}
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Ordering;
use std::collections::HashSet;

#[derive(Eq, PartialEq)]
struct Entry {
    elevation: i32,
    order: i32,
    r: usize,
    c: usize,
}

impl Ord for Entry {
    fn cmp(&self, other: &Self) -> Ordering {
        other.elevation.cmp(&self.elevation).then(other.order.cmp(&self.order)) // 最小ヒープ化
    }
}
impl PartialOrd for Entry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn neighbors(r: usize, c: usize, rows: usize, cols: usize) -> Vec<(usize, usize)> {
    let mut result = Vec::new();
    for (dr, dc) in [(-1i32, 0i32), (1, 0), (0, -1), (0, 1)] {
        let nr = r as i32 + dr;
        let nc = c as i32 + dc;
        if nr >= 0 && (nr as usize) < rows && nc >= 0 && (nc as usize) < cols {
            result.push((nr as usize, nc as usize));
        }
    }
    result
}

fn watershed(elevation: &[Vec<i32>], markers: &[Vec<i32>]) -> Vec<Vec<i32>> {
    let rows = elevation.len();
    let cols = elevation[0].len();
    let mut labels = markers.to_vec();
    const WSHED: i32 = -1;
    let mut pq = BinaryHeap::new();
    let mut counter = 0;

    for r in 0..rows {
        for c in 0..cols {
            if labels[r][c] > 0 {
                for (nr, nc) in neighbors(r, c, rows, cols) {
                    if labels[nr][nc] == 0 {
                        pq.push(Entry { elevation: elevation[nr][nc], order: counter, r: nr, c: nc });
                        counter += 1;
                    }
                }
            }
        }
    }

    while let Some(Entry { r, c, .. }) = pq.pop() {
        if labels[r][c] != 0 {
            continue;
        }
        let mut neighbor_labels = HashSet::new();
        for (nr, nc) in neighbors(r, c, rows, cols) {
            if labels[nr][nc] > 0 {
                neighbor_labels.insert(labels[nr][nc]);
            }
        }
        if neighbor_labels.len() == 1 {
            labels[r][c] = *neighbor_labels.iter().next().unwrap();
            for (nr, nc) in neighbors(r, c, rows, cols) {
                if labels[nr][nc] == 0 {
                    pq.push(Entry { elevation: elevation[nr][nc], order: counter, r: nr, c: nc });
                    counter += 1;
                }
            }
        } else if neighbor_labels.len() > 1 {
            labels[r][c] = WSHED;
        }
    }
    labels
}
```

```csharp
static IEnumerable<(int, int)> Neighbors(int r, int c, int rows, int cols)
{
    foreach (var (dr, dc) in new[] { (-1, 0), (1, 0), (0, -1), (0, 1) })
    {
        int nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) yield return (nr, nc);
    }
}

static int[][] Watershed(int[][] elevation, int[][] markers)
{
    int rows = elevation.Length, cols = elevation[0].Length;
    var labels = markers.Select(row => (int[])row.Clone()).ToArray();
    const int WSHED = -1;
    var pq = new List<(int elev, int order, int r, int c)>();
    int counter = 0;

    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
            if (labels[r][c] > 0)
                foreach (var (nr, nc) in Neighbors(r, c, rows, cols))
                    if (labels[nr][nc] == 0)
                        pq.Add((elevation[nr][nc], counter++, nr, nc));

    while (pq.Count > 0)
    {
        pq.Sort((a, b) => a.elev != b.elev ? a.elev.CompareTo(b.elev) : a.order.CompareTo(b.order));
        var (elev, order, r, c) = pq[0];
        pq.RemoveAt(0);
        if (labels[r][c] != 0) continue;
        var neighborLabels = new HashSet<int>();
        foreach (var (nr, nc) in Neighbors(r, c, rows, cols))
            if (labels[nr][nc] > 0) neighborLabels.Add(labels[nr][nc]);
        if (neighborLabels.Count == 1)
        {
            labels[r][c] = neighborLabels.First();
            foreach (var (nr, nc) in Neighbors(r, c, rows, cols))
                if (labels[nr][nc] == 0) pq.Add((elevation[nr][nc], counter++, nr, nc));
        }
        else if (neighborLabels.Count > 1)
        {
            labels[r][c] = WSHED;
        }
    }
    return labels;
}
```
