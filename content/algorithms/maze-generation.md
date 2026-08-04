---
name: 迷路生成アルゴリズム(再帰的バックトラッキング)
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(V)(Vはマスの数)
summary: 深さ優先探索で未訪問マスの壁を掘り進み、行き止まりでバックトラックすることで一意な経路を持つ迷路を自動生成する。
---

## 概要

ゲームのダンジョンやパズルで使われる迷路の多くは、人手で1つずつ設計するのではなく、アルゴリズムで自動生成されている。再帰的バックトラッキング法は、全マスを壁で仕切られた状態から出発し、[深さ優先探索](/algorithms/dfs)と同じ要領で「まだ壁を掘っていない隣接マスへランダムに進み、壁を取り払う」ことを繰り返す。行き止まりに達したら直前の分岐点まで引き返す(バックトラック)ことで、最終的に**任意の2点間の経路がちょうど1つだけ存在する**(閉路のない木構造の)迷路が出来上がる。

## 仕組み

1. 全マスを壁で区切られた未訪問状態にし、開始マスを訪問済みにする
2. 現在のマスから、まだ訪問していない隣接マス(壁で仕切られている隣)をランダムに1つ選ぶ
3. 選んだマスとの間の壁を取り払い、そのマスへ移動して訪問済みにする(この移動をスタックに積む、または再帰呼び出しとして記録する)
4. 現在のマスに未訪問の隣接マスがなくなったら、1つ前のマスまでバックトラックする(スタックをポップする、または再帰から戻る)
5. 全マスが訪問済みになるまで2〜4を繰り返す

深さ優先探索をそのまま使うため、通路は長く曲がりくねった経路になりやすい(バイアスが強い)。幅優先探索ベースやクラスカル法・プリム法ベースの生成法を使うと、より均等に枝分かれした迷路になるなど、探索アルゴリズムの選び方が迷路の「性格」を決める。

## 特性・トレードオフ

- **計算量**: 全マス数`V`に対して`O(V)`(各マスをちょうど1回訪問する深さ優先探索そのもの)
- **一意な経路の保証**: 生成される迷路は閉路を持たない木構造(全域木)になるため、任意の2点間の経路は必ずちょうど1つに定まる。閉路(迂回路)を持たせたい場合は生成後にいくつかの壁を追加で取り払う後処理が必要
- **通路の「性格」はアルゴリズム依存**: 深さ優先探索ベースだと長い一本道が多い迷路に、[プリム法](/algorithms/prim)ベースだと短い枝分かれが多い迷路になるなど、根底にある全域木生成アルゴリズムの選択がプレイフィールに直結する
- **使いどころ**: ローグライクゲームのダンジョン生成、パズルゲームの自動レベル生成。乱数のシードを固定すれば同じ迷路を再現できるため、日替わりチャレンジなどのコンテンツにも使われる

## 実装例

言語の標準乱数実装への依存を避けるため、線形合同法による自前の乱数生成器を使い、同じシードなら常に同じ迷路が再現されることを保証する。

```python
class Rng:
    """線形合同法による決定論的な擬似乱数生成器"""
    def __init__(self, seed: int):
        self.state = seed & 0xFFFFFFFF

    def next(self) -> int:
        self.state = (1103515245 * self.state + 12345) & 0x7FFFFFFF
        return self.state

    def randint(self, n: int) -> int:
        """0以上n未満の整数を返す"""
        return self.next() % n


def generate_maze(width: int, height: int, seed: int) -> set[tuple[tuple[int, int], tuple[int, int]]]:
    """再帰的バックトラッキングで迷路を生成し、壁が取り払われた(通行可能な)マスの組の集合を返す"""
    rng = Rng(seed)
    visited = [[False] * width for _ in range(height)]
    passages: set[tuple] = set()

    def neighbors(x, y):
        candidates = [(x, y - 1), (x, y + 1), (x - 1, y), (x + 1, y)]
        return [(nx, ny) for nx, ny in candidates if 0 <= nx < width and 0 <= ny < height]

    def carve(x, y):
        visited[y][x] = True
        neigh = neighbors(x, y)
        # Fisher-Yatesシャッフルで探索順をランダム化する
        for i in range(len(neigh) - 1, 0, -1):
            j = rng.randint(i + 1)
            neigh[i], neigh[j] = neigh[j], neigh[i]
        for nx, ny in neigh:
            if not visited[ny][nx]:
                edge = ((x, y), (nx, ny)) if (x, y) < (nx, ny) else ((nx, ny), (x, y))
                passages.add(edge)
                carve(nx, ny)

    carve(0, 0)
    return passages
```

```typescript
class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (Math.imul(1103515245, this.state) + 12345) & 0x7fffffff;
    return this.state;
  }
  randint(n: number): number {
    return this.next() % n;
  }
}

type Cell = [number, number];

function generateMaze(
  width: number,
  height: number,
  seed: number,
): Set<string> {
  const rng = new Rng(seed);
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(false),
  );
  const passages = new Set<string>();

  function neighbors(x: number, y: number): Cell[] {
    const candidates: Cell[] = [
      [x, y - 1],
      [x, y + 1],
      [x - 1, y],
      [x + 1, y],
    ];
    return candidates.filter(
      ([nx, ny]) => nx >= 0 && nx < width && ny >= 0 && ny < height,
    );
  }

  function edgeKey(a: Cell, b: Cell): string {
    const [p, q] =
      a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
    return `${p[0]},${p[1]}-${q[0]},${q[1]}`;
  }

  function carve(x: number, y: number): void {
    visited[y][x] = true;
    const neigh = neighbors(x, y);
    for (let i = neigh.length - 1; i > 0; i--) {
      const j = rng.randint(i + 1);
      [neigh[i], neigh[j]] = [neigh[j], neigh[i]];
    }
    for (const [nx, ny] of neigh) {
      if (!visited[ny][nx]) {
        passages.add(edgeKey([x, y], [nx, ny]));
        carve(nx, ny);
      }
    }
  }

  carve(0, 0);
  return passages;
}
```

```cpp
#include <vector>
#include <set>
#include <utility>
#include <cstdint>
#include <functional>

class Rng {
public:
    explicit Rng(uint32_t seed) : state(seed) {}
    uint32_t next() {
        state = (1103515245u * state + 12345u) & 0x7FFFFFFFu;
        return state;
    }
    int randint(int n) { return static_cast<int>(next() % static_cast<uint32_t>(n)); }
private:
    uint32_t state;
};

using Cell = std::pair<int, int>;

std::set<std::pair<Cell, Cell>> generateMaze(int width, int height, uint32_t seed) {
    Rng rng(seed);
    std::vector<std::vector<bool>> visited(height, std::vector<bool>(width, false));
    std::set<std::pair<Cell, Cell>> passages;

    std::function<std::vector<Cell>(int, int)> neighbors = [&](int x, int y) {
        std::vector<Cell> candidates = {{x, y - 1}, {x, y + 1}, {x - 1, y}, {x + 1, y}};
        std::vector<Cell> result;
        for (auto& [nx, ny] : candidates) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) result.push_back({nx, ny});
        }
        return result;
    };

    std::function<void(int, int)> carve = [&](int x, int y) {
        visited[y][x] = true;
        auto neigh = neighbors(x, y);
        for (int i = static_cast<int>(neigh.size()) - 1; i > 0; i--) {
            int j = rng.randint(i + 1);
            std::swap(neigh[i], neigh[j]);
        }
        for (auto& [nx, ny] : neigh) {
            if (!visited[ny][nx]) {
                Cell a{x, y}, b{nx, ny};
                auto edge = a < b ? std::make_pair(a, b) : std::make_pair(b, a);
                passages.insert(edge);
                carve(nx, ny);
            }
        }
    };

    carve(0, 0);
    return passages;
}
```

```rust
use std::collections::HashSet;

struct Rng {
    state: u32,
}

impl Rng {
    fn new(seed: u32) -> Self {
        Rng { state: seed }
    }
    fn next(&mut self) -> u32 {
        self.state = (1103515245u32.wrapping_mul(self.state).wrapping_add(12345)) & 0x7FFFFFFF;
        self.state
    }
    fn randint(&mut self, n: u32) -> u32 {
        self.next() % n
    }
}

type Cell = (i32, i32);

fn generate_maze(width: i32, height: i32, seed: u32) -> HashSet<(Cell, Cell)> {
    let mut rng = Rng::new(seed);
    let mut visited = vec![vec![false; width as usize]; height as usize];
    let mut passages: HashSet<(Cell, Cell)> = HashSet::new();

    fn neighbors(x: i32, y: i32, width: i32, height: i32) -> Vec<Cell> {
        let candidates = [(x, y - 1), (x, y + 1), (x - 1, y), (x + 1, y)];
        candidates.iter().cloned().filter(|&(nx, ny)| nx >= 0 && nx < width && ny >= 0 && ny < height).collect()
    }

    fn carve(
        x: i32,
        y: i32,
        width: i32,
        height: i32,
        visited: &mut Vec<Vec<bool>>,
        passages: &mut HashSet<(Cell, Cell)>,
        rng: &mut Rng,
    ) {
        visited[y as usize][x as usize] = true;
        let mut neigh = neighbors(x, y, width, height);
        for i in (1..neigh.len()).rev() {
            let j = rng.randint((i + 1) as u32) as usize;
            neigh.swap(i, j);
        }
        for (nx, ny) in neigh {
            if !visited[ny as usize][nx as usize] {
                let edge = if (x, y) < (nx, ny) { ((x, y), (nx, ny)) } else { ((nx, ny), (x, y)) };
                passages.insert(edge);
                carve(nx, ny, width, height, visited, passages, rng);
            }
        }
    }

    carve(0, 0, width, height, &mut visited, &mut passages, &mut rng);
    passages
}
```

```csharp
class Rng
{
    private uint state;
    public Rng(uint seed) { state = seed; }
    public uint Next()
    {
        state = (uint)(1103515245u * state + 12345u) & 0x7FFFFFFF;
        return state;
    }
    public int RandInt(int n) => (int)(Next() % (uint)n);
}

static HashSet<((int, int) a, (int, int) b)> GenerateMaze(int width, int height, uint seed)
{
    var rng = new Rng(seed);
    var visited = new bool[height, width];
    var passages = new HashSet<((int, int), (int, int))>();

    List<(int, int)> Neighbors(int x, int y)
    {
        var candidates = new List<(int, int)> { (x, y - 1), (x, y + 1), (x - 1, y), (x + 1, y) };
        return candidates.Where(c => c.Item1 >= 0 && c.Item1 < width && c.Item2 >= 0 && c.Item2 < height).ToList();
    }

    void Carve(int x, int y)
    {
        visited[y, x] = true;
        var neigh = Neighbors(x, y);
        for (int i = neigh.Count - 1; i > 0; i--)
        {
            int j = rng.RandInt(i + 1);
            (neigh[i], neigh[j]) = (neigh[j], neigh[i]);
        }
        foreach (var (nx, ny) in neigh)
        {
            if (!visited[ny, nx])
            {
                var edge = (x, y).CompareTo((nx, ny)) < 0 ? ((x, y), (nx, ny)) : ((nx, ny), (x, y));
                passages.Add(edge);
                Carve(nx, ny);
            }
        }
    }

    Carve(0, 0);
    return passages;
}
```
