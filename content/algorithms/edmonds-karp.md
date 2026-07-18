---
name: エドモンズ・カープ法
category: グラフ
subcategory: 最大流・マッチング
complexity: O(VE²)
summary: フォード・ファルカーソン法の増加パスをBFSで選ぶことで計算量を保証した版。
---

## 概要

フォード・ファルカーソン法は「増加パスをどう選ぶか」を指定していないため、選び方が悪いと極端に遅くなる(容量が大きいと非現実的な回数の反復が必要になることさえある)という弱点を抱えていた。エドモンズ・カープ法は、この増加パスの選び方を**「常にBFSで最短(辺の本数が最少)の経路を選ぶ」**というシンプルなルールに固定することで、最悪ケースでも確実な計算量の上限を保証する。

## 仕組み

基本の流れはフォード・ファルカーソン法と全く同じで、増加パスの探し方だけが異なる。

1. 始点から終点まで、残余容量のある辺だけを使い、**BFSで最短経路(辺の本数が最少)**を1本見つける
2. その経路上で最も余裕が少ない辺の余裕分だけ流量を増やす(フォード・ファルカーソン法と同じ)
3. 残余容量・逆辺を更新する
4. BFSで増加パスが見つからなくなるまで1〜3を繰り返す

「深さ優先でたまたま見つかった経路」ではなく「幅優先で最短の経路」を毎回選ぶことで、各辺が「ボトルネック(流量を決定づける辺)」になる回数に理論的な上限が生まれ、これが全体の計算量の保証につながる。

## 特性・トレードオフ

- **計算量**: O(VE²)。フォード・ファルカーソン法とは異なり、**流量の大きさに依存しない**計算量の保証がある(フォード・ファルカーソン法は最悪ケースで流量の大きさに比例して遅くなりうる)
- **実装の変更点が小さい**: フォード・ファルカーソン法の「増加パスをDFSで探す」部分を「BFSで探す」に変えるだけで実現でき、実装の複雑さはほとんど増えない
- **さらなる高速化との関係**: エドモンズ・カープ法自体は最速ではなく、ディニッツ法(レベルグラフとブロッキングフローを使う)など、より高速な理論計算量を持つ後続のアルゴリズムが存在する
- **使いどころ**: フォード・ファルカーソン法と同じ最大フロー問題全般。特に「容量の値が大きい」ことが予想される場面では、計算量が流量に依存しないエドモンズ・カープ法の方が安全な選択になる

## 実装例

[フォード・ファルカーソン法](/algorithms/ford-fulkerson)との違いは、増加パスの探索をDFSからBFSに変えるだけ。

```python
from collections import deque


def build_residual(graph: dict[str, dict[str, float]]) -> dict[str, dict[str, float]]:
    residual = {u: dict(neighbors) for u, neighbors in graph.items()}
    for u in graph:
        for v in graph[u]:
            residual.setdefault(v, {})
            residual[v].setdefault(u, 0)
    return residual


def bfs_find_path(residual, source: str, sink: str):
    parent = {source: None}
    queue = deque([source])
    while queue:
        node = queue.popleft()
        if node == sink:
            break
        for neighbor, cap in residual.get(node, {}).items():
            if cap > 0 and neighbor not in parent:
                parent[neighbor] = node
                queue.append(neighbor)
    if sink not in parent:
        return None
    path = []
    node = sink
    while node is not None:
        path.append(node)
        node = parent[node]
    path.reverse()
    return path


def edmonds_karp(graph: dict[str, dict[str, float]], source: str, sink: str) -> float:
    residual = build_residual(graph)
    max_flow = 0
    while True:
        path = bfs_find_path(residual, source, sink)
        if path is None:
            break
        bottleneck = min(residual[path[i]][path[i + 1]] for i in range(len(path) - 1))
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            residual[u][v] -= bottleneck
            residual[v][u] += bottleneck
        max_flow += bottleneck
    return max_flow
```

```typescript
function buildResidual(
  graph: Record<string, Record<string, number>>
): Record<string, Record<string, number>> {
  const residual: Record<string, Record<string, number>> = {};
  for (const u of Object.keys(graph)) {
    residual[u] = { ...(residual[u] ?? {}), ...graph[u] };
    for (const v of Object.keys(graph[u])) {
      residual[v] = residual[v] ?? {};
      if (!(u in residual[v])) residual[v][u] = 0;
    }
  }
  return residual;
}

function bfsFindPath(
  residual: Record<string, Record<string, number>>,
  source: string,
  sink: string
): string[] | null {
  const parent = new Map<string, string | null>([[source, null]]);
  const queue = [source];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === sink) break;
    for (const [neighbor, cap] of Object.entries(residual[node] ?? {})) {
      if (cap > 0 && !parent.has(neighbor)) {
        parent.set(neighbor, node);
        queue.push(neighbor);
      }
    }
  }
  if (!parent.has(sink)) return null;
  const path: string[] = [];
  let node: string | null = sink;
  while (node !== null) {
    path.push(node);
    node = parent.get(node) ?? null;
  }
  return path.reverse();
}

function edmondsKarp(
  graph: Record<string, Record<string, number>>,
  source: string,
  sink: string
): number {
  const residual = buildResidual(graph);
  let maxFlow = 0;
  while (true) {
    const path = bfsFindPath(residual, source, sink);
    if (path === null) break;
    let bottleneck = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      bottleneck = Math.min(bottleneck, residual[path[i]][path[i + 1]]);
    }
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      residual[u][v] -= bottleneck;
      residual[v][u] += bottleneck;
    }
    maxFlow += bottleneck;
  }
  return maxFlow;
}
```

```cpp
#include <string>
#include <unordered_map>
#include <vector>
#include <queue>
#include <optional>
#include <limits>
#include <algorithm>

using FlowGraph = std::unordered_map<std::string, std::unordered_map<std::string, double>>;

FlowGraph buildResidual(const FlowGraph& graph) {
    FlowGraph residual = graph;
    for (const auto& [u, neighbors] : graph) {
        for (const auto& [v, cap] : neighbors) {
            residual[v][u] += 0; // 逆辺を容量0で用意(未存在なら作成)
        }
    }
    return residual;
}

std::optional<std::vector<std::string>> bfsFindPath(
    const FlowGraph& residual, const std::string& source, const std::string& sink) {
    std::unordered_map<std::string, std::optional<std::string>> parent{{source, std::nullopt}};
    std::queue<std::string> queue;
    queue.push(source);
    while (!queue.empty()) {
        std::string node = queue.front();
        queue.pop();
        if (node == sink) break;
        auto it = residual.find(node);
        if (it == residual.end()) continue;
        for (const auto& [neighbor, cap] : it->second) {
            if (cap > 0 && !parent.count(neighbor)) {
                parent[neighbor] = node;
                queue.push(neighbor);
            }
        }
    }
    if (!parent.count(sink)) return std::nullopt;
    std::vector<std::string> path;
    std::optional<std::string> node = sink;
    while (node.has_value()) {
        path.push_back(*node);
        node = parent[*node];
    }
    std::reverse(path.begin(), path.end());
    return path;
}

double edmondsKarp(const FlowGraph& graph, const std::string& source, const std::string& sink) {
    FlowGraph residual = buildResidual(graph);
    double maxFlow = 0;
    while (true) {
        auto path = bfsFindPath(residual, source, sink);
        if (!path.has_value()) break;
        double bottleneck = std::numeric_limits<double>::infinity();
        for (std::size_t i = 0; i + 1 < path->size(); i++) {
            bottleneck = std::min(bottleneck, residual[(*path)[i]][(*path)[i + 1]]);
        }
        for (std::size_t i = 0; i + 1 < path->size(); i++) {
            const auto& u = (*path)[i];
            const auto& v = (*path)[i + 1];
            residual[u][v] -= bottleneck;
            residual[v][u] += bottleneck;
        }
        maxFlow += bottleneck;
    }
    return maxFlow;
}
```

```rust
use std::collections::{HashMap, VecDeque};

type FlowGraph = HashMap<String, HashMap<String, f64>>;

fn build_residual(graph: &FlowGraph) -> FlowGraph {
    let mut residual = graph.clone();
    for (_, neighbors) in graph {
        for (v, _) in neighbors {
            residual.entry(v.clone()).or_default();
        }
    }
    for u in graph.keys() {
        for v in graph[u].keys() {
            residual.get_mut(v).unwrap().entry(u.clone()).or_insert(0.0);
        }
    }
    residual
}

fn bfs_find_path(residual: &FlowGraph, source: &str, sink: &str) -> Option<Vec<String>> {
    let mut parent: HashMap<String, Option<String>> = HashMap::from([(source.to_string(), None)]);
    let mut queue = VecDeque::from([source.to_string()]);
    while let Some(node) = queue.pop_front() {
        if node == sink {
            break;
        }
        if let Some(neighbors) = residual.get(&node) {
            for (neighbor, &cap) in neighbors {
                if cap > 0.0 && !parent.contains_key(neighbor) {
                    parent.insert(neighbor.clone(), Some(node.clone()));
                    queue.push_back(neighbor.clone());
                }
            }
        }
    }
    parent.get(sink)?;
    let mut path = vec![];
    let mut node = Some(sink.to_string());
    while let Some(n) = node {
        path.push(n.clone());
        node = parent[&n].clone();
    }
    path.reverse();
    Some(path)
}

fn edmonds_karp(graph: &FlowGraph, source: &str, sink: &str) -> f64 {
    let mut residual = build_residual(graph);
    let mut max_flow = 0.0;
    loop {
        let path = match bfs_find_path(&residual, source, sink) {
            Some(p) => p,
            None => break,
        };
        let mut bottleneck = f64::INFINITY;
        for i in 0..path.len() - 1 {
            bottleneck = bottleneck.min(residual[&path[i]][&path[i + 1]]);
        }
        for i in 0..path.len() - 1 {
            let u = &path[i];
            let v = &path[i + 1];
            *residual.get_mut(u).unwrap().get_mut(v).unwrap() -= bottleneck;
            *residual.get_mut(v).unwrap().get_mut(u).unwrap() += bottleneck;
        }
        max_flow += bottleneck;
    }
    max_flow
}
```

```csharp
static Dictionary<string, Dictionary<string, double>> BuildResidual(Dictionary<string, Dictionary<string, double>> graph)
{
    var residual = new Dictionary<string, Dictionary<string, double>>();
    foreach (var u in graph.Keys)
    {
        if (!residual.ContainsKey(u)) residual[u] = new Dictionary<string, double>();
        foreach (var (v, cap) in graph[u]) residual[u][v] = cap;
        foreach (var v in graph[u].Keys)
        {
            if (!residual.ContainsKey(v)) residual[v] = new Dictionary<string, double>();
            if (!residual[v].ContainsKey(u)) residual[v][u] = 0;
        }
    }
    return residual;
}

static List<string>? BfsFindPath(Dictionary<string, Dictionary<string, double>> residual, string source, string sink)
{
    var parent = new Dictionary<string, string?> { [source] = null };
    var queue = new Queue<string>(new[] { source });
    while (queue.Count > 0)
    {
        var node = queue.Dequeue();
        if (node == sink) break;
        if (!residual.TryGetValue(node, out var neighbors)) continue;
        foreach (var (neighbor, cap) in neighbors)
        {
            if (cap > 0 && !parent.ContainsKey(neighbor))
            {
                parent[neighbor] = node;
                queue.Enqueue(neighbor);
            }
        }
    }
    if (!parent.ContainsKey(sink)) return null;
    var path = new List<string>();
    string? node2 = sink;
    while (node2 != null)
    {
        path.Add(node2);
        node2 = parent[node2];
    }
    path.Reverse();
    return path;
}

static double EdmondsKarp(Dictionary<string, Dictionary<string, double>> graph, string source, string sink)
{
    var residual = BuildResidual(graph);
    double maxFlow = 0;
    while (true)
    {
        var path = BfsFindPath(residual, source, sink);
        if (path == null) break;
        double bottleneck = double.MaxValue;
        for (int i = 0; i < path.Count - 1; i++) bottleneck = Math.Min(bottleneck, residual[path[i]][path[i + 1]]);
        for (int i = 0; i < path.Count - 1; i++)
        {
            var u = path[i];
            var v = path[i + 1];
            residual[u][v] -= bottleneck;
            residual[v][u] += bottleneck;
        }
        maxFlow += bottleneck;
    }
    return maxFlow;
}
```
