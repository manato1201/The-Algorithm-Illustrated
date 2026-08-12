---
name: 森林火災モデル(セルオートマトンによる延焼シミュレーション)
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: O(w・h)(1ステップあたり、w×hはグリッドサイズ)
summary: グリッドの各セルを「空き地・木・燃えている木」の3状態で表し、燃えている木の隣は延焼する、木は一定確率で新たに生える、といった単純な確率的ルールから、自己組織化臨界現象と呼ばれる統計的にべき乗則に従う延焼パターンが創発する。
---

## 概要

[ライフゲーム](/algorithms/conways-game-of-life)や[初等セルオートマトン](/algorithms/elementary-cellular-automaton)が決定論的なルールで規則的なパターンを生み出すのに対し、森林火災モデル(Drossel-Schwablモデル)は**確率的な遷移ルール**を使い、自然現象を模倣しながら、統計物理学で重要な「自己組織化臨界現象」を示すことで知られる古典的なセルオートマトンである。グリッド上の各セルは「空き地」「木」「燃えている木」の3つの状態を取り、単純なルール(木は一定確率で自然発生し、隣接する木に火が燃え移り、燃え尽きた木は空き地に戻る)を繰り返し適用するだけで、火災の規模の分布が特定のスケールを持たない「べき乗則」に従うという、実際の森林火災の統計的な性質と驚くほど similar な振る舞いが創発する。

## 仕組み

1. グリッドの各セルを、初期状態として「空き地」または「木」にランダムに配置する
2. 各時間ステップで、全セルに以下のルールを**同時に**適用する:
   - **燃えている木** → 次のステップで「空き地」になる(燃え尽きる)
   - **木**で、隣接するセル(上下左右)に**燃えている木**が1つでもあれば → 次のステップで「燃えている木」になる(延焼)
   - **木**で、隣接する燃えている木がなければ、微小な確率`f`(落雷など)で自然に「燃えている木」になる
   - **空き地**は、微小な確率`p`で新たに「木」が生える(植生の再生)
3. 確率`p`(木の成長率)と`f`(自然発火率)の比を、`p ≫ f`(木が育つ速度に対して自然発火はごく稀)という条件に設定すると、システムは特定のパラメータ調整なしに、自然に「臨界状態」と呼ばれる特別な状態へ収束していく
4. この臨界状態では、発生する火災の規模(焼失したセル数)の頻度分布が、指数関数的な減衰ではなく**べき乗則**(`規模がSになる確率 ∝ S^(-τ)`)に従うようになる——これは「特定のスケールを持たない」ことを意味し、小さな火災も大規模な火災も、統一的な統計法則で説明できることを示している

## 特性・トレードオフ

- **自己組織化臨界現象という統計物理学的な性質**: パラメータを特別に調整しなくても、システムが自発的に「臨界状態」に落ち着き、べき乗則に従う振る舞いを示すという性質(自己組織化臨界性、Self-Organized Criticality)は、[ライフゲーム](/algorithms/conways-game-of-life)や[Langtonのアリ](/algorithms/langtons-ant)とはまた異なる、セルオートマトンが持つ深い統計的性質を体感できる代表的なモデルである。同様の現象は、砂山崩し(Bak-Tang-Wiesenfeldモデル)や地震の規模分布(グーテンベルグ・リヒター則)でも観測されている
- **単純なルールから複雑な統計法則が創発する**: 個々のセルの遷移ルールは非常に単純(確率的な木の成長と延焼)であるにもかかわらず、システム全体として観測される火災規模の分布は、実際の森林火災データの統計的性質を驚くほどよく再現する。これは「単純な局所ルールから複雑な大域的秩序が生まれる」というセルオートマトン全般に共通するテーマの好例である
- **確率的なルールゆえの実行のたびの多様性**: [ライフゲーム](/algorithms/conways-game-of-life)のような決定論的なセルオートマトンと異なり、確率的な要素を含むため、同じ初期状態から始めても実行のたびに異なる展開を見せる。統計的な性質(べき乗則の指数など)を調べるには、多数回のシミュレーションを平均する必要がある
- **使いどころ**: 自己組織化臨界現象の教育的なデモンストレーション、実際の森林火災リスク評価の統計モデリングの基礎、伝染病の流行シミュレーションのような「延焼・伝播」型現象への応用、[セルオートマトン群衆モデル](/algorithms/cellular-automaton-crowd)のような他の確率的セルオートマトンとの比較対象

## 実装例

```python
import random

EMPTY, TREE, BURNING = 0, 1, 2

def forest_fire_step(grid: list[list[int]], p_grow: float = 0.01, f_lightning: float = 0.0001) -> list[list[int]]:
    height, width = len(grid), len(grid[0])
    new_grid = [[EMPTY] * width for _ in range(height)]

    for y in range(height):
        for x in range(width):
            state = grid[y][x]
            if state == BURNING:
                new_grid[y][x] = EMPTY
            elif state == TREE:
                neighbors_burning = any(
                    0 <= y + dy < height and 0 <= x + dx < width and grid[y + dy][x + dx] == BURNING
                    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]
                )
                if neighbors_burning or random.random() < f_lightning:
                    new_grid[y][x] = BURNING
                else:
                    new_grid[y][x] = TREE
            else:  # EMPTY
                new_grid[y][x] = TREE if random.random() < p_grow else EMPTY

    return new_grid
```

```typescript
enum CellState {
  Empty = 0,
  Tree = 1,
  Burning = 2,
}

function forestFireStep(
  grid: CellState[][],
  pGrow = 0.01,
  fLightning = 0.0001,
  rand: () => number = Math.random,
): CellState[][] {
  const height = grid.length;
  const width = grid[0].length;
  const newGrid: CellState[][] = Array.from({ length: height }, () =>
    new Array(width).fill(CellState.Empty),
  );

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const state = grid[y][x];
      if (state === CellState.Burning) {
        newGrid[y][x] = CellState.Empty;
      } else if (state === CellState.Tree) {
        const neighborsBurning = directions.some(([dy, dx]) => {
          const ny = y + dy,
            nx = x + dx;
          return (
            ny >= 0 &&
            ny < height &&
            nx >= 0 &&
            nx < width &&
            grid[ny][nx] === CellState.Burning
          );
        });
        newGrid[y][x] =
          neighborsBurning || rand() < fLightning
            ? CellState.Burning
            : CellState.Tree;
      } else {
        newGrid[y][x] = rand() < pGrow ? CellState.Tree : CellState.Empty;
      }
    }
  }

  return newGrid;
}
```

```cpp
#include <vector>
#include <random>
#include <array>

enum CellState { EMPTY = 0, TREE = 1, BURNING = 2 };

std::vector<std::vector<int>> forestFireStep(
    const std::vector<std::vector<int>>& grid, double pGrow, double fLightning, std::mt19937& rng) {
    int height = static_cast<int>(grid.size()), width = static_cast<int>(grid[0].size());
    std::vector<std::vector<int>> newGrid(height, std::vector<int>(width, EMPTY));
    std::uniform_real_distribution<double> uni(0.0, 1.0);
    const std::array<std::pair<int, int>, 4> directions = {{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}};

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int state = grid[y][x];
            if (state == BURNING) {
                newGrid[y][x] = EMPTY;
            } else if (state == TREE) {
                bool neighborsBurning = false;
                for (auto& [dy, dx] : directions) {
                    int ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width && grid[ny][nx] == BURNING) {
                        neighborsBurning = true;
                        break;
                    }
                }
                newGrid[y][x] = (neighborsBurning || uni(rng) < fLightning) ? BURNING : TREE;
            } else {
                newGrid[y][x] = uni(rng) < pGrow ? TREE : EMPTY;
            }
        }
    }

    return newGrid;
}
```

```rust
use rand::Rng;

#[derive(Clone, Copy, PartialEq)]
enum CellState { Empty, Tree, Burning }

fn forest_fire_step(grid: &[Vec<CellState>], p_grow: f64, f_lightning: f64, rng: &mut impl Rng) -> Vec<Vec<CellState>> {
    let height = grid.len();
    let width = grid[0].len();
    let mut new_grid = vec![vec![CellState::Empty; width]; height];
    let directions: [(i32, i32); 4] = [(-1, 0), (1, 0), (0, -1), (0, 1)];

    for y in 0..height {
        for x in 0..width {
            new_grid[y][x] = match grid[y][x] {
                CellState::Burning => CellState::Empty,
                CellState::Tree => {
                    let neighbors_burning = directions.iter().any(|&(dy, dx)| {
                        let ny = y as i32 + dy;
                        let nx = x as i32 + dx;
                        ny >= 0 && (ny as usize) < height && nx >= 0 && (nx as usize) < width
                            && grid[ny as usize][nx as usize] == CellState::Burning
                    });
                    if neighbors_burning || rng.gen::<f64>() < f_lightning { CellState::Burning } else { CellState::Tree }
                }
                CellState::Empty => {
                    if rng.gen::<f64>() < p_grow { CellState::Tree } else { CellState::Empty }
                }
            };
        }
    }

    new_grid
}
```

```csharp
enum CellState { Empty, Tree, Burning }

static CellState[][] ForestFireStep(CellState[][] grid, double pGrow, double fLightning, Random rand)
{
    int height = grid.Length, width = grid[0].Length;
    var newGrid = new CellState[height][];
    for (int i = 0; i < height; i++) newGrid[i] = new CellState[width];

    var directions = new (int, int)[] { (-1, 0), (1, 0), (0, -1), (0, 1) };

    for (int y = 0; y < height; y++)
    {
        for (int x = 0; x < width; x++)
        {
            var state = grid[y][x];
            if (state == CellState.Burning)
            {
                newGrid[y][x] = CellState.Empty;
            }
            else if (state == CellState.Tree)
            {
                bool neighborsBurning = false;
                foreach (var (dy, dx) in directions)
                {
                    int ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width && grid[ny][nx] == CellState.Burning)
                    {
                        neighborsBurning = true;
                        break;
                    }
                }
                newGrid[y][x] = (neighborsBurning || rand.NextDouble() < fLightning) ? CellState.Burning : CellState.Tree;
            }
            else
            {
                newGrid[y][x] = rand.NextDouble() < pGrow ? CellState.Tree : CellState.Empty;
            }
        }
    }

    return newGrid;
}
```
