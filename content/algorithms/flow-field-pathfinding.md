---
name: フローフィールド経路探索(Flow Field Pathfinding)
category: キャラクターAI・空間AI
subcategory: 群衆・マルチエージェント
complexity: O(V+E)(1回のフィールド構築、以降は各エージェントO(1)で参照)
summary: 目的地から逆方向にBFSで距離を伝播させ、各セルに「進むべき方向」を割り当てたベクトル場を一度だけ構築することで、何百・何千体ものユニットが同じ目的地へ向かう際の経路探索コストを共有できる。
---

## 概要

[A*探索](/algorithms/a-star)は1体のキャラクターが1つの目的地まで最短経路を求めるのには効率的だが、RTSゲームで数百体のユニットを同じ目的地へ一斉に移動させる場合、**ユニットの数だけA*探索を繰り返す**のは大きな無駄になる。フローフィールド経路探索は発想を転換し、「目的地は1つ、動くユニットは大量」という状況に特化して、**目的地から逆向きに1回だけ経路探索を行い、マップの全セルに『そのセルから目的地へ向かうにはどちらへ進めばよいか』という方向ベクトルを事前に割り当てておく**。以後、各ユニットは自分がいるセルのベクトルを参照するだけでよく、ユニット数が増えても追加の経路探索コストがほとんどかからない。RTSやタワーディフェンスゲームでの大規模な群衆移動の定番手法である。

## 仕組み

1. **統合コストフィールド(Integration Field)の構築**: 目的地のセルをコスト0として、[BFSやダイクストラ法](/algorithms/dijkstra)と同様の要領で、目的地から周囲のセルへ**逆方向に**コストを伝播させる。各セルには「そのセルから目的地までの最小到達コスト」が記録される
2. **フローフィールド(方向ベクトル場)の構築**: 統合コストフィールドが完成したら、各セルについて、隣接する8方向(または4方向)のセルの中で最もコストが低い方向を選び、そのセルの「進むべき方向」として記録する。これにより、マップ全体が「その場から目的地へ向かう最短の流れ」を示すベクトル場になる
3. **エージェントの移動**: 各ユニットは、毎フレーム自分が現在いるセルのフローベクトルを参照し、その方向へ移動するだけでよい。目的地までの経路をユニットごとに探索し直す必要は一切ない
4. 障害物やマップの構造が変化した場合(建物の破壊など)は、フローフィールドを再構築する必要があるが、これも目的地ごとに1回で済む(その目的地へ向かう全ユニットに再利用できる)

## 特性・トレードオフ

- **大量ユニットへのスケーラビリティ**: フィールドの構築コストは目的地ごとにO(V+E)(マップのセル数・隣接関係の数に比例)で済み、以降のユニットの移動判断はO(1)の参照だけになる。ユニット数が増えるほど[A*](/algorithms/a-star)を個別に実行するより圧倒的に有利になる
- **目的地が固定されていることが前提**: フローフィールドは特定の目的地に対して構築されるため、ユニットごとに目的地が異なる状況(各ユニットがバラバラの場所へ向かう)には向かない。「大勢が同じ場所を目指す」という群衆的なシナリオに特化した手法である
- **局所的な衝突回避との併用**: フローフィールドはマップ全体の大域的な流れを示すが、ユニット同士がすれ違う際の細かい衝突回避までは扱わない。実務では、フローフィールドで大まかな方向を決め、その上で[RVO](/algorithms/reciprocal-velocity-obstacles)や[ソーシャルフォースモデル](/algorithms/social-force-model)のような局所的な回避手法を重ねて使うのが一般的である
- **使いどころ**: RTSゲームの大規模なユニット移動(『Supreme Commander』での採用が有名)、タワーディフェンスゲームの敵の進軍経路、群衆シミュレーションにおける大域的な移動方向の決定、避難シミュレーションの避難誘導方向計算

## 実装例

```python
from collections import deque

def build_integration_field(walls: list[list[bool]], goal: tuple[int, int]) -> list[list[int]]:
    rows, cols = len(walls), len(walls[0])
    cost = [[-1] * cols for _ in range(rows)]
    gy, gx = goal
    cost[gy][gx] = 0
    queue = deque([goal])
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    while queue:
        y, x = queue.popleft()
        for dy, dx in directions:
            ny, nx = y + dy, x + dx
            if 0 <= ny < rows and 0 <= nx < cols and not walls[ny][nx] and cost[ny][nx] == -1:
                cost[ny][nx] = cost[y][x] + 1
                queue.append((ny, nx))
    return cost

def build_flow_field(cost: list[list[int]]) -> list[list[tuple[int, int]]]:
    rows, cols = len(cost), len(cost[0])
    flow = [[(0, 0)] * cols for _ in range(rows)]
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]

    for y in range(rows):
        for x in range(cols):
            if cost[y][x] == 0:
                continue
            best_dir, best_cost = (0, 0), cost[y][x]
            for dy, dx in directions:
                ny, nx = y + dy, x + dx
                if 0 <= ny < rows and 0 <= nx < cols and cost[ny][nx] != -1 and cost[ny][nx] < best_cost:
                    best_cost = cost[ny][nx]
                    best_dir = (dy, dx)
            flow[y][x] = best_dir
    return flow
```

```typescript
function buildIntegrationField(
  walls: boolean[][],
  goal: [number, number],
): number[][] {
  const rows = walls.length,
    cols = walls[0].length;
  const cost: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(-1),
  );
  const [gy, gx] = goal;
  cost[gy][gx] = 0;
  const queue: [number, number][] = [[gy, gx]];
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (queue.length > 0) {
    const [y, x] = queue.shift()!;
    for (const [dy, dx] of directions) {
      const ny = y + dy,
        nx = x + dx;
      if (
        ny >= 0 &&
        ny < rows &&
        nx >= 0 &&
        nx < cols &&
        !walls[ny][nx] &&
        cost[ny][nx] === -1
      ) {
        cost[ny][nx] = cost[y][x] + 1;
        queue.push([ny, nx]);
      }
    }
  }
  return cost;
}

function buildFlowField(cost: number[][]): [number, number][][] {
  const rows = cost.length,
    cols = cost[0].length;
  const flow: [number, number][][] = Array.from({ length: rows }, () =>
    new Array(cols).fill([0, 0]),
  );
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (cost[y][x] === 0) continue;
      let bestDir: [number, number] = [0, 0];
      let bestCost = cost[y][x];
      for (const [dy, dx] of directions) {
        const ny = y + dy,
          nx = x + dx;
        if (
          ny >= 0 &&
          ny < rows &&
          nx >= 0 &&
          nx < cols &&
          cost[ny][nx] !== -1 &&
          cost[ny][nx] < bestCost
        ) {
          bestCost = cost[ny][nx];
          bestDir = [dy, dx];
        }
      }
      flow[y][x] = bestDir;
    }
  }
  return flow;
}
```

```cpp
#include <vector>
#include <queue>
#include <utility>

std::vector<std::vector<int>> buildIntegrationField(const std::vector<std::vector<bool>>& walls, std::pair<int, int> goal) {
    int rows = static_cast<int>(walls.size()), cols = static_cast<int>(walls[0].size());
    std::vector<std::vector<int>> cost(rows, std::vector<int>(cols, -1));
    cost[goal.first][goal.second] = 0;
    std::queue<std::pair<int, int>> q;
    q.push(goal);
    const int dirs[4][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    while (!q.empty()) {
        auto [y, x] = q.front(); q.pop();
        for (auto& d : dirs) {
            int ny = y + d[0], nx = x + d[1];
            if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && !walls[ny][nx] && cost[ny][nx] == -1) {
                cost[ny][nx] = cost[y][x] + 1;
                q.push({ny, nx});
            }
        }
    }
    return cost;
}

std::vector<std::vector<std::pair<int, int>>> buildFlowField(const std::vector<std::vector<int>>& cost) {
    int rows = static_cast<int>(cost.size()), cols = static_cast<int>(cost[0].size());
    std::vector<std::vector<std::pair<int, int>>> flow(rows, std::vector<std::pair<int, int>>(cols, {0, 0}));
    const int dirs[8][2] = {{-1,0},{1,0},{0,-1},{0,1},{-1,-1},{-1,1},{1,-1},{1,1}};

    for (int y = 0; y < rows; y++) {
        for (int x = 0; x < cols; x++) {
            if (cost[y][x] == 0) continue;
            std::pair<int, int> bestDir = {0, 0};
            int bestCost = cost[y][x];
            for (auto& d : dirs) {
                int ny = y + d[0], nx = x + d[1];
                if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && cost[ny][nx] != -1 && cost[ny][nx] < bestCost) {
                    bestCost = cost[ny][nx];
                    bestDir = {d[0], d[1]};
                }
            }
            flow[y][x] = bestDir;
        }
    }
    return flow;
}
```

```rust
use std::collections::VecDeque;

fn build_integration_field(walls: &[Vec<bool>], goal: (usize, usize)) -> Vec<Vec<i32>> {
    let rows = walls.len();
    let cols = walls[0].len();
    let mut cost = vec![vec![-1i32; cols]; rows];
    cost[goal.0][goal.1] = 0;
    let mut queue = VecDeque::new();
    queue.push_back(goal);
    let directions: [(i32, i32); 4] = [(-1, 0), (1, 0), (0, -1), (0, 1)];

    while let Some((y, x)) = queue.pop_front() {
        for &(dy, dx) in &directions {
            let ny = y as i32 + dy;
            let nx = x as i32 + dx;
            if ny >= 0 && (ny as usize) < rows && nx >= 0 && (nx as usize) < cols {
                let (nyu, nxu) = (ny as usize, nx as usize);
                if !walls[nyu][nxu] && cost[nyu][nxu] == -1 {
                    cost[nyu][nxu] = cost[y][x] + 1;
                    queue.push_back((nyu, nxu));
                }
            }
        }
    }
    cost
}

fn build_flow_field(cost: &[Vec<i32>]) -> Vec<Vec<(i32, i32)>> {
    let rows = cost.len();
    let cols = cost[0].len();
    let mut flow = vec![vec![(0, 0); cols]; rows];
    let directions: [(i32, i32); 8] = [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)];

    for y in 0..rows {
        for x in 0..cols {
            if cost[y][x] == 0 {
                continue;
            }
            let mut best_dir = (0, 0);
            let mut best_cost = cost[y][x];
            for &(dy, dx) in &directions {
                let ny = y as i32 + dy;
                let nx = x as i32 + dx;
                if ny >= 0 && (ny as usize) < rows && nx >= 0 && (nx as usize) < cols {
                    let c = cost[ny as usize][nx as usize];
                    if c != -1 && c < best_cost {
                        best_cost = c;
                        best_dir = (dy, dx);
                    }
                }
            }
            flow[y][x] = best_dir;
        }
    }
    flow
}
```

```csharp
static int[][] BuildIntegrationField(bool[][] walls, (int y, int x) goal)
{
    int rows = walls.Length, cols = walls[0].Length;
    var cost = new int[rows][];
    for (int i = 0; i < rows; i++) { cost[i] = new int[cols]; Array.Fill(cost[i], -1); }
    cost[goal.y][goal.x] = 0;
    var queue = new Queue<(int y, int x)>();
    queue.Enqueue(goal);
    var dirs = new (int, int)[] { (-1, 0), (1, 0), (0, -1), (0, 1) };

    while (queue.Count > 0)
    {
        var (y, x) = queue.Dequeue();
        foreach (var (dy, dx) in dirs)
        {
            int ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && !walls[ny][nx] && cost[ny][nx] == -1)
            {
                cost[ny][nx] = cost[y][x] + 1;
                queue.Enqueue((ny, nx));
            }
        }
    }
    return cost;
}

static (int, int)[][] BuildFlowField(int[][] cost)
{
    int rows = cost.Length, cols = cost[0].Length;
    var flow = new (int, int)[rows][];
    for (int i = 0; i < rows; i++) flow[i] = new (int, int)[cols];
    var dirs = new (int, int)[] { (-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1) };

    for (int y = 0; y < rows; y++)
    {
        for (int x = 0; x < cols; x++)
        {
            if (cost[y][x] == 0) continue;
            var bestDir = (0, 0);
            int bestCost = cost[y][x];
            foreach (var (dy, dx) in dirs)
            {
                int ny = y + dy, nx = x + dx;
                if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && cost[ny][nx] != -1 && cost[ny][nx] < bestCost)
                {
                    bestCost = cost[ny][nx];
                    bestDir = (dy, dx);
                }
            }
            flow[y][x] = bestDir;
        }
    }
    return flow;
}
```
