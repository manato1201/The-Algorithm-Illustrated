---
name: ライフゲーム(Conway's Game of Life)
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: O(セル数)(1世代)
summary: 生死2状態と近傍数だけの単純な規則から、グライダーのような自己組織化パターンが生まれるセル・オートマトンの代表例。
---

## 概要

1970年に数学者ジョン・コンウェイが考案した、「プレイヤーが操作しない」という意味で異色の"ゲーム"。グリッド上の各マス(セル)は「生」か「死」の2状態しか持たず、隣接する8マスの生死の数だけで次の世代の状態が決まる、というごく単純なルールにもかかわらず、初期配置次第で驚くほど複雑で予測不能なパターンが生まれる。セル・オートマトン(セル状の自動機械)という計算モデルの、最も有名な代表例。

## 仕組み

各セルは8近傍(上下左右斜め)の生きているセルの数を数え、以下のルールで次の世代の状態が決まる:

1. **過疎**: 生きたセルの近傍が2未満なら、次の世代で死ぬ(孤立)
2. **生存**: 生きたセルの近傍がちょうど2か3なら、次の世代でも生き続ける
3. **過密**: 生きたセルの近傍が4以上なら、次の世代で死ぬ(過密による衰退)
4. **誕生**: 死んでいたセルの近傍がちょうど3なら、次の世代で生まれる

全てのセルについて**同時に**この判定を行い、盤面全体を一気に次の世代へ進める。この単純な規則から、静止したまま変化しない「固定物体」、周期的に振動する「振動子」、そして盤面上を移動していく「グライダー」のような、驚くほど組織だったパターンが自然に発生する。

## 特性・トレードオフ

- **計算量**: 1世代の更新は全セル数に比例するO(セル数)。ただし盤面が理論上は無限に広がりうるため、実装上は有限の範囲か、変化のある領域だけを追跡する工夫が必要になる
- **チューリング完全性**: 驚くべきことに、ライフゲームのパターンの組み合わせだけで、任意の計算(論理ゲート、メモリ、さらにはCPU全体)を構築できることが示されている——単純なルールが持つ計算能力の限界のなさを象徴する結果
- **初期状態への鋭敏な依存性**: わずかに異なる初期配置でも、その後の展開が全く異なるものになることがあり、カオス的な性質を垣間見せる。同時に、パターンによっては安定した予測可能な挙動(グライダー銃が周期的にグライダーを生成し続けるなど)も存在する
- **使いどころ**: 直接の実務応用よりも、複雑系・創発・自己組織化といった概念を学ぶ教育的なデモンストレーションとして、また計算理論(チューリング完全性の具体例)やアートの題材として広く使われている

## 実装例

```python
def life_step(grid: list[list[int]]) -> list[list[int]]:
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    new_grid = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            alive = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                        alive += 1
            if grid[r][c] == 1:
                new_grid[r][c] = 1 if alive in (2, 3) else 0
            else:
                new_grid[r][c] = 1 if alive == 3 else 0
    return new_grid
```

```typescript
function lifeStep(grid: number[][]): number[][] {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const next: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let alive = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
            alive++;
          }
        }
      }
      if (grid[r][c] === 1) {
        next[r][c] = alive === 2 || alive === 3 ? 1 : 0;
      } else {
        next[r][c] = alive === 3 ? 1 : 0;
      }
    }
  }
  return next;
}
```

```cpp
#include <vector>

std::vector<std::vector<int>> lifeStep(const std::vector<std::vector<int>>& grid) {
    int rows = static_cast<int>(grid.size());
    int cols = rows > 0 ? static_cast<int>(grid[0].size()) : 0;
    std::vector<std::vector<int>> next(rows, std::vector<int>(cols, 0));
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            int alive = 0;
            for (int dr = -1; dr <= 1; dr++) {
                for (int dc = -1; dc <= 1; dc++) {
                    if (dr == 0 && dc == 0) continue;
                    int nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) {
                        alive++;
                    }
                }
            }
            if (grid[r][c] == 1) {
                next[r][c] = (alive == 2 || alive == 3) ? 1 : 0;
            } else {
                next[r][c] = (alive == 3) ? 1 : 0;
            }
        }
    }
    return next;
}
```

```rust
fn life_step(grid: &[Vec<i32>]) -> Vec<Vec<i32>> {
    let rows = grid.len() as i32;
    let cols = if rows > 0 { grid[0].len() as i32 } else { 0 };
    let mut next = vec![vec![0; cols as usize]; rows as usize];
    for r in 0..rows {
        for c in 0..cols {
            let mut alive = 0;
            for dr in -1..=1 {
                for dc in -1..=1 {
                    if dr == 0 && dc == 0 {
                        continue;
                    }
                    let nr = r + dr;
                    let nc = c + dc;
                    if nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr as usize][nc as usize] == 1
                    {
                        alive += 1;
                    }
                }
            }
            let cell = grid[r as usize][c as usize];
            next[r as usize][c as usize] = if cell == 1 {
                if alive == 2 || alive == 3 { 1 } else { 0 }
            } else if alive == 3 {
                1
            } else {
                0
            };
        }
    }
    next
}
```

```csharp
static int[,] LifeStep(int[,] grid)
{
    int rows = grid.GetLength(0);
    int cols = rows > 0 ? grid.GetLength(1) : 0;
    var next = new int[rows, cols];
    for (int r = 0; r < rows; r++)
    {
        for (int c = 0; c < cols; c++)
        {
            int alive = 0;
            for (int dr = -1; dr <= 1; dr++)
            {
                for (int dc = -1; dc <= 1; dc++)
                {
                    if (dr == 0 && dc == 0) continue;
                    int nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr, nc] == 1) alive++;
                }
            }
            if (grid[r, c] == 1) next[r, c] = (alive == 2 || alive == 3) ? 1 : 0;
            else next[r, c] = (alive == 3) ? 1 : 0;
        }
    }
    return next;
}
```
