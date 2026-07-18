---
name: プリム法
category: グラフ
subcategory: 最小全域木
complexity: O(E log V)
summary: 頂点を1つずつ広げながら最小全域木を構築する。
---

## 概要

グラフの全頂点を、辺の総コストが最小になるように結びつける木構造——「最小全域木(Minimum Spanning Tree)」を求めるアルゴリズムのひとつ。電力網や通信網の敷設コストを最小化する問題など、「全ての地点を最小コストで結ぶ」場面の定番の解法。ダイクストラ法と驚くほど似た構造をしており、「確定済みの頂点集合を1つずつ広げていく」という発想を共有している。

## 仕組み

1. 適当な1頂点を選び、それを「木に含まれる頂点集合」の最初のメンバーとする
2. 木に含まれる頂点と、まだ含まれていない頂点を結ぶ辺の中から、**最もコストが小さいもの**を選ぶ
3. その辺を採用し、辺の反対側の頂点を木に加える
4. 全ての頂点が木に含まれるまで2〜3を繰り返す

ダイクストラ法が「スタートからの累積コスト」で次の頂点を選ぶのに対し、プリム法は「今の木から出る辺1本のコスト」だけで次の頂点を選ぶ、という違いがある。この差が、両者を似て非なるアルゴリズムにしている。

## 特性・トレードオフ

- **計算量**: 優先度付きキューを使う実装でO(E log V)。密なグラフ(辺が非常に多い)では、優先度付きキューを使わない素朴な実装(O(V²))の方が有利になることもある
- **クラスカル法との比較**: どちらも最小全域木を求めるが、プリム法は「頂点を1つずつ広げる」のに対し、クラスカル法は「辺をコスト順に採用する」という発想の違いがある。密なグラフではプリム法、疎なグラフ(辺が少ない)ではクラスカル法が有利とされることが多い
- **連結グラフが前提**: グラフが連結でない(孤立した部分がある)場合、1つの頂点から辺をたどるだけでは全頂点に到達できないため、そのままでは適用できない
- **使いどころ**: 電力網・水道網・通信網など、拠点を最小コストで結ぶインフラ設計。クラスタリング(データ点をグループ分けする)の前処理としても使われることがある

## 実装例

```python
import heapq


def prim(graph: dict[str, list[tuple[str, float]]], start: str):
    visited = {start}
    edges = [(w, start, v) for v, w in graph[start]]
    heapq.heapify(edges)
    mst = []
    total = 0
    while edges and len(visited) < len(graph):
        w, u, v = heapq.heappop(edges)
        if v in visited:
            continue
        visited.add(v)
        mst.append((u, v, w))
        total += w
        for to, weight in graph[v]:
            if to not in visited:
                heapq.heappush(edges, (weight, v, to))
    return mst, total
```

```typescript
function prim(
  graph: Record<string, [string, number][]>,
  start: string
): { mst: [string, string, number][]; total: number } {
  const visited = new Set([start]);
  const edges: [number, string, string][] = graph[start].map(([v, w]) => [w, start, v]);
  const mst: [string, string, number][] = [];
  let total = 0;
  while (edges.length > 0 && visited.size < Object.keys(graph).length) {
    edges.sort((a, b) => a[0] - b[0]);
    const [w, u, v] = edges.shift()!;
    if (visited.has(v)) continue;
    visited.add(v);
    mst.push([u, v, w]);
    total += w;
    for (const [to, weight] of graph[v]) {
      if (!visited.has(to)) edges.push([weight, v, to]);
    }
  }
  return { mst, total };
}
```

```cpp
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <queue>
#include <tuple>

using Graph = std::unordered_map<std::string, std::vector<std::pair<std::string, double>>>;

std::pair<std::vector<std::tuple<std::string, std::string, double>>, double> prim(
    const Graph& graph, const std::string& start) {
    using EdgeTuple = std::tuple<double, std::string, std::string>; // weight, from, to
    std::priority_queue<EdgeTuple, std::vector<EdgeTuple>, std::greater<>> edges;
    std::unordered_set<std::string> visited{start};

    for (const auto& [v, w] : graph.at(start)) edges.push({w, start, v});

    std::vector<std::tuple<std::string, std::string, double>> mst;
    double total = 0;
    while (!edges.empty() && visited.size() < graph.size()) {
        auto [w, u, v] = edges.top();
        edges.pop();
        if (visited.count(v)) continue;
        visited.insert(v);
        mst.push_back({u, v, w});
        total += w;
        for (const auto& [to, weight] : graph.at(v)) {
            if (!visited.count(to)) edges.push({weight, v, to});
        }
    }
    return {mst, total};
}
```

```rust
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};

#[derive(PartialEq)]
struct WeightedEdge {
    weight: f64,
    from: String,
    to: String,
}
impl Eq for WeightedEdge {}
impl Ord for WeightedEdge {
    fn cmp(&self, other: &Self) -> Ordering {
        other.weight.partial_cmp(&self.weight).unwrap() // 最小ヒープ化
    }
}
impl PartialOrd for WeightedEdge {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn prim(
    graph: &HashMap<String, Vec<(String, f64)>>,
    start: &str,
) -> (Vec<(String, String, f64)>, f64) {
    let mut visited: HashSet<String> = HashSet::from([start.to_string()]);
    let mut edges = BinaryHeap::new();
    for (v, w) in &graph[start] {
        edges.push(WeightedEdge { weight: *w, from: start.to_string(), to: v.clone() });
    }

    let mut mst = vec![];
    let mut total = 0.0;
    while let Some(WeightedEdge { weight, from, to }) = edges.pop() {
        if visited.len() >= graph.len() {
            break;
        }
        if visited.contains(&to) {
            continue;
        }
        visited.insert(to.clone());
        mst.push((from, to.clone(), weight));
        total += weight;
        if let Some(neighbors) = graph.get(&to) {
            for (next, w) in neighbors {
                if !visited.contains(next) {
                    edges.push(WeightedEdge { weight: *w, from: to.clone(), to: next.clone() });
                }
            }
        }
    }
    (mst, total)
}
```

```csharp
static (List<(string, string, double)> mst, double total) Prim(Dictionary<string, List<(string to, double w)>> graph, string start)
{
    var visited = new HashSet<string> { start };
    var edges = new List<(double w, string u, string v)>();
    foreach (var (to, w) in graph[start]) edges.Add((w, start, to));
    var mst = new List<(string, string, double)>();
    double total = 0;
    while (edges.Count > 0 && visited.Count < graph.Count)
    {
        edges.Sort((a, b) => a.w.CompareTo(b.w));
        var (w, u, v) = edges[0];
        edges.RemoveAt(0);
        if (visited.Contains(v)) continue;
        visited.Add(v);
        mst.Add((u, v, w));
        total += w;
        foreach (var (to, weight) in graph[v])
        {
            if (!visited.Contains(to)) edges.Add((weight, v, to));
        }
    }
    return (mst, total);
}
```
