---
name: ジョンソンのアルゴリズム
category: グラフ
subcategory: 最短路
complexity: O(V² log V + VE)
summary: 負の辺を再重み付けしてから全点対最短経路を高速に解く。
---

## 概要

全点対最短経路を求めるなら、フロイド・ワーシャル法(O(V³))という選択肢がある。しかし、グラフが疎(辺の数Eが頂点数Vに比べて少ない)な場合、頂点数分だけダイクストラ法を繰り返す(O(V・(V+E)log V))方が理論上速くなりうる——ただし負の辺があるとダイクストラ法はそのまま使えない。ジョンソンのアルゴリズムは、**負の辺を「再重み付け」によって取り除いてから**、疎なグラフに強いダイクストラ法を各頂点から繰り返すことで、両者のいいとこ取りを実現する。

## 仕組み

1. グラフに新しい仮想頂点を1つ追加し、その頂点から全ての既存頂点へ重み0の辺を張る
2. この仮想頂点を始点として**ベルマン・フォード法**を実行し、各頂点までの最短距離`h(v)`を求める(負閉路があればここで検出して終了する)
3. 元のグラフの全ての辺(u, v)の重みを、`元の重み + h(u) - h(v)` という式で**再重み付け**する。この操作により、**全ての辺の重みが0以上になる**ことが数学的に保証される(三角不等式の性質による)
4. 再重み付けされたグラフに対して、各頂点を始点にダイクストラ法を実行する(全ての辺が非負なので安全に使える)
5. 得られた距離を `元の距離 = 再重み付け後の距離 - h(始点) + h(終点)` という式で元のスケールに戻す

「負の辺があるグラフを、最短経路の相対的な大小関係を保ったまま、全ての辺が非負になるように"座標変換"する」という発想が、このアルゴリズムの巧妙なところ。

## 特性・トレードオフ

- **計算量**: O(V² log V + VE)。疎なグラフ(E ≪ V²)では、フロイド・ワーシャル法のO(V³)より高速になる
- **負の辺に対応**: ベルマン・フォード法の「負の辺への対応力」と、ダイクストラ法の「疎なグラフでの高速性」を組み合わせている
- **負閉路の検出**: 再重み付けの前段階でベルマン・フォード法を使うため、自然に負閉路の検出も行える(負閉路があれば全点対最短経路自体が定義できない)
- **使いどころ**: 大規模で疎な、かつ負のコストの辺を含む可能性があるグラフ(通貨の裁定取引ネットワークなど)の全点対最短経路。密なグラフではフロイド・ワーシャル法の単純さの方が有利なことも多い

## 実装例

```python
import heapq

INF = float("inf")


def bellman_ford(n: int, edges: list[tuple[int, int, float]], src: int) -> list[float] | None:
    dist = [INF] * n
    dist[src] = 0
    for _ in range(n - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                updated = True
        if not updated:
            break
    for u, v, w in edges:
        if dist[u] != INF and dist[u] + w < dist[v]:
            return None  # 負閉路を検出
    return dist


def dijkstra(n: int, adj: list[list[tuple[int, float]]], src: int) -> list[float]:
    dist = [INF] * n
    dist[src] = 0
    pq = [(0.0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist


def johnson(n: int, edges: list[tuple[int, int, float]]) -> list[list[float]] | None:
    # 仮想頂点nを追加し、全頂点へ重み0の辺を張ってからベルマン・フォード法を実行
    aug_edges = list(edges) + [(n, v, 0) for v in range(n)]
    h = bellman_ford(n + 1, aug_edges, n)
    if h is None:
        return None

    # 再重み付け: 全ての辺が非負になる
    adj: list[list[tuple[int, float]]] = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w + h[u] - h[v]))

    result = [[INF] * n for _ in range(n)]
    for s in range(n):
        d = dijkstra(n, adj, s)
        for t in range(n):
            if d[t] < INF:
                result[s][t] = d[t] - h[s] + h[t]  # 元のスケールに戻す
    return result
```

```typescript
const INF = Infinity;
type Edge = [number, number, number];

function bellmanFord(n: number, edges: Edge[], src: number): number[] | null {
  const dist = new Array(n).fill(INF);
  dist[src] = 0;
  for (let i = 0; i < n - 1; i++) {
    let updated = false;
    for (const [u, v, w] of edges) {
      if (dist[u] !== INF && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        updated = true;
      }
    }
    if (!updated) break;
  }
  for (const [u, v, w] of edges) {
    if (dist[u] !== INF && dist[u] + w < dist[v]) return null; // 負閉路
  }
  return dist;
}

function dijkstra(n: number, adj: [number, number][][], src: number): number[] {
  const dist = new Array(n).fill(INF);
  dist[src] = 0;
  const pq: [number, number][] = [[0, src]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (d > dist[u]) continue;
    for (const [v, w] of adj[u]) {
      const nd = d + w;
      if (nd < dist[v]) {
        dist[v] = nd;
        pq.push([nd, v]);
      }
    }
  }
  return dist;
}

function johnson(n: number, edges: Edge[]): number[][] | null {
  const augEdges: Edge[] = [...edges, ...Array.from({ length: n }, (_, v): Edge => [n, v, 0])];
  const h = bellmanFord(n + 1, augEdges, n);
  if (h === null) return null;

  const adj: [number, number][][] = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) {
    adj[u].push([v, w + h[u] - h[v]]);
  }

  const result: number[][] = Array.from({ length: n }, () => new Array(n).fill(INF));
  for (let s = 0; s < n; s++) {
    const d = dijkstra(n, adj, s);
    for (let t = 0; t < n; t++) {
      if (d[t] < INF) result[s][t] = d[t] - h[s] + h[t];
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <queue>
#include <limits>
#include <optional>
#include <tuple>

using Edge = std::tuple<int, int, double>;
constexpr double INF = std::numeric_limits<double>::infinity();

std::optional<std::vector<double>> bellmanFord(int n, const std::vector<Edge>& edges, int src) {
    std::vector<double> dist(n, INF);
    dist[src] = 0;
    for (int i = 0; i < n - 1; i++) {
        bool updated = false;
        for (auto [u, v, w] : edges) {
            if (dist[u] != INF && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if (!updated) break;
    }
    for (auto [u, v, w] : edges) {
        if (dist[u] != INF && dist[u] + w < dist[v]) return std::nullopt;  // 負閉路
    }
    return dist;
}

std::vector<double> dijkstra(int n, const std::vector<std::vector<std::pair<int, double>>>& adj, int src) {
    std::vector<double> dist(n, INF);
    dist[src] = 0;
    using P = std::pair<double, int>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> pq;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            double nd = d + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                pq.push({nd, v});
            }
        }
    }
    return dist;
}

std::optional<std::vector<std::vector<double>>> johnson(int n, const std::vector<Edge>& edges) {
    std::vector<Edge> augEdges = edges;
    for (int v = 0; v < n; v++) augEdges.emplace_back(n, v, 0.0);
    auto hOpt = bellmanFord(n + 1, augEdges, n);
    if (!hOpt) return std::nullopt;
    auto& h = *hOpt;

    std::vector<std::vector<std::pair<int, double>>> adj(n);
    for (auto [u, v, w] : edges) {
        adj[u].emplace_back(v, w + h[u] - h[v]);
    }

    std::vector<std::vector<double>> result(n, std::vector<double>(n, INF));
    for (int s = 0; s < n; s++) {
        auto d = dijkstra(n, adj, s);
        for (int t = 0; t < n; t++) {
            if (d[t] < INF) result[s][t] = d[t] - h[s] + h[t];
        }
    }
    return result;
}
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Ordering;

const INF: f64 = f64::INFINITY;

fn bellman_ford(n: usize, edges: &[(usize, usize, f64)], src: usize) -> Option<Vec<f64>> {
    let mut dist = vec![INF; n];
    dist[src] = 0.0;
    for _ in 0..n.saturating_sub(1) {
        let mut updated = false;
        for &(u, v, w) in edges {
            if dist[u] != INF && dist[u] + w < dist[v] {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if !updated {
            break;
        }
    }
    for &(u, v, w) in edges {
        if dist[u] != INF && dist[u] + w < dist[v] {
            return None; // 負閉路
        }
    }
    Some(dist)
}

#[derive(PartialEq)]
struct HeapItem(f64, usize);
impl Eq for HeapItem {}
impl Ord for HeapItem {
    fn cmp(&self, other: &Self) -> Ordering {
        other.0.partial_cmp(&self.0).unwrap() // 最小ヒープにするため反転
    }
}
impl PartialOrd for HeapItem {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn dijkstra(n: usize, adj: &[Vec<(usize, f64)>], src: usize) -> Vec<f64> {
    let mut dist = vec![INF; n];
    dist[src] = 0.0;
    let mut pq = BinaryHeap::new();
    pq.push(HeapItem(0.0, src));
    while let Some(HeapItem(d, u)) = pq.pop() {
        if d > dist[u] {
            continue;
        }
        for &(v, w) in &adj[u] {
            let nd = d + w;
            if nd < dist[v] {
                dist[v] = nd;
                pq.push(HeapItem(nd, v));
            }
        }
    }
    dist
}

fn johnson(n: usize, edges: &[(usize, usize, f64)]) -> Option<Vec<Vec<f64>>> {
    let mut aug_edges = edges.to_vec();
    for v in 0..n {
        aug_edges.push((n, v, 0.0));
    }
    let h = bellman_ford(n + 1, &aug_edges, n)?;

    let mut adj: Vec<Vec<(usize, f64)>> = vec![Vec::new(); n];
    for &(u, v, w) in edges {
        adj[u].push((v, w + h[u] - h[v]));
    }

    let mut result = vec![vec![INF; n]; n];
    for s in 0..n {
        let d = dijkstra(n, &adj, s);
        for t in 0..n {
            if d[t] < INF {
                result[s][t] = d[t] - h[s] + h[t];
            }
        }
    }
    Some(result)
}
```

```csharp
static double[]? BellmanFord(int n, List<(int u, int v, double w)> edges, int src)
{
    var dist = Enumerable.Repeat(double.PositiveInfinity, n).ToArray();
    dist[src] = 0;
    for (int i = 0; i < n - 1; i++)
    {
        bool updated = false;
        foreach (var (u, v, w) in edges)
        {
            if (dist[u] != double.PositiveInfinity && dist[u] + w < dist[v])
            {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if (!updated) break;
    }
    foreach (var (u, v, w) in edges)
        if (dist[u] != double.PositiveInfinity && dist[u] + w < dist[v]) return null; // 負閉路
    return dist;
}

static double[] Dijkstra(int n, List<(int v, double w)>[] adj, int src)
{
    var dist = Enumerable.Repeat(double.PositiveInfinity, n).ToArray();
    dist[src] = 0;
    var pq = new SortedSet<(double d, int u)> { (0, src) };
    while (pq.Count > 0)
    {
        var (d, u) = pq.Min;
        pq.Remove(pq.Min);
        if (d > dist[u]) continue;
        foreach (var (v, w) in adj[u])
        {
            double nd = d + w;
            if (nd < dist[v])
            {
                pq.Remove((dist[v], v));
                dist[v] = nd;
                pq.Add((nd, v));
            }
        }
    }
    return dist;
}

static double[][]? Johnson(int n, List<(int u, int v, double w)> edges)
{
    var augEdges = new List<(int, int, double)>(edges);
    for (int v = 0; v < n; v++) augEdges.Add((n, v, 0));
    var h = BellmanFord(n + 1, augEdges, n);
    if (h == null) return null;

    var adj = new List<(int v, double w)>[n];
    for (int i = 0; i < n; i++) adj[i] = new();
    foreach (var (u, v, w) in edges)
        adj[u].Add((v, w + h[u] - h[v]));

    var result = new double[n][];
    for (int s = 0; s < n; s++)
    {
        var d = Dijkstra(n, adj, s);
        result[s] = new double[n];
        for (int t = 0; t < n; t++)
            result[s][t] = d[t] < double.PositiveInfinity ? d[t] - h[s] + h[t] : double.PositiveInfinity;
    }
    return result;
}
```
