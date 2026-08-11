---
name: 影響マップ(Influence Map)
category: キャラクターAI・空間AI
subcategory: 空間認識・知覚
complexity: O(w・h・k)(w×hはマップの解像度、kは影響源の数)
summary: マップ上の各セルに、味方・敵などの影響源からの「勢力の強さ」を距離減衰させながら重ね合わせて記録し、戦場全体の勢力図を数値として可視化・活用する空間認識の基礎技術。
---

## 概要

[レイキャストによる視線判定](/algorithms/line-of-sight-raycasting)が「自分から特定の対象が見えるか」という1対1の判定を扱うのに対し、影響マップは「マップ全体を通してどこが自軍優勢か、どこが危険か」という**面としての戦況把握**を扱う。各ユニット(味方・敵の戦力、拠点など)を「影響源」とみなし、その影響力を中心から周囲へ距離とともに減衰させながらグリッド上に重ね合わせることで、「今どこが安全で、どこが危険か」「どこを攻めれば勢力を拡大できるか」を数値マップとして得る。RTS(リアルタイムストラテジー)ゲームのAIが陣地の攻めどころを判断する古典的な手法として知られ、より高度な戦術判断の土台になる。

## 仕組み

1. マップをグリッド(セルの集合)として離散化する
2. 各影響源(ユニット、拠点など)について、その位置を中心とした「影響力」の値と、影響が届く範囲(半径)を定義する
3. 各セルについて、そのセルから各影響源までの距離に応じて影響力を**減衰**させながら加算する。減衰関数は線形減衰、指数減衰などが使われ、`influence(cell) = Σ_source (source_strength / (1 + distance(cell, source)))`のような形で計算される
4. 味方の影響源は正の値、敵の影響源は負の値として加算することで、各セルの最終的な値が「その地点がどれだけ自軍優勢か(正)、敵優勢か(負)」を表す**勢力マップ**になる
5. 得られた影響マップを使って、「値が0に近い(拮抗している)セルを国境線とみなす」「自軍が優勢だが敵の影響も一定以下のセルを次の進軍先の候補にする」といった戦術判断を、マップ上の数値を参照するだけで行える

## 特性・トレードオフ

- **個々のユニットのミクロな判断とマクロな戦況把握の橋渡し**: 個々のユニットが「近くの敵を攻撃する」というミクロな判断だけで動くAIに対し、影響マップは戦場全体を俯瞰した数値情報を提供することで、「どこを守るべきか」「どこが手薄か」といったマクロな戦術判断を可能にする
- **更新コストと解像度のトレードオフ**: 影響マップは通常、フレームごとではなく一定間隔で再計算される(全ユニットの移動のたびに毎フレーム再計算すると計算コストが大きい)。グリッドの解像度を粗くすることで計算コストを抑えられるが、細かい局地的な状況の反映が犠牲になる
- **複数のレイヤーの重ね合わせ**: 実務では「軍事的な勢力」だけでなく「資源の豊富さ」「移動のしやすさ」など複数の影響マップを別レイヤーとして計算し、それらを重み付けして合成した「総合評価マップ」を戦術判断に使うことが多い。この考え方は[効用ベースAI](/algorithms/utility-ai)の評価カーブの発想とも通じる
- **使いどころ**: RTSゲームのマクロ戦術AI(『Supreme Commander』のAIで有名になった手法)、タワーディフェンスゲームの防衛ライン評価、ボードゲームAIの盤面評価、都市シミュレーションにおける勢力・治安の可視化

## 実装例

```python
def build_influence_map(
    width: int, height: int, sources: list[tuple[int, int, float]],
) -> list[list[float]]:
    """sources: [(x, y, strength), ...] strengthは正なら味方、負なら敵の影響力。"""
    grid = [[0.0] * width for _ in range(height)]
    for sx, sy, strength in sources:
        for y in range(height):
            for x in range(width):
                distance = ((x - sx) ** 2 + (y - sy) ** 2) ** 0.5
                grid[y][x] += strength / (1.0 + distance)
    return grid

def find_frontier_cells(influence: list[list[float]], threshold: float = 1.0) -> list[tuple[int, int]]:
    """勢力が拮抗している(絶対値が小さい)セルを国境線候補として抽出する。"""
    frontier = []
    for y, row in enumerate(influence):
        for x, value in enumerate(row):
            if abs(value) < threshold:
                frontier.append((x, y))
    return frontier
```

```typescript
function buildInfluenceMap(
  width: number, height: number, sources: [number, number, number][],
): number[][] {
  const grid: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  for (const [sx, sy, strength] of sources) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distance = Math.hypot(x - sx, y - sy);
        grid[y][x] += strength / (1.0 + distance);
      }
    }
  }
  return grid;
}

function findFrontierCells(influence: number[][], threshold = 1.0): [number, number][] {
  const frontier: [number, number][] = [];
  influence.forEach((row, y) => {
    row.forEach((value, x) => {
      if (Math.abs(value) < threshold) frontier.push([x, y]);
    });
  });
  return frontier;
}
```

```cpp
#include <vector>
#include <tuple>
#include <cmath>

std::vector<std::vector<double>> buildInfluenceMap(
    int width, int height, const std::vector<std::tuple<int, int, double>>& sources) {
    std::vector<std::vector<double>> grid(height, std::vector<double>(width, 0.0));
    for (auto& [sx, sy, strength] : sources) {
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                double distance = std::hypot(x - sx, y - sy);
                grid[y][x] += strength / (1.0 + distance);
            }
        }
    }
    return grid;
}

std::vector<std::pair<int, int>> findFrontierCells(const std::vector<std::vector<double>>& influence, double threshold = 1.0) {
    std::vector<std::pair<int, int>> frontier;
    for (size_t y = 0; y < influence.size(); y++) {
        for (size_t x = 0; x < influence[y].size(); x++) {
            if (std::abs(influence[y][x]) < threshold) frontier.emplace_back(x, y);
        }
    }
    return frontier;
}
```

```rust
fn build_influence_map(width: usize, height: usize, sources: &[(i32, i32, f64)]) -> Vec<Vec<f64>> {
    let mut grid = vec![vec![0.0; width]; height];
    for &(sx, sy, strength) in sources {
        for y in 0..height {
            for x in 0..width {
                let dx = x as f64 - sx as f64;
                let dy = y as f64 - sy as f64;
                let distance = (dx * dx + dy * dy).sqrt();
                grid[y][x] += strength / (1.0 + distance);
            }
        }
    }
    grid
}

fn find_frontier_cells(influence: &[Vec<f64>], threshold: f64) -> Vec<(usize, usize)> {
    let mut frontier = Vec::new();
    for (y, row) in influence.iter().enumerate() {
        for (x, &value) in row.iter().enumerate() {
            if value.abs() < threshold {
                frontier.push((x, y));
            }
        }
    }
    frontier
}
```

```csharp
static double[][] BuildInfluenceMap(int width, int height, List<(int x, int y, double strength)> sources)
{
    var grid = new double[height][];
    for (int y = 0; y < height; y++) grid[y] = new double[width];

    foreach (var (sx, sy, strength) in sources)
    {
        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                double distance = Math.Sqrt(Math.Pow(x - sx, 2) + Math.Pow(y - sy, 2));
                grid[y][x] += strength / (1.0 + distance);
            }
        }
    }
    return grid;
}

static List<(int x, int y)> FindFrontierCells(double[][] influence, double threshold = 1.0)
{
    var frontier = new List<(int, int)>();
    for (int y = 0; y < influence.Length; y++)
    {
        for (int x = 0; x < influence[y].Length; x++)
        {
            if (Math.Abs(influence[y][x]) < threshold) frontier.Add((x, y));
        }
    }
    return frontier;
}
```
