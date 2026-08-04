---
name: ジャンプポイント探索(Jump Point Search)
category: 探索
subcategory: グラフ・経路探索
complexity: O(V)(理論上はA*と同じだが、実測で大幅に高速)
summary: 均一コストのグリッド上で「対称性のある冗長な経路」を数学的なルールで飛び越すことで、探索するノード数を大幅に減らすA*探索の高速化版。
---

## 概要

均一なコストのグリッド上での[A*探索](/algorithms/a-star)は、多くのマスが実質的に同じ意味を持つ(壁のない開けた領域では、どの経路も対称的で優劣がない)にもかかわらず、律儀に1マスずつ全てをノードとして探索してしまう。2011年にダニエル・ハラボーとアラン・グラントが発表したジャンプポイント探索(JPS)は、この対称性に着目し、「わざわざ立ち止まって調べる価値のある特別な地点(ジャンプポイント: 壁の角など、進路変更が意味を持つ地点)」だけを探索対象とすることで、[A*探索](/algorithms/a-star)と全く同じ最短経路を保証しながら、実測で数十倍から数百倍速く動作する。

## 仕組み

1. 基本的な骨格は[A*探索](/algorithms/a-star)と同じ(優先度付きキューで`f = g + h`が最小のノードを取り出して展開する)だが、隣接する1マスを単純に子ノードとして追加するのではなく、各方向について「その方向へ直進できるところまで一直線にジャンプする」処理を行う
2. 直進中、以下のいずれかに該当したら、その地点を「ジャンプポイント」として確定し探索キューに追加する: (a) ゴールに到達した、(b) 壁などの障害物にぶつかった、(c) 進行方向の左右に「強制近傍」(直進を続けると本来もっと早く到達できたはずの隣接マスを迂回してしまう、壁の角のような地点)が現れた
3. 斜め移動の場合は、直進(斜め方向)しながら、進行方向の水平・垂直成分についてもそれぞれ直進ジャンプを再帰的に試みる
4. こうして生成されたジャンプポイントだけをノードとして、通常の[A*探索](/algorithms/a-star)と同じ`g`・`h`の計算とキュー操作を行う

## 特性・トレードオフ

- **計算量**: 理論上の最悪計算量は[A*探索](/algorithms/a-star)と同じオーダーだが、実際に探索キューに追加されるノード数が劇的に少なくなるため、実測の速度は大幅に向上する(開けたマップほど効果が大きい)
- **均一コストグリッドという前提**: JPSの高速化は「全てのマスの移動コストが等しい」という前提に強く依存している。地形によって移動コストが異なる([ダイクストラ法](/algorithms/dijkstra)が必要になるような)重み付きグリッドには、そのままでは適用できない
- **最短経路の保証**: ジャンプポイントの選び方は恣意的な近似ではなく、「対称性のある経路のうち、少なくとも1つの最短経路上の分岐点は必ずジャンプポイントとして検出される」ことが数学的に証明されており、[A*探索](/algorithms/a-star)と全く同じ最適性を保証する
- **使いどころ**: ゲームのリアルタイム経路探索(RTSゲームの大量ユニットの同時経路計算、オープンワールドゲームのNPC移動)、倉庫内搬送ロボットのグリッドマップ上での高速経路計画。均一コストグリッドという条件を満たす場面での[A*探索](/algorithms/a-star)の事実上の上位互換として広く採用されている

## 実装例

```python
import heapq
import math

def in_bounds(grid: list[list[int]], x: int, y: int) -> bool:
    return 0 <= x < len(grid[0]) and 0 <= y < len(grid)

def walkable(grid: list[list[int]], x: int, y: int) -> bool:
    return in_bounds(grid, x, y) and grid[y][x] == 0

def jump(grid: list[list[int]], x: int, y: int, dx: int, dy: int, goal: tuple[int, int]):
    nx, ny = x + dx, y + dy
    if not walkable(grid, nx, ny):
        return None
    if (nx, ny) == goal:
        return (nx, ny)

    if dx != 0 and dy != 0:
        # 斜め移動: 強制近傍のチェック
        if (walkable(grid, nx - dx, ny + dy) and not walkable(grid, nx - dx, ny)) or \
           (walkable(grid, nx + dx, ny - dy) and not walkable(grid, nx, ny - dy)):
            return (nx, ny)
        if jump(grid, nx, ny, dx, 0, goal) is not None:
            return (nx, ny)
        if jump(grid, nx, ny, 0, dy, goal) is not None:
            return (nx, ny)
    elif dx != 0:
        if (walkable(grid, nx + dx, ny + 1) and not walkable(grid, nx, ny + 1)) or \
           (walkable(grid, nx + dx, ny - 1) and not walkable(grid, nx, ny - 1)):
            return (nx, ny)
    else:
        if (walkable(grid, nx + 1, ny + dy) and not walkable(grid, nx + 1, ny)) or \
           (walkable(grid, nx - 1, ny + dy) and not walkable(grid, nx - 1, ny)):
            return (nx, ny)

    return jump(grid, nx, ny, dx, dy, goal)


DIRS = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]

def heuristic(a: tuple[int, int], b: tuple[int, int]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])

def jps(grid: list[list[int]], start: tuple[int, int], goal: tuple[int, int]):
    open_heap = [(heuristic(start, goal), start)]
    g_score = {start: 0.0}
    came_from = {}
    closed = set()

    while open_heap:
        _, current = heapq.heappop(open_heap)
        if current in closed:
            continue
        if current == goal:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            return path[::-1]
        closed.add(current)
        cx, cy = current
        for dx, dy in DIRS:
            jp = jump(grid, cx, cy, dx, dy, goal)
            if jp is None:
                continue
            dist = math.hypot(jp[0] - cx, jp[1] - cy)
            tentative_g = g_score[current] + dist
            if jp not in g_score or tentative_g < g_score[jp]:
                g_score[jp] = tentative_g
                came_from[jp] = current
                heapq.heappush(open_heap, (tentative_g + heuristic(jp, goal), jp))
    return None
```

```typescript
type Pos = [number, number];

function inBounds(grid: number[][], x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length;
}
function walkable(grid: number[][], x: number, y: number): boolean {
  return inBounds(grid, x, y) && grid[y][x] === 0;
}

function jump(
  grid: number[][],
  x: number,
  y: number,
  dx: number,
  dy: number,
  goal: Pos,
): Pos | null {
  const nx = x + dx,
    ny = y + dy;
  if (!walkable(grid, nx, ny)) return null;
  if (nx === goal[0] && ny === goal[1]) return [nx, ny];

  if (dx !== 0 && dy !== 0) {
    if (
      (walkable(grid, nx - dx, ny + dy) && !walkable(grid, nx - dx, ny)) ||
      (walkable(grid, nx + dx, ny - dy) && !walkable(grid, nx, ny - dy))
    ) {
      return [nx, ny];
    }
    if (jump(grid, nx, ny, dx, 0, goal) !== null) return [nx, ny];
    if (jump(grid, nx, ny, 0, dy, goal) !== null) return [nx, ny];
  } else if (dx !== 0) {
    if (
      (walkable(grid, nx + dx, ny + 1) && !walkable(grid, nx, ny + 1)) ||
      (walkable(grid, nx + dx, ny - 1) && !walkable(grid, nx, ny - 1))
    ) {
      return [nx, ny];
    }
  } else {
    if (
      (walkable(grid, nx + 1, ny + dy) && !walkable(grid, nx + 1, ny)) ||
      (walkable(grid, nx - 1, ny + dy) && !walkable(grid, nx - 1, ny))
    ) {
      return [nx, ny];
    }
  }
  return jump(grid, nx, ny, dx, dy, goal);
}

const DIRS: Pos[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

function heuristic(a: Pos, b: Pos): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

class MinHeap {
  private items: [number, Pos][] = [];
  push(p: number, v: Pos): void {
    this.items.push([p, v]);
    this.items.sort((a, b) => a[0] - b[0]);
  }
  pop(): [number, Pos] | undefined {
    return this.items.shift();
  }
  get isEmpty(): boolean {
    return this.items.length === 0;
  }
}

function jps(grid: number[][], start: Pos, goal: Pos): Pos[] | null {
  const open = new MinHeap();
  open.push(heuristic(start, goal), start);
  const gScore = new Map<string, number>([[`${start[0]},${start[1]}`, 0]]);
  const cameFrom = new Map<string, Pos>();
  const closed = new Set<string>();

  while (!open.isEmpty) {
    const popped = open.pop();
    if (!popped) break;
    const current = popped[1];
    const key = `${current[0]},${current[1]}`;
    if (closed.has(key)) continue;
    if (current[0] === goal[0] && current[1] === goal[1]) {
      const path: Pos[] = [current];
      let curKey = key;
      while (cameFrom.has(curKey)) {
        const prev = cameFrom.get(curKey)!;
        path.push(prev);
        curKey = `${prev[0]},${prev[1]}`;
      }
      return path.reverse();
    }
    closed.add(key);
    const [cx, cy] = current;
    for (const [dx, dy] of DIRS) {
      const jp = jump(grid, cx, cy, dx, dy, goal);
      if (jp === null) continue;
      const jKey = `${jp[0]},${jp[1]}`;
      const dist = Math.hypot(jp[0] - cx, jp[1] - cy);
      const tentativeG = gScore.get(key)! + dist;
      if (!gScore.has(jKey) || tentativeG < gScore.get(jKey)!) {
        gScore.set(jKey, tentativeG);
        cameFrom.set(jKey, current);
        open.push(tentativeG + heuristic(jp, goal), jp);
      }
    }
  }
  return null;
}
```

```cpp
#include <vector>
#include <cmath>
#include <optional>
#include <map>
#include <set>
#include <queue>
#include <utility>
#include <algorithm>

using Pos = std::pair<int, int>;

bool inBounds(const std::vector<std::vector<int>>& grid, int x, int y) {
    return y >= 0 && y < static_cast<int>(grid.size()) && x >= 0 && x < static_cast<int>(grid[0].size());
}
bool walkable(const std::vector<std::vector<int>>& grid, int x, int y) {
    return inBounds(grid, x, y) && grid[y][x] == 0;
}

std::optional<Pos> jump(const std::vector<std::vector<int>>& grid, int x, int y, int dx, int dy, Pos goal) {
    int nx = x + dx, ny = y + dy;
    if (!walkable(grid, nx, ny)) return std::nullopt;
    if (Pos{nx, ny} == goal) return Pos{nx, ny};

    if (dx != 0 && dy != 0) {
        if ((walkable(grid, nx - dx, ny + dy) && !walkable(grid, nx - dx, ny)) ||
            (walkable(grid, nx + dx, ny - dy) && !walkable(grid, nx, ny - dy))) {
            return Pos{nx, ny};
        }
        if (jump(grid, nx, ny, dx, 0, goal).has_value()) return Pos{nx, ny};
        if (jump(grid, nx, ny, 0, dy, goal).has_value()) return Pos{nx, ny};
    } else if (dx != 0) {
        if ((walkable(grid, nx + dx, ny + 1) && !walkable(grid, nx, ny + 1)) ||
            (walkable(grid, nx + dx, ny - 1) && !walkable(grid, nx, ny - 1))) {
            return Pos{nx, ny};
        }
    } else {
        if ((walkable(grid, nx + 1, ny + dy) && !walkable(grid, nx + 1, ny)) ||
            (walkable(grid, nx - 1, ny + dy) && !walkable(grid, nx - 1, ny))) {
            return Pos{nx, ny};
        }
    }
    return jump(grid, nx, ny, dx, dy, goal);
}

const std::vector<Pos> DIRS = {{-1, -1}, {0, -1}, {1, -1}, {-1, 0}, {1, 0}, {-1, 1}, {0, 1}, {1, 1}};

double heuristic(Pos a, Pos b) {
    return std::hypot(a.first - b.first, a.second - b.second);
}

std::optional<std::vector<Pos>> jps(const std::vector<std::vector<int>>& grid, Pos start, Pos goal) {
    using QueueItem = std::pair<double, Pos>;
    std::priority_queue<QueueItem, std::vector<QueueItem>, std::greater<QueueItem>> open;
    open.push({heuristic(start, goal), start});
    std::map<Pos, double> gScore{{start, 0.0}};
    std::map<Pos, Pos> cameFrom;
    std::set<Pos> closed;

    while (!open.empty()) {
        auto [f, current] = open.top();
        open.pop();
        if (closed.count(current)) continue;
        if (current == goal) {
            std::vector<Pos> path{current};
            while (cameFrom.count(current)) {
                current = cameFrom[current];
                path.push_back(current);
            }
            std::reverse(path.begin(), path.end());
            return path;
        }
        closed.insert(current);
        auto [cx, cy] = current;
        for (auto [dx, dy] : DIRS) {
            auto jp = jump(grid, cx, cy, dx, dy, goal);
            if (!jp.has_value()) continue;
            double dist = std::hypot(jp->first - cx, jp->second - cy);
            double tentativeG = gScore[current] + dist;
            if (!gScore.count(*jp) || tentativeG < gScore[*jp]) {
                gScore[*jp] = tentativeG;
                cameFrom[*jp] = current;
                open.push({tentativeG + heuristic(*jp, goal), *jp});
            }
        }
    }
    return std::nullopt;
}
```

```rust
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};

type Pos = (i32, i32);

fn in_bounds(grid: &[Vec<i32>], x: i32, y: i32) -> bool {
    y >= 0 && (y as usize) < grid.len() && x >= 0 && (x as usize) < grid[0].len()
}
fn walkable(grid: &[Vec<i32>], x: i32, y: i32) -> bool {
    in_bounds(grid, x, y) && grid[y as usize][x as usize] == 0
}

fn jump(grid: &[Vec<i32>], x: i32, y: i32, dx: i32, dy: i32, goal: Pos) -> Option<Pos> {
    let (nx, ny) = (x + dx, y + dy);
    if !walkable(grid, nx, ny) {
        return None;
    }
    if (nx, ny) == goal {
        return Some((nx, ny));
    }

    if dx != 0 && dy != 0 {
        if (walkable(grid, nx - dx, ny + dy) && !walkable(grid, nx - dx, ny))
            || (walkable(grid, nx + dx, ny - dy) && !walkable(grid, nx, ny - dy))
        {
            return Some((nx, ny));
        }
        if jump(grid, nx, ny, dx, 0, goal).is_some() {
            return Some((nx, ny));
        }
        if jump(grid, nx, ny, 0, dy, goal).is_some() {
            return Some((nx, ny));
        }
    } else if dx != 0 {
        if (walkable(grid, nx + dx, ny + 1) && !walkable(grid, nx, ny + 1))
            || (walkable(grid, nx + dx, ny - 1) && !walkable(grid, nx, ny - 1))
        {
            return Some((nx, ny));
        }
    } else {
        if (walkable(grid, nx + 1, ny + dy) && !walkable(grid, nx + 1, ny))
            || (walkable(grid, nx - 1, ny + dy) && !walkable(grid, nx - 1, ny))
        {
            return Some((nx, ny));
        }
    }
    jump(grid, nx, ny, dx, dy, goal)
}

const DIRS: [(i32, i32); 8] = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)];

fn heuristic(a: Pos, b: Pos) -> f64 {
    (((a.0 - b.0).pow(2) + (a.1 - b.1).pow(2)) as f64).sqrt()
}

#[derive(PartialEq)]
struct Candidate {
    f_score: f64,
    node: Pos,
}
impl Eq for Candidate {}
impl Ord for Candidate {
    fn cmp(&self, other: &Self) -> Ordering {
        other.f_score.partial_cmp(&self.f_score).unwrap_or(Ordering::Equal)
    }
}
impl PartialOrd for Candidate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn jps(grid: &[Vec<i32>], start: Pos, goal: Pos) -> Option<Vec<Pos>> {
    let mut open = BinaryHeap::new();
    open.push(Candidate { f_score: heuristic(start, goal), node: start });
    let mut g_score: HashMap<Pos, f64> = HashMap::new();
    g_score.insert(start, 0.0);
    let mut came_from: HashMap<Pos, Pos> = HashMap::new();
    let mut closed: HashSet<Pos> = HashSet::new();

    while let Some(Candidate { node: current, .. }) = open.pop() {
        if closed.contains(&current) {
            continue;
        }
        if current == goal {
            let mut path = vec![current];
            let mut cur = current;
            while let Some(&prev) = came_from.get(&cur) {
                path.push(prev);
                cur = prev;
            }
            path.reverse();
            return Some(path);
        }
        closed.insert(current);
        let (cx, cy) = current;
        for (dx, dy) in DIRS {
            if let Some(jp) = jump(grid, cx, cy, dx, dy, goal) {
                let dist = (((jp.0 - cx).pow(2) + (jp.1 - cy).pow(2)) as f64).sqrt();
                let tentative_g = g_score[&current] + dist;
                if !g_score.contains_key(&jp) || tentative_g < g_score[&jp] {
                    g_score.insert(jp, tentative_g);
                    came_from.insert(jp, current);
                    open.push(Candidate { f_score: tentative_g + heuristic(jp, goal), node: jp });
                }
            }
        }
    }
    None
}
```

```csharp
static bool InBounds(int[,] grid, int x, int y) => x >= 0 && x < grid.GetLength(1) && y >= 0 && y < grid.GetLength(0);
static bool Walkable(int[,] grid, int x, int y) => InBounds(grid, x, y) && grid[y, x] == 0;

static (int, int)? Jump(int[,] grid, int x, int y, int dx, int dy, (int, int) goal)
{
    int nx = x + dx, ny = y + dy;
    if (!Walkable(grid, nx, ny)) return null;
    if ((nx, ny) == goal) return (nx, ny);

    if (dx != 0 && dy != 0)
    {
        if ((Walkable(grid, nx - dx, ny + dy) && !Walkable(grid, nx - dx, ny)) ||
            (Walkable(grid, nx + dx, ny - dy) && !Walkable(grid, nx, ny - dy)))
            return (nx, ny);
        if (Jump(grid, nx, ny, dx, 0, goal) != null) return (nx, ny);
        if (Jump(grid, nx, ny, 0, dy, goal) != null) return (nx, ny);
    }
    else if (dx != 0)
    {
        if ((Walkable(grid, nx + dx, ny + 1) && !Walkable(grid, nx, ny + 1)) ||
            (Walkable(grid, nx + dx, ny - 1) && !Walkable(grid, nx, ny - 1)))
            return (nx, ny);
    }
    else
    {
        if ((Walkable(grid, nx + 1, ny + dy) && !Walkable(grid, nx + 1, ny)) ||
            (Walkable(grid, nx - 1, ny + dy) && !Walkable(grid, nx - 1, ny)))
            return (nx, ny);
    }
    return Jump(grid, nx, ny, dx, dy, goal);
}

static readonly (int, int)[] Dirs = { (-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1) };

static double Heuristic((int, int) a, (int, int) b) => Math.Sqrt(Math.Pow(a.Item1 - b.Item1, 2) + Math.Pow(a.Item2 - b.Item2, 2));

static List<(int, int)>? Jps(int[,] grid, (int, int) start, (int, int) goal)
{
    var open = new List<(double f, (int, int) node)> { (Heuristic(start, goal), start) };
    var gScore = new Dictionary<(int, int), double> { [start] = 0 };
    var cameFrom = new Dictionary<(int, int), (int, int)>();
    var closed = new HashSet<(int, int)>();

    while (open.Count > 0)
    {
        open.Sort((a, b) => a.f.CompareTo(b.f));
        var (_, current) = open[0];
        open.RemoveAt(0);
        if (closed.Contains(current)) continue;
        if (current == goal)
        {
            var path = new List<(int, int)> { current };
            var cur = current;
            while (cameFrom.ContainsKey(cur))
            {
                cur = cameFrom[cur];
                path.Add(cur);
            }
            path.Reverse();
            return path;
        }
        closed.Add(current);
        var (cx, cy) = current;
        foreach (var (dx, dy) in Dirs)
        {
            var jp = Jump(grid, cx, cy, dx, dy, goal);
            if (jp == null) continue;
            double dist = Math.Sqrt(Math.Pow(jp.Value.Item1 - cx, 2) + Math.Pow(jp.Value.Item2 - cy, 2));
            double tentativeG = gScore[current] + dist;
            if (!gScore.ContainsKey(jp.Value) || tentativeG < gScore[jp.Value])
            {
                gScore[jp.Value] = tentativeG;
                cameFrom[jp.Value] = current;
                open.Add((tentativeG + Heuristic(jp.Value, goal), jp.Value));
            }
        }
    }
    return null;
}
```
