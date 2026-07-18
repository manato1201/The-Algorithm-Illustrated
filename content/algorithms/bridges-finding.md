---
name: 橋(bridges)の発見
category: グラフ
subcategory: 連結性・順序
complexity: O(V+E)
summary: 取り除くとグラフが分断されてしまう辺を、関節点の発見と全く同じdisc・lowの枠組みで、辺を基準にした判定条件に置き換えるだけで線形時間で発見する。
---

## 概要

[関節点の発見](/algorithms/articulation-points)がグラフの「弱点となる頂点」を探すのに対し、橋(bridge、または切断辺/cut edgeとも呼ばれる)は「取り除くとグラフが分断されてしまう辺」を指す。道路網でいえば、その道が唯一の連絡路になっている(迂回路のない)区間に相当する。関節点の発見と全く同じ`disc`(訪問順序)・`low`(バックエッジで到達できる最も浅い頂点)という枠組みを使い、判定条件を「頂点」から「辺」に置き換えるだけで、全ての橋を1回の[DFS](/algorithms/dfs)、`O(V+E)`で発見できる。

## 仕組み

1. グラフ全体に対して[DFS](/algorithms/dfs)を行い、[関節点の発見](/algorithms/articulation-points)と同様に各頂点の訪問順序`disc[v]`と、`low[v]`(その頂点の部分木からバックエッジで到達できる最も浅い頂点の`disc`値)を計算する
2. DFS木の辺`(u, v)`(`u`が`v`の親)について、`low[v] > disc[u]`が成り立つ場合、その辺`(u, v)`は橋である——これは「`v`以下の部分木のどこからも、この辺を使わずに`u`かそれより浅い頂点へ戻る手段がない」ことを意味し、この辺を取り除くと`v`以下の部分木が切り離されてしまうことを示す
3. `low[v] <= disc[u]`であれば、`v`以下の部分木のどこかから`u`かそれより浅い頂点へ直接繋がるバックエッジ(迂回路)が存在するため、`(u,v)`を取り除いてもグラフは分断されず、橋ではない
4. 全てのDFS木の辺についてこの判定を行うことで、グラフ中の全ての橋を1回の探索で列挙できる

## 特性・トレードオフ

- **計算量**: [関節点の発見](/algorithms/articulation-points)と全く同じ`O(V+E)`。同じDFS走査の中で、頂点の判定(関節点)と辺の判定(橋)を同時に行うことも容易にできる
- **[関節点の発見](/algorithms/articulation-points)との判定条件の違い**: 関節点は`low[子] >= disc[自分]`(等号を含む、複数の子から同じ浅さの祖先に戻れても関節点になりうる)なのに対し、橋は`low[子] > disc[自分]`(厳密な不等号、迂回路が全くない場合のみ)という、一見似ているが意味の異なる条件になっている点に注意が必要——この違いを理解することが両アルゴリズムの正確な実装の鍵になる
- **辺連結成分分解への発展**: 全ての橋を取り除くと、グラフは「橋を使わない限り互いに行き来できる」部分(辺連結成分)に分解される。これは[関節点の発見](/algorithms/articulation-points)がもたらす二重連結成分分解の、辺バージョンに相当する
- **使いどころ**: ネットワークインフラにおける単一障害点となる回線の特定、電力網の冗長化設計(橋になっている送電線を優先的に複線化する)、化学構造解析における分子の橋渡し結合の特定

## 実装例

```python
def find_bridges(n: int, adj: list[list[int]]) -> list[tuple[int, int]]:
    disc = [-1] * n  # 訪問順序(discovery time)
    low = [0] * n
    bridges: list[tuple[int, int]] = []
    timer = 0

    def dfs(u: int, parent: int) -> None:
        nonlocal timer
        disc[u] = low[u] = timer
        timer += 1
        skipped_parent = False  # 多重辺を考慮し、親への戻りは1回だけスキップする

        for v in adj[u]:
            if v == parent and not skipped_parent:
                skipped_parent = True
                continue
            if disc[v] == -1:
                dfs(v, u)
                low[u] = min(low[u], low[v])
                # 橋の条件: low[子] > disc[u] (関節点の条件と違い、厳密な不等号)
                if low[v] > disc[u]:
                    bridges.append((u, v))
            else:
                low[u] = min(low[u], disc[v])  # バックエッジ

    for start in range(n):
        if disc[start] == -1:
            dfs(start, -1)

    return bridges
```

```typescript
function findBridges(n: number, adj: number[][]): [number, number][] {
  const disc = new Array(n).fill(-1); // 訪問順序(discovery time)
  const low = new Array(n).fill(0);
  const bridges: [number, number][] = [];
  let timer = 0;

  function dfs(u: number, parent: number): void {
    disc[u] = low[u] = timer++;
    let skippedParent = false; // 多重辺を考慮し、親への戻りは1回だけスキップする

    for (const v of adj[u]) {
      if (v === parent && !skippedParent) {
        skippedParent = true;
        continue;
      }
      if (disc[v] === -1) {
        dfs(v, u);
        low[u] = Math.min(low[u], low[v]);
        // 橋の条件: low[子] > disc[u] (関節点の条件と違い、厳密な不等号)
        if (low[v] > disc[u]) {
          bridges.push([u, v]);
        }
      } else {
        low[u] = Math.min(low[u], disc[v]); // バックエッジ
      }
    }
  }

  for (let start = 0; start < n; start++) {
    if (disc[start] === -1) dfs(start, -1);
  }

  return bridges;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <functional>

std::vector<std::pair<int, int>> findBridges(int n, const std::vector<std::vector<int>>& adj) {
    std::vector<int> disc(n, -1), low(n, 0); // discは訪問順序(discovery time)
    std::vector<std::pair<int, int>> bridges;
    int timer = 0;

    std::function<void(int, int)> dfs = [&](int u, int parent) {
        disc[u] = low[u] = timer++;
        bool skippedParent = false; // 多重辺を考慮し、親への戻りは1回だけスキップする

        for (int v : adj[u]) {
            if (v == parent && !skippedParent) {
                skippedParent = true;
                continue;
            }
            if (disc[v] == -1) {
                dfs(v, u);
                low[u] = std::min(low[u], low[v]);
                // 橋の条件: low[子] > disc[u] (関節点の条件と違い、厳密な不等号)
                if (low[v] > disc[u]) {
                    bridges.push_back({u, v});
                }
            } else {
                low[u] = std::min(low[u], disc[v]); // バックエッジ
            }
        }
    };

    for (int start = 0; start < n; start++) {
        if (disc[start] == -1) dfs(start, -1);
    }

    return bridges;
}
```

```rust
fn find_bridges(n: usize, adj: &[Vec<usize>]) -> Vec<(usize, usize)> {
    let mut disc = vec![-1i64; n]; // 訪問順序(discovery time)
    let mut low = vec![0i64; n];
    let mut bridges = Vec::new();
    let mut timer = 0i64;

    fn dfs(
        u: usize,
        parent: i64,
        adj: &[Vec<usize>],
        disc: &mut [i64],
        low: &mut [i64],
        timer: &mut i64,
        bridges: &mut Vec<(usize, usize)>,
    ) {
        disc[u] = *timer;
        low[u] = *timer;
        *timer += 1;
        let mut skipped_parent = false; // 多重辺を考慮し、親への戻りは1回だけスキップする

        for &v in &adj[u] {
            if v as i64 == parent && !skipped_parent {
                skipped_parent = true;
                continue;
            }
            if disc[v] == -1 {
                dfs(v, u as i64, adj, disc, low, timer, bridges);
                low[u] = low[u].min(low[v]);
                // 橋の条件: low[子] > disc[u] (関節点の条件と違い、厳密な不等号)
                if low[v] > disc[u] {
                    bridges.push((u, v));
                }
            } else {
                low[u] = low[u].min(disc[v]); // バックエッジ
            }
        }
    }

    for start in 0..n {
        if disc[start] == -1 {
            dfs(start, -1, adj, &mut disc, &mut low, &mut timer, &mut bridges);
        }
    }

    bridges
}
```

```csharp
static List<(int, int)> FindBridges(int n, List<int>[] adj)
{
    var disc = new int[n]; // 訪問順序(discovery time)
    var low = new int[n];
    Array.Fill(disc, -1);
    var bridges = new List<(int, int)>();
    int timer = 0;

    void Dfs(int u, int parent)
    {
        disc[u] = low[u] = timer++;
        bool skippedParent = false; // 多重辺を考慮し、親への戻りは1回だけスキップする

        foreach (var v in adj[u])
        {
            if (v == parent && !skippedParent)
            {
                skippedParent = true;
                continue;
            }
            if (disc[v] == -1)
            {
                Dfs(v, u);
                low[u] = Math.Min(low[u], low[v]);
                // 橋の条件: low[子] > disc[u] (関節点の条件と違い、厳密な不等号)
                if (low[v] > disc[u]) bridges.Add((u, v));
            }
            else
            {
                low[u] = Math.Min(low[u], disc[v]); // バックエッジ
            }
        }
    }

    for (int start = 0; start < n; start++)
    {
        if (disc[start] == -1) Dfs(start, -1);
    }

    return bridges;
}
```
