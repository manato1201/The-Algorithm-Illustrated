---
name: SPFA(Shortest Path Faster Algorithm)
category: グラフ
subcategory: 最短路
complexity: O(V×E)(最悪、平均的にはO(E)に近いことが多い)
summary: ベルマン・フォード法の「全辺を毎回緩和する」総当たりを、キューで「更新された頂点だけ」を再処理する形に絞り込むことで、実務上しばしば高速化する最短路アルゴリズム。
---

## 概要

[ベルマン・フォード法](/algorithms/bellman-ford)は、負の重みを持つ辺があっても最短路を求められる頑健さを持つが、`V-1`回全ての辺を律儀に緩和し続けるため、実際にはとっくに最短距離が確定している頂点についても無駄な再計算を繰り返してしまう。SPFA(Shortest Path Faster Algorithm、段旭東によって発展させられた手法)は、[Kahnのアルゴリズム](/algorithms/kahn)のようなキューベースの考え方を導入し、「距離が更新された頂点だけ」をキューに積んで再処理することで、この無駄を削減する。[ベルマン・フォード法](/algorithms/bellman-ford)と同じ最悪計算量を持ちながら、多くの実務上のグラフでは大幅に高速に動作する。

## 仕組み

1. スタート頂点の距離を0、他の全頂点の距離を`∞`に初期化し、スタート頂点をキューに追加する
2. キューが空になるまで、頂点`u`を取り出し、`u`から出る全ての辺`(u,v)`について緩和を試みる: `dist[v] > dist[u] + weight(u,v)`なら`dist[v]`を更新する
3. 距離が更新された頂点`v`が現在キューに入っていなければ、キューに追加する(既にキューに入っている頂点は重複して追加しない)
4. キューが空になったら、全頂点の最短距離が確定している([ベルマン・フォード法](/algorithms/bellman-ford)と同様、負閉路があれば無限に更新が続くため、頂点がキューに入った回数が`V`回を超えたら負閉路の存在を検出できる)

## 特性・トレードオフ

- **計算量**: 最悪計算量は[ベルマン・フォード法](/algorithms/bellman-ford)と同じ`O(V×E)`(特定の意地悪なグラフ構造ではキューへの出入りが繰り返される)だが、実務でよく現れるグラフ(疎なグラフ、グリッド状のグラフ等)では経験的に`O(E)`に近い速度で動作することが多い
- **負閉路検出**: [ベルマン・フォード法](/algorithms/bellman-ford)と同様、負の閉路がある場合はそれを検出できる(ある頂点がキューに`V`回以上入ったら負閉路が存在する)
- **最悪ケースへの脆弱性**: 特定の意地悪な入力(いわゆるSPFA殺しのグラフ)に対しては[ベルマン・フォード法](/algorithms/bellman-ford)より遅くなることがあり、競技プログラミングの文脈では「SPFAは死んだ」と揶揄されるほど最悪計算量への注意が必要——理論的な保証よりも経験的な高速さに頼る手法であることを理解して使う必要がある
- **使いどころ**: 負の辺を含む可能性のあるグラフでの実務的な最短路計算(理論的な最悪ケースへの耐性より平均的な速度を優先したい場面)、競技プログラミングにおける[ベルマン・フォード法](/algorithms/bellman-ford)の実装上の高速化版として広く使われてきた歴史がある

## 実装例

```python
import math
from collections import deque


def spfa(n: int, edges: list[tuple[int, int, float]], source: int):
    """辺リスト(u, v, weight)の有向グラフに対するSPFA。負閉路があれば (None, True) を返す"""
    adj: list[list[tuple[int, float]]] = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))

    dist = [math.inf] * n
    dist[source] = 0
    in_queue = [False] * n
    enqueue_count = [0] * n

    queue = deque([source])
    in_queue[source] = True

    while queue:
        u = queue.popleft()
        in_queue[u] = False
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if not in_queue[v]:
                    queue.append(v)
                    in_queue[v] = True
                    enqueue_count[v] += 1
                    if enqueue_count[v] > n:
                        return None, True  # 負閉路を検出

    return dist, False
```

```typescript
type Edge = [number, number, number];

// 辺リスト(u, v, weight)の有向グラフに対するSPFA。負閉路があれば hasNegativeCycle=true を返す
function spfa(n: number, edges: Edge[], source: number): { dist: number[] | null; hasNegativeCycle: boolean } {
  const adj: [number, number][][] = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adj[u].push([v, w]);

  const dist = new Array(n).fill(Infinity);
  dist[source] = 0;
  const inQueue = new Array(n).fill(false);
  const enqueueCount = new Array(n).fill(0);

  const queue: number[] = [source];
  inQueue[source] = true;
  let head = 0;

  while (head < queue.length) {
    const u = queue[head++];
    inQueue[u] = false;
    for (const [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        if (!inQueue[v]) {
          queue.push(v);
          inQueue[v] = true;
          enqueueCount[v]++;
          if (enqueueCount[v] > n) {
            return { dist: null, hasNegativeCycle: true }; // 負閉路を検出
          }
        }
      }
    }
  }

  return { dist, hasNegativeCycle: false };
}
```

```cpp
#include <vector>
#include <queue>
#include <limits>
#include <tuple>
#include <optional>

// 辺リスト(u, v, weight)の有向グラフに対するSPFA。負閉路があればstd::nulloptを返す
std::optional<std::vector<double>> spfa(int n, const std::vector<std::tuple<int, int, double>>& edges, int source) {
    std::vector<std::vector<std::pair<int, double>>> adj(n);
    for (auto& [u, v, w] : edges) adj[u].push_back({v, w});

    std::vector<double> dist(n, std::numeric_limits<double>::infinity());
    dist[source] = 0;
    std::vector<bool> inQueue(n, false);
    std::vector<int> enqueueCount(n, 0);

    std::queue<int> queue;
    queue.push(source);
    inQueue[source] = true;

    while (!queue.empty()) {
        int u = queue.front();
        queue.pop();
        inQueue[u] = false;
        for (auto& [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (!inQueue[v]) {
                    queue.push(v);
                    inQueue[v] = true;
                    enqueueCount[v]++;
                    if (enqueueCount[v] > n) return std::nullopt; // 負閉路を検出
                }
            }
        }
    }

    return dist;
}
```

```rust
use std::collections::VecDeque;

// 辺リスト(u, v, weight)の有向グラフに対するSPFA。負閉路があればNoneを返す
fn spfa(n: usize, edges: &[(usize, usize, f64)], source: usize) -> Option<Vec<f64>> {
    let mut adj: Vec<Vec<(usize, f64)>> = vec![Vec::new(); n];
    for &(u, v, w) in edges {
        adj[u].push((v, w));
    }

    let mut dist = vec![f64::INFINITY; n];
    dist[source] = 0.0;
    let mut in_queue = vec![false; n];
    let mut enqueue_count = vec![0u32; n];

    let mut queue = VecDeque::new();
    queue.push_back(source);
    in_queue[source] = true;

    while let Some(u) = queue.pop_front() {
        in_queue[u] = false;
        for &(v, w) in &adj[u] {
            if dist[u] + w < dist[v] {
                dist[v] = dist[u] + w;
                if !in_queue[v] {
                    queue.push_back(v);
                    in_queue[v] = true;
                    enqueue_count[v] += 1;
                    if enqueue_count[v] as usize > n {
                        return None; // 負閉路を検出
                    }
                }
            }
        }
    }

    Some(dist)
}
```

```csharp
// 辺リスト(u, v, weight)の有向グラフに対するSPFA。負閉路があれば (null, true) を返す
static (double[]? dist, bool hasNegativeCycle) Spfa(int n, List<(int U, int V, double W)> edges, int source)
{
    var adj = new List<(int v, double w)>[n];
    for (int i = 0; i < n; i++) adj[i] = new List<(int, double)>();
    foreach (var e in edges) adj[e.U].Add((e.V, e.W));

    var dist = new double[n];
    Array.Fill(dist, double.PositiveInfinity);
    dist[source] = 0;
    var inQueue = new bool[n];
    var enqueueCount = new int[n];

    var queue = new Queue<int>();
    queue.Enqueue(source);
    inQueue[source] = true;

    while (queue.Count > 0)
    {
        int u = queue.Dequeue();
        inQueue[u] = false;
        foreach (var (v, w) in adj[u])
        {
            if (dist[u] + w < dist[v])
            {
                dist[v] = dist[u] + w;
                if (!inQueue[v])
                {
                    queue.Enqueue(v);
                    inQueue[v] = true;
                    enqueueCount[v]++;
                    if (enqueueCount[v] > n) return (null, true); // 負閉路を検出
                }
            }
        }
    }

    return (dist, false);
}
```
