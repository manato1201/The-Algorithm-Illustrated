---
name: 酔歩法(Drunkard's Walk)による洞窟生成
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(steps)(stepsは歩数、目標の開けた面積に応じて調整)
summary: ランダムウォーク(酔っ払いの千鳥足)する1つの「掘削者」が通った場所を床にするだけで、自然で有機的な洞窟のような地形が生まれる、[迷路生成](/algorithms/maze-generation)とは対照的に不規則な開けた空間を作るための手続き型生成手法。
---

## 概要

[迷路生成](/algorithms/maze-generation)は「壁で仕切られた一本道の通路網」という規則的な構造を生み出すのに対し、酔歩法(Drunkard's Walk、ランダムウォークアルゴリズム)は全く異なる質感の空間を作り出す——グリッド上の1点から出発した「掘削者」が、酔っ払いの千鳥足のように毎回ランダムな方向へ1歩ずつ進み、通過したマスを床(開けた空間)に変えていくだけで、自然の洞窟を思わせる不規則で有機的な広がりを持つ地形が生成される。ルールがたった1つ(ランダムに1歩進んで床にする)という驚くべき単純さにもかかわらず、多くのローグライクゲームで実際に洞窟マップの生成に採用されている実用的な手法である。

## 仕組み

1. グリッド全体を「壁」で初期化し、掘削者の開始位置(通常はグリッド中央)を床にする
2. 掘削者は上下左右のいずれかの方向をランダムに1つ選び、1マス移動する(グリッドの外に出ないよう境界チェックを行う)
3. 移動した先のマスを床に変える(既に床であれば何もしない)
4. 全マスに対する床の割合があらかじめ定めた目標(例えば40%)に達するまで、手順2〜3を繰り返す
5. 目標の割合に達したら停止し、床になったマスの集合が洞窟の形状として確定する

## 特性・トレードオフ

- **計算量**: 目標の開けた面積に到達するまでの歩数に比例する`O(steps)`——歩数は目標割合とグリッドサイズに依存し、事前に正確な歩数を見積もることは難しい(ランダムウォークの性質上、同じマスを何度も再訪する無駄が発生するため)
- **連結性が自動的に保証される**という利点: 1つの掘削者が連続して歩くため、生成された床マスは(掘削者が実際に歩いた経路である以上)必ず全て連結している——[迷路生成](/algorithms/maze-generation)のように明示的な連結性の証明は不要で、アルゴリズムの動作原理そのものから連結性が導かれる
- **[迷路生成](/algorithms/maze-generation)との対照的な質感**: [迷路生成](/algorithms/maze-generation)([深さ優先探索](/algorithms/dfs)ベース等)が「壁で仕切られた一本道」という幾何学的にきっちりした構造を作るのに対し、酔歩法は境界が曖昧で不規則に膨らんだ「洞窟」らしい質感を作る——同じ「手続き型コンテンツ生成」という目的でも、採用するアルゴリズムによって全く異なる空間の「性格」が生まれることを示す好対照な例になっている
- **複数の掘削者への拡張**: 複数の掘削者を同時に(または順番に)歩かせることで、より複雑に枝分かれした洞窟ネットワークを生成することもできる。生成後にセルオートマトンによる平滑化(周囲の壁の割合で開閉を決め直す)を追加でかけて、より自然な岩肌の質感に仕上げる実装も多い
- **使いどころ**: ローグライクゲーム・メトロイドヴァニア系ゲームの洞窟・ダンジョンマップ生成、鉱山・地下遺跡のような不規則な地形の手続き型生成、[迷路生成](/algorithms/maze-generation)や[波動関数崩壊](/algorithms/wave-function-collapse)と組み合わせた複合的なレベルデザインパイプライン

## 実装例

グリッド中央から掘削者を歩かせ、目標の床面積比率に達するまでランダムに1歩ずつ進める。生成後、フラッドフィルで全床マスが1つの連結成分になっていることを検証できる。

```python
import random


def generate_cave(width: int, height: int, target_ratio: float, seed: int | None = None):
    rng = random.Random(seed)
    grid = [[False] * width for _ in range(height)]
    x, y = width // 2, height // 2
    grid[y][x] = True
    floor_count = 1
    total = width * height
    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    max_steps = total * 200
    steps = 0
    while floor_count / total < target_ratio and steps < max_steps:
        dx, dy = rng.choice(directions)
        nx, ny = x + dx, y + dy
        if 0 <= nx < width and 0 <= ny < height:
            x, y = nx, ny
            if not grid[y][x]:
                grid[y][x] = True
                floor_count += 1
        steps += 1
    return grid, floor_count / total
```

```typescript
function generateCave(width: number, height: number, targetRatio: number, seed = 7) {
  const rng = mulberry32(seed);
  const grid: boolean[][] = Array.from({ length: height }, () => new Array(width).fill(false));
  let x = Math.floor(width / 2), y = Math.floor(height / 2);
  grid[y][x] = true;
  let floorCount = 1;
  const total = width * height;
  const directions: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const maxSteps = total * 200;
  let steps = 0;
  while (floorCount / total < targetRatio && steps < maxSteps) {
    const [dx, dy] = directions[Math.floor(rng() * 4)];
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      x = nx; y = ny;
      if (!grid[y][x]) { grid[y][x] = true; floorCount += 1; }
    }
    steps += 1;
  }
  return { grid, ratio: floorCount / total };
}

// 決定的な擬似乱数生成器(検証・再現性のため)
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

```cpp
#include <vector>
#include <random>
#include <array>

struct CaveResult {
    std::vector<std::vector<bool>> grid;
    double ratio;
};

CaveResult generateCave(int width, int height, double targetRatio, unsigned seed = 7) {
    std::mt19937 rng(seed);
    std::uniform_int_distribution<int> dirDist(0, 3);
    std::vector<std::vector<bool>> grid(height, std::vector<bool>(width, false));

    int x = width / 2, y = height / 2;
    grid[y][x] = true;
    int floorCount = 1;
    int total = width * height;
    const std::array<std::pair<int, int>, 4> directions = { { {0, 1}, {0, -1}, {1, 0}, {-1, 0} } };
    long maxSteps = static_cast<long>(total) * 200;
    long steps = 0;

    while (static_cast<double>(floorCount) / total < targetRatio && steps < maxSteps) {
        auto [dx, dy] = directions[dirDist(rng)];
        int nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            x = nx; y = ny;
            if (!grid[y][x]) { grid[y][x] = true; floorCount++; }
        }
        steps++;
    }
    return { grid, static_cast<double>(floorCount) / total };
}
```

```rust
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

fn generate_cave(width: usize, height: usize, target_ratio: f64, seed: u64) -> (Vec<Vec<bool>>, f64) {
    let mut rng = StdRng::seed_from_u64(seed);
    let mut grid = vec![vec![false; width]; height];

    let mut x = width / 2;
    let mut y = height / 2;
    grid[y][x] = true;
    let mut floor_count = 1usize;
    let total = width * height;
    let directions: [(i32, i32); 4] = [(0, 1), (0, -1), (1, 0), (-1, 0)];
    let max_steps = total * 200;
    let mut steps = 0;

    while (floor_count as f64) / (total as f64) < target_ratio && steps < max_steps {
        let (dx, dy) = directions[rng.gen_range(0..4)];
        let nx = x as i32 + dx;
        let ny = y as i32 + dy;
        if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
            x = nx as usize;
            y = ny as usize;
            if !grid[y][x] {
                grid[y][x] = true;
                floor_count += 1;
            }
        }
        steps += 1;
    }

    (grid, floor_count as f64 / total as f64)
}
```

```csharp
static class DrunkardsWalkCaveGeneration
{
    public static (bool[][] Grid, double Ratio) GenerateCave(int width, int height, double targetRatio, int seed = 7)
    {
        var rng = new Random(seed);
        var grid = new bool[height][];
        for (int i = 0; i < height; i++) grid[i] = new bool[width];
        int x = width / 2, y = height / 2;
        grid[y][x] = true;
        int floorCount = 1;
        int total = width * height;
        var directions = new (int, int)[] { (0, 1), (0, -1), (1, 0), (-1, 0) };
        int maxSteps = total * 200;
        int steps = 0;
        while ((double)floorCount / total < targetRatio && steps < maxSteps)
        {
            var (dx, dy) = directions[rng.Next(4)];
            int nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height)
            {
                x = nx; y = ny;
                if (!grid[y][x]) { grid[y][x] = true; floorCount += 1; }
            }
            steps += 1;
        }
        return (grid, (double)floorCount / total);
    }
}
```
