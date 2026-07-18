---
name: 関節点(articulation points)の発見
category: グラフ
subcategory: 連結性・順序
complexity: O(V+E)
summary: 深さ優先探索の訪問順序と「その頂点を経由せずにどれだけ根に近い祖先まで戻れるか」の2つの数値を比較するだけで、取り除くとグラフが分断されてしまう頂点を線形時間で発見する。
---

## 概要

ネットワークの中には、それを取り除くとグラフ全体が複数の非連結な部分に分かれてしまう「弱点」となる頂点が存在することがある(通信ネットワークの中継局、道路網の橋渡し役の交差点など)。このような頂点を関節点(articulation point、または切断点/cut vertexとも呼ばれる)と呼ぶ。[Tarjanの強連結成分分解](/algorithms/tarjan-scc)と同じ「深さ優先探索の訪問順序と、そこから到達できる最も浅い祖先」という発想を無向グラフに応用することで、全ての関節点をたった1回の[DFS](/algorithms/dfs)、つまり`O(V+E)`で発見できる。

## 仕組み

1. グラフ全体に対して[DFS](/algorithms/dfs)を行い、各頂点に訪問順序`disc[v]`(discovery time)を記録する
2. 各頂点`v`について、`v`の部分木(DFS木でvの子孫)から、`v`自身を経由せずに逆行(バックエッジ)で到達できる最も浅い(訪問順序が最小の)頂点の`disc`値を`low[v]`として計算する: `low[v] = min(disc[v], 子の全てのlow値, バックエッジで繋がる頂点のdisc値)`
3. **根でない頂点`v`が関節点になる条件**: `v`のある子`c`について`low[c] >= disc[v]`が成り立つ場合。これは「`c`以下の部分木からは、`v`を経由しない限り`v`より浅い場所へ戻れない」ことを意味し、`v`を取り除くとその部分木が切り離されてしまうことを示す
4. **DFS木の根が関節点になる条件**: 根が2つ以上の子を持つ場合(根を経由しない限り、それぞれの子の部分木同士が繋がっていないことを意味する)
5. 全頂点についてこの判定を行うことで、グラフ中の全ての関節点を1回の探索で列挙できる

## 特性・トレードオフ

- **計算量**: [DFS](/algorithms/dfs)1回分の`O(V+E)`。関節点の候補を総当たりで1つずつ取り除いて連結性を確認する素朴な方法(`O(V×(V+E))`)と比べ、桁違いに効率的である
- **[橋(bridges)の発見](/algorithms/bridges-finding)との構造的な類似性**: 関節点(頂点の弱点)と橋(辺の弱点)は、どちらも同じ`disc`・`low`の枠組みで、判定条件を頂点基準にするか辺基準にするかだけの違いで求められる、姉妹関係にあるアルゴリズムである
- **二重連結成分分解への発展**: 関節点を全て特定すると、グラフを「関節点を除けば内部で二重に連結している(1つの頂点や辺を取り除いても分断されない)」部分(二重連結成分/biconnected components)に分解できる——ネットワークの冗長性設計の基礎になる
- **使いどころ**: 通信ネットワーク・電力網における単一障害点(SPOF: Single Point of Failure)の特定、交通網における交通の要衝の識別、ソーシャルネットワーク分析におけるコミュニティを繋ぐ「橋渡し役」のユーザーの発見

## 実装例

```python
def find_articulation_points(n: int, adj: list[list[int]]) -> set[int]:
    disc = [-1] * n  # 訪問順序(discovery time)
    low = [0] * n
    articulation_points: set[int] = set()
    timer = 0

    def dfs(u: int, parent: int) -> None:
        nonlocal timer
        disc[u] = low[u] = timer
        timer += 1
        children = 0

        for v in adj[u]:
            if v == parent:
                continue
            if disc[v] == -1:
                children += 1
                dfs(v, u)
                low[u] = min(low[u], low[v])
                # 根でない頂点uが関節点になる条件: low[子] >= disc[u]
                if parent != -1 and low[v] >= disc[u]:
                    articulation_points.add(u)
            else:
                low[u] = min(low[u], disc[v])  # バックエッジ

        # DFS木の根が関節点になる条件: 子が2つ以上
        if parent == -1 and children >= 2:
            articulation_points.add(u)

    for start in range(n):
        if disc[start] == -1:
            dfs(start, -1)

    return articulation_points
```

```typescript
function findArticulationPoints(n: number, adj: number[][]): Set<number> {
  const disc = new Array(n).fill(-1); // 訪問順序(discovery time)
  const low = new Array(n).fill(0);
  const result = new Set<number>();
  let timer = 0;

  function dfs(u: number, parent: number): void {
    disc[u] = low[u] = timer++;
    let children = 0;

    for (const v of adj[u]) {
      if (v === parent) continue;
      if (disc[v] === -1) {
        children++;
        dfs(v, u);
        low[u] = Math.min(low[u], low[v]);
        // 根でない頂点uが関節点になる条件: low[子] >= disc[u]
        if (parent !== -1 && low[v] >= disc[u]) {
          result.add(u);
        }
      } else {
        low[u] = Math.min(low[u], disc[v]); // バックエッジ
      }
    }

    // DFS木の根が関節点になる条件: 子が2つ以上
    if (parent === -1 && children >= 2) {
      result.add(u);
    }
  }

  for (let start = 0; start < n; start++) {
    if (disc[start] === -1) dfs(start, -1);
  }

  return result;
}
```

```cpp
#include <vector>
#include <set>
#include <algorithm>

std::set<int> findArticulationPoints(int n, const std::vector<std::vector<int>>& adj) {
    std::vector<int> disc(n, -1), low(n, 0); // discは訪問順序(discovery time)
    std::set<int> result;
    int timer = 0;

    std::function<void(int, int)> dfs = [&](int u, int parent) {
        disc[u] = low[u] = timer++;
        int children = 0;

        for (int v : adj[u]) {
            if (v == parent) continue;
            if (disc[v] == -1) {
                children++;
                dfs(v, u);
                low[u] = std::min(low[u], low[v]);
                // 根でない頂点uが関節点になる条件: low[子] >= disc[u]
                if (parent != -1 && low[v] >= disc[u]) {
                    result.insert(u);
                }
            } else {
                low[u] = std::min(low[u], disc[v]); // バックエッジ
            }
        }

        // DFS木の根が関節点になる条件: 子が2つ以上
        if (parent == -1 && children >= 2) {
            result.insert(u);
        }
    };

    for (int start = 0; start < n; start++) {
        if (disc[start] == -1) dfs(start, -1);
    }

    return result;
}
```

```rust
fn find_articulation_points(n: usize, adj: &[Vec<usize>]) -> std::collections::HashSet<usize> {
    let mut disc = vec![-1i64; n]; // 訪問順序(discovery time)
    let mut low = vec![0i64; n];
    let mut result = std::collections::HashSet::new();
    let mut timer = 0i64;

    fn dfs(
        u: usize,
        parent: i64,
        adj: &[Vec<usize>],
        disc: &mut [i64],
        low: &mut [i64],
        timer: &mut i64,
        result: &mut std::collections::HashSet<usize>,
    ) {
        disc[u] = *timer;
        low[u] = *timer;
        *timer += 1;
        let mut children = 0;

        for &v in &adj[u] {
            if v as i64 == parent {
                continue;
            }
            if disc[v] == -1 {
                children += 1;
                dfs(v, u as i64, adj, disc, low, timer, result);
                low[u] = low[u].min(low[v]);
                // 根でない頂点uが関節点になる条件: low[子] >= disc[u]
                if parent != -1 && low[v] >= disc[u] {
                    result.insert(u);
                }
            } else {
                low[u] = low[u].min(disc[v]); // バックエッジ
            }
        }

        // DFS木の根が関節点になる条件: 子が2つ以上
        if parent == -1 && children >= 2 {
            result.insert(u);
        }
    }

    for start in 0..n {
        if disc[start] == -1 {
            dfs(start, -1, adj, &mut disc, &mut low, &mut timer, &mut result);
        }
    }

    result
}
```

```csharp
static HashSet<int> FindArticulationPoints(int n, List<int>[] adj)
{
    var disc = new int[n]; // 訪問順序(discovery time)
    var low = new int[n];
    Array.Fill(disc, -1);
    var result = new HashSet<int>();
    int timer = 0;

    void Dfs(int u, int parent)
    {
        disc[u] = low[u] = timer++;
        int children = 0;

        foreach (var v in adj[u])
        {
            if (v == parent) continue;
            if (disc[v] == -1)
            {
                children++;
                Dfs(v, u);
                low[u] = Math.Min(low[u], low[v]);
                // 根でない頂点uが関節点になる条件: low[子] >= disc[u]
                if (parent != -1 && low[v] >= disc[u]) result.Add(u);
            }
            else
            {
                low[u] = Math.Min(low[u], disc[v]); // バックエッジ
            }
        }

        // DFS木の根が関節点になる条件: 子が2つ以上
        if (parent == -1 && children >= 2) result.Add(u);
    }

    for (int start = 0; start < n; start++)
    {
        if (disc[start] == -1) Dfs(start, -1);
    }

    return result;
}
```
