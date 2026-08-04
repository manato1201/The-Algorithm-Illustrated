---
name: Wave Function Collapse
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(セル数^2)程度(実装依存)
summary: タイル間の隣接制約を伝播させながらエントロピー最小のセルから確定させていく、量子力学の「波動関数の収縮」になぞらえた手続き型生成法。
---

## 概要

タイルセットからマップを自動生成する際、単純にランダムにタイルを並べると「道が途中で途切れる」「壁の隣に空中の床がある」といった不自然な組み合わせが生まれてしまう。Wave Function Collapse(WFC)は、「隣接するタイルにはどの組み合わせが許されるか」というルール(サンプル画像から自動抽出することも多い)を制約として、各セルが「まだどのタイルになるか未確定な、複数タイルの重ね合わせ状態」から出発し、最も選択肢が少ない(=最も不確定性が低い)セルから順に1つのタイルを確定させ、その影響を周囲へ伝播させる、という手順でマップ全体を矛盾なく埋めていく。量子力学の観測による「波動関数の収縮」になぞらえてこの名前が付けられた。

## 仕組み

1. 各セルに「まだ確定していない、可能性のあるタイルの集合」を初期状態として割り当てる(全タイルが候補)
2. 全セルの中から、可能性の数(エントロピー)が最も少ない——つまり最も制約が厳しく、確定させやすい——セルを選ぶ
3. そのセルについて、可能性の中から1つのタイルをランダムに選んで確定させる(**収縮/collapse**)
4. 確定したタイルと矛盾する候補を、隣接セルの可能性集合から取り除く。取り除いた結果さらに隣のセルの可能性も絞られるので、この絞り込みを波紋のように周囲へ**伝播**させる(制約伝播)
5. 全セルが1つのタイルに確定するまで2〜4を繰り返す。途中で可能性が0になるセル(矛盾)が出たら、バックトラックするか最初からやり直す

## 特性・トレードオフ

- **矛盾のない出力を保証しやすい**: 制約伝播を挟むことで、単純なランダム配置では起こりがちな「隣接しないはずのタイルが並ぶ」不自然さを構造的に避けられる
- **矛盾(失敗)への対処が必要**: 選択の組み合わせによっては、どのタイルを置いても矛盾するセルが生じることがある(可能性が0になる)。実用実装ではバックトラックや再試行のロジックが欠かせない
- **サンプルからのルール抽出**: 単純な手書きタイルルールだけでなく、既存のドット絵やタイルマップの画像からピクセル単位の隣接パターンを自動学習し、似た「作風」のマップを新規生成する応用が広く知られている
- **使いどころ**: パズルゲームやローグライクのマップ生成、レベルデザインの自動化ツール。[迷路生成アルゴリズム](/algorithms/maze-generation)より複雑な地形の一貫性(道が繋がる、部屋の形が破綻しない等)を扱いたい場合に選ばれる

## 実装例

タイルを「海(0)・海岸(1)・陸(2)」の3種とし、「隣接するタイルの番号差は1以内」という制約(海の隣に陸がいきなり来ることはない)で6×6グリッドを埋める。乱数は言語間で挙動が揺れないよう自前の32bit線形合同法(LCG)で実装し、同じシードなら常に同じ盤面になることを検証する。

```python
class Rng:
    """再現性のための決定論的な線形合同法(LCG)乱数生成器"""

    def __init__(self, seed):
        self.state = seed & 0xFFFFFFFF

    def next_u32(self):
        self.state = (self.state * 1664525 + 1013904223) & 0xFFFFFFFF
        return self.state

    def next_float(self):
        return self.next_u32() / 4294967296.0


NUM_TILES = 3  # 0=海, 1=海岸, 2=陸


def compatible(a, b):
    return abs(a - b) <= 1


def collapse(width, height, seed):
    grid = [[set(range(NUM_TILES)) for _ in range(width)] for _ in range(height)]
    rng = Rng(seed)

    def neighbors(r, c):
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < height and 0 <= nc < width:
                yield nr, nc

    def propagate_from(r, c):
        stack = [(r, c)]
        while stack:
            cr, cc = stack.pop()
            for nr, nc in neighbors(cr, cc):
                if len(grid[nr][nc]) == 1:
                    continue
                allowed = {u for t in grid[cr][cc] for u in range(NUM_TILES) if compatible(t, u)}
                new_possible = grid[nr][nc] & allowed
                if not new_possible:
                    raise RuntimeError(f"contradiction at ({nr},{nc})")
                if new_possible != grid[nr][nc]:
                    grid[nr][nc] = new_possible
                    stack.append((nr, nc))

    while True:
        # 未確定セルの中からエントロピー(可能性の数)最小のものを選ぶ(行優先で決定論的にタイブレーク)
        best = None
        for r in range(height):
            for c in range(width):
                if len(grid[r][c]) > 1:
                    if best is None or len(grid[r][c]) < len(grid[best[0]][best[1]]):
                        best = (r, c)
        if best is None:
            break
        r, c = best
        options = sorted(grid[r][c])
        choice = options[int(rng.next_float() * len(options)) % len(options)]
        grid[r][c] = {choice}
        propagate_from(r, c)

    return [[next(iter(grid[r][c])) for c in range(width)] for r in range(height)]


# 検証: 同じシードなら常に同じ盤面になり(決定論的)、隣接制約も満たす
result_a = collapse(6, 6, 42)
result_b = collapse(6, 6, 42)
assert result_a == result_b
```

```typescript
class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  nextU32(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state;
  }
  nextFloat(): number {
    return this.nextU32() / 4294967296.0;
  }
}

const NUM_TILES = 3; // 0=海, 1=海岸, 2=陸

function compatible(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1;
}

function collapse(width: number, height: number, seed: number): number[][] {
  const grid: Set<number>[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => new Set([0, 1, 2]))
  );
  const rng = new Rng(seed);

  function neighborsOf(r: number, c: number): Array<[number, number]> {
    const result: Array<[number, number]> = [];
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < height && nc >= 0 && nc < width) result.push([nr, nc]);
    }
    return result;
  }

  function propagateFrom(startR: number, startC: number): void {
    const stack: Array<[number, number]> = [[startR, startC]];
    while (stack.length > 0) {
      const [cr, cc] = stack.pop()!;
      for (const [nr, nc] of neighborsOf(cr, cc)) {
        if (grid[nr][nc].size === 1) continue;
        const allowed = new Set<number>();
        for (const t of grid[cr][cc]) {
          for (let u = 0; u < NUM_TILES; u++) {
            if (compatible(t, u)) allowed.add(u);
          }
        }
        const newPossible = new Set([...grid[nr][nc]].filter((x) => allowed.has(x)));
        if (newPossible.size === 0) throw new Error(`contradiction at (${nr},${nc})`);
        if (newPossible.size !== grid[nr][nc].size) {
          grid[nr][nc] = newPossible;
          stack.push([nr, nc]);
        }
      }
    }
  }

  for (;;) {
    let best: [number, number] | null = null;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c].size > 1) {
          if (best === null || grid[r][c].size < grid[best[0]][best[1]].size) best = [r, c];
        }
      }
    }
    if (best === null) break;
    const [r, c] = best;
    const options = [...grid[r][c]].sort((a, b) => a - b);
    const choice = options[Math.floor(rng.nextFloat() * options.length) % options.length];
    grid[r][c] = new Set([choice]);
    propagateFrom(r, c);
  }

  return grid.map((row) => row.map((s) => [...s][0]));
}
```

```cpp
#include <vector>
#include <set>
#include <cstdint>
#include <stdexcept>
#include <algorithm>

struct Rng {
    uint32_t state;
    explicit Rng(uint32_t seed) : state(seed) {}
    uint32_t nextU32() {
        state = state * 1664525u + 1013904223u;
        return state;
    }
    double nextFloat() { return static_cast<double>(nextU32()) / 4294967296.0; }
};

constexpr int NUM_TILES = 3; // 0=海, 1=海岸, 2=陸

bool compatible(int a, int b) { return std::abs(a - b) <= 1; }

std::vector<std::vector<int>> collapse(int width, int height, uint32_t seed) {
    std::vector<std::vector<std::set<int>>> grid(
        height, std::vector<std::set<int>>(width, {0, 1, 2}));
    Rng rng(seed);

    auto neighborsOf = [&](int r, int c) {
        std::vector<std::pair<int, int>> result;
        for (auto [dr, dc] : std::vector<std::pair<int, int>>{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}) {
            int nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < height && nc >= 0 && nc < width) result.push_back({nr, nc});
        }
        return result;
    };

    std::function<void(int, int)> propagateFrom = [&](int startR, int startC) {
        std::vector<std::pair<int, int>> stack{{startR, startC}};
        while (!stack.empty()) {
            auto [cr, cc] = stack.back();
            stack.pop_back();
            for (auto [nr, nc] : neighborsOf(cr, cc)) {
                if (grid[nr][nc].size() == 1) continue;
                std::set<int> allowed;
                for (int t : grid[cr][cc]) {
                    for (int u = 0; u < NUM_TILES; u++) {
                        if (compatible(t, u)) allowed.insert(u);
                    }
                }
                std::set<int> newPossible;
                for (int x : grid[nr][nc]) {
                    if (allowed.count(x)) newPossible.insert(x);
                }
                if (newPossible.empty()) throw std::runtime_error("contradiction");
                if (newPossible.size() != grid[nr][nc].size()) {
                    grid[nr][nc] = newPossible;
                    stack.push_back({nr, nc});
                }
            }
        }
    };

    while (true) {
        int bestR = -1, bestC = -1;
        for (int r = 0; r < height; r++) {
            for (int c = 0; c < width; c++) {
                if (grid[r][c].size() > 1) {
                    if (bestR == -1 || grid[r][c].size() < grid[bestR][bestC].size()) {
                        bestR = r;
                        bestC = c;
                    }
                }
            }
        }
        if (bestR == -1) break;
        std::vector<int> options(grid[bestR][bestC].begin(), grid[bestR][bestC].end());
        int choice = options[static_cast<size_t>(rng.nextFloat() * options.size()) % options.size()];
        grid[bestR][bestC] = {choice};
        propagateFrom(bestR, bestC);
    }

    std::vector<std::vector<int>> result(height, std::vector<int>(width));
    for (int r = 0; r < height; r++)
        for (int c = 0; c < width; c++) result[r][c] = *grid[r][c].begin();
    return result;
}
```

```rust
struct Rng {
    state: u32,
}

impl Rng {
    fn new(seed: u32) -> Self {
        Rng { state: seed }
    }
    fn next_u32(&mut self) -> u32 {
        self.state = self.state.wrapping_mul(1664525).wrapping_add(1013904223);
        self.state
    }
    fn next_float(&mut self) -> f64 {
        self.next_u32() as f64 / 4294967296.0
    }
}

const NUM_TILES: i32 = 3; // 0=海, 1=海岸, 2=陸

fn compatible(a: i32, b: i32) -> bool {
    (a - b).abs() <= 1
}

fn neighbors_of(r: i32, c: i32, height: i32, width: i32) -> Vec<(i32, i32)> {
    let mut result = Vec::new();
    for (dr, dc) in [(-1, 0), (1, 0), (0, -1), (0, 1)] {
        let (nr, nc) = (r + dr, c + dc);
        if nr >= 0 && nr < height && nc >= 0 && nc < width {
            result.push((nr, nc));
        }
    }
    result
}

fn collapse(width: i32, height: i32, seed: u32) -> Vec<Vec<i32>> {
    use std::collections::BTreeSet;
    let mut grid: Vec<Vec<BTreeSet<i32>>> =
        vec![vec![BTreeSet::from([0, 1, 2]); width as usize]; height as usize];
    let mut rng = Rng::new(seed);

    loop {
        let mut best: Option<(i32, i32)> = None;
        for r in 0..height {
            for c in 0..width {
                let len = grid[r as usize][c as usize].len();
                if len > 1 {
                    let better = match best {
                        None => true,
                        Some((br, bc)) => len < grid[br as usize][bc as usize].len(),
                    };
                    if better {
                        best = Some((r, c));
                    }
                }
            }
        }
        let (r, c) = match best {
            None => break,
            Some(rc) => rc,
        };
        let options: Vec<i32> = grid[r as usize][c as usize].iter().copied().collect();
        let choice = options[(rng.next_float() * options.len() as f64) as usize % options.len()];
        grid[r as usize][c as usize] = BTreeSet::from([choice]);

        // 制約伝播(スタックベースの幅優先ではなく深さ優先で十分)
        let mut stack = vec![(r, c)];
        while let Some((cr, cc)) = stack.pop() {
            for (nr, nc) in neighbors_of(cr, cc, height, width) {
                if grid[nr as usize][nc as usize].len() == 1 {
                    continue;
                }
                let mut allowed = BTreeSet::new();
                for &t in &grid[cr as usize][cc as usize] {
                    for u in 0..NUM_TILES {
                        if compatible(t, u) {
                            allowed.insert(u);
                        }
                    }
                }
                let new_possible: BTreeSet<i32> = grid[nr as usize][nc as usize]
                    .intersection(&allowed)
                    .copied()
                    .collect();
                assert!(!new_possible.is_empty(), "contradiction at ({nr},{nc})");
                if new_possible.len() != grid[nr as usize][nc as usize].len() {
                    grid[nr as usize][nc as usize] = new_possible;
                    stack.push((nr, nc));
                }
            }
        }
    }

    grid.iter()
        .map(|row| row.iter().map(|s| *s.iter().next().unwrap()).collect())
        .collect()
}
```

```csharp
class Rng
{
    public uint State;
    public Rng(uint seed) { State = seed; }
    public uint NextU32()
    {
        State = unchecked(State * 1664525 + 1013904223);
        return State;
    }
    public double NextFloat() => NextU32() / 4294967296.0;
}

const int NumTiles = 3; // 0=海, 1=海岸, 2=陸

static bool Compatible(int a, int b) => Math.Abs(a - b) <= 1;

static IEnumerable<(int, int)> NeighborsOf(int r, int c, int height, int width)
{
    foreach (var (dr, dc) in new[] { (-1, 0), (1, 0), (0, -1), (0, 1) })
    {
        int nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width) yield return (nr, nc);
    }
}

static int[][] Collapse(int width, int height, uint seed)
{
    var grid = new HashSet<int>[height, width];
    for (int r = 0; r < height; r++)
        for (int c = 0; c < width; c++)
            grid[r, c] = new HashSet<int> { 0, 1, 2 };
    var rng = new Rng(seed);

    void PropagateFrom(int startR, int startC)
    {
        var stack = new Stack<(int, int)>();
        stack.Push((startR, startC));
        while (stack.Count > 0)
        {
            var (cr, cc) = stack.Pop();
            foreach (var (nr, nc) in NeighborsOf(cr, cc, height, width))
            {
                if (grid[nr, nc].Count == 1) continue;
                var allowed = new HashSet<int>();
                foreach (var t in grid[cr, cc])
                    for (int u = 0; u < NumTiles; u++)
                        if (Compatible(t, u)) allowed.Add(u);
                var newPossible = new HashSet<int>(grid[nr, nc].Where(x => allowed.Contains(x)));
                if (newPossible.Count == 0) throw new Exception($"contradiction at ({nr},{nc})");
                if (newPossible.Count != grid[nr, nc].Count)
                {
                    grid[nr, nc] = newPossible;
                    stack.Push((nr, nc));
                }
            }
        }
    }

    while (true)
    {
        (int, int)? best = null;
        for (int r = 0; r < height; r++)
            for (int c = 0; c < width; c++)
                if (grid[r, c].Count > 1 && (best == null || grid[r, c].Count < grid[best.Value.Item1, best.Value.Item2].Count))
                    best = (r, c);
        if (best == null) break;
        var (r2, c2) = best.Value;
        var options = grid[r2, c2].OrderBy(x => x).ToList();
        int choice = options[(int)(rng.NextFloat() * options.Count) % options.Count];
        grid[r2, c2] = new HashSet<int> { choice };
        PropagateFrom(r2, c2);
    }

    var result = new int[height][];
    for (int r = 0; r < height; r++)
    {
        result[r] = new int[width];
        for (int c = 0; c < width; c++) result[r][c] = grid[r, c].First();
    }
    return result;
}
```
