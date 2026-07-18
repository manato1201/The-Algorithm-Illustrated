---
name: ディニッツ法
category: グラフ
subcategory: 最大流・マッチング
complexity: O(V²E)
summary: レベルグラフとブロッキングフローを使い、最大フローを高速に求める。
---

## 概要

エドモンズ・カープ法は「増加パスを1本ずつBFSで探す」ことで最大フロー問題を確実に解けるようにしたが、1回のフェーズで1本の経路しか流量を増やせないのは非効率でもある。ディニッツ法(Dinic's algorithm)は、**1回のフェーズで複数の増加パスをまとめて処理する**ことにより、エドモンズ・カープ法よりも高速な理論計算量を実現する。1970年にイスラエルの研究者Yefim Dinitzが考案した。

## 仕組み

1. **レベルグラフの構築**: 始点からBFSを行い、各頂点までの最短距離(レベル)を求める。「レベルがちょうど1つ増える辺」だけを残した部分グラフ(レベルグラフ)を作る
2. **ブロッキングフロー**: レベルグラフの中で、DFSを使って「これ以上流せなくなるまで」複数の増加パスを見つけ、まとめて流量を増やす(1つの増加パスを見つけるたびに、その中のボトルネックとなった辺を素早くスキップする工夫により、この段階も効率的に行える)
3. ブロッキングフローが求まったら、残余グラフに対して再びレベルグラフを構築し直す(フェーズを1つ進める)
4. 始点から終点へのレベルグラフが構築できなくなったら(=これ以上短縮できる経路がなくなったら)終了

「最短距離が同じ増加パスたちを、1つのフェーズでまとめて処理してしまう」というのが要点で、エドモンズ・カープ法が1フェーズにつき1本ずつ処理していたのに対し、ディニッツ法は1フェーズで大量の流量をまとめて増やせる。

## 特性・トレードオフ

- **計算量**: O(V²E)。エドモンズ・カープ法のO(VE²)より一般に高速(特に二部グラフのマッチングなど特殊なケースでは、さらに高速なO(E√V)まで改善されることが知られている)
- **実装の複雑さ**: ブロッキングフローを効率的に求める部分(スキップ処理を含むDFS)の実装がエドモンズ・カープ法より複雑になる
- **競技プログラミングでの定番**: 実装の複雑さと引き換えに高い実効速度が得られるため、最大フロー問題を扱う競技プログラミングの現場では、まず候補に挙がるアルゴリズムのひとつ
- **使いどころ**: フォード・ファルカーソン法系のアルゴリズムと同じ最大フロー問題全般。特に、より大規模・高密度なネットワークで速度が求められる場面

## 実装例

各頂点ごとに「次に調べるべき隣接辺の位置」を指すイテレータ(`it`)を持つことで、一度探索済みの辺を同じフェーズ内で再度たどらないようにしている。

```python
from collections import deque


def build_residual(graph: dict[str, dict[str, float]]) -> dict[str, dict[str, float]]:
    residual = {u: dict(neighbors) for u, neighbors in graph.items()}
    for u in graph:
        for v in graph[u]:
            residual.setdefault(v, {})
            residual[v].setdefault(u, 0)
    return residual


def bfs_level_graph(residual, source: str, sink: str):
    level = {source: 0}
    queue = deque([source])
    while queue:
        node = queue.popleft()
        for neighbor, cap in residual.get(node, {}).items():
            if cap > 0 and neighbor not in level:
                level[neighbor] = level[node] + 1
                queue.append(neighbor)
    return level if sink in level else None


def dfs_blocking_flow(residual, level, node: str, sink: str, pushed: float, it: dict[str, list[str]]) -> float:
    if node == sink:
        return pushed
    neighbors = it.setdefault(node, list(residual.get(node, {}).keys()))
    while neighbors:
        neighbor = neighbors[0]
        cap = residual[node].get(neighbor, 0)
        if cap > 0 and level.get(neighbor, -1) == level[node] + 1:
            can_push = min(pushed, cap)
            result = dfs_blocking_flow(residual, level, neighbor, sink, can_push, it)
            if result > 0:
                residual[node][neighbor] -= result
                residual[neighbor][node] = residual[neighbor].get(node, 0) + result
                return result
        neighbors.pop(0)
    return 0


def dinic(graph: dict[str, dict[str, float]], source: str, sink: str) -> float:
    residual = build_residual(graph)
    max_flow = 0
    while True:
        level = bfs_level_graph(residual, source, sink)
        if level is None:
            break
        it: dict[str, list[str]] = {}
        while True:
            pushed = dfs_blocking_flow(residual, level, source, sink, float("inf"), it)
            if pushed == 0:
                break
            max_flow += pushed
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

function bfsLevelGraph(
  residual: Record<string, Record<string, number>>,
  source: string,
  sink: string
): Map<string, number> | null {
  const level = new Map<string, number>([[source, 0]]);
  const queue = [source];
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const [neighbor, cap] of Object.entries(residual[node] ?? {})) {
      if (cap > 0 && !level.has(neighbor)) {
        level.set(neighbor, level.get(node)! + 1);
        queue.push(neighbor);
      }
    }
  }
  return level.has(sink) ? level : null;
}

function dfsBlockingFlow(
  residual: Record<string, Record<string, number>>,
  level: Map<string, number>,
  node: string,
  sink: string,
  pushed: number,
  it: Map<string, string[]>
): number {
  if (node === sink) return pushed;
  if (!it.has(node)) it.set(node, Object.keys(residual[node] ?? {}));
  const neighbors = it.get(node)!;
  while (neighbors.length > 0) {
    const neighbor = neighbors[0];
    const cap = residual[node][neighbor] ?? 0;
    if (cap > 0 && (level.get(neighbor) ?? -1) === level.get(node)! + 1) {
      const canPush = Math.min(pushed, cap);
      const result = dfsBlockingFlow(residual, level, neighbor, sink, canPush, it);
      if (result > 0) {
        residual[node][neighbor] -= result;
        residual[neighbor][node] = (residual[neighbor][node] ?? 0) + result;
        return result;
      }
    }
    neighbors.shift();
  }
  return 0;
}

function dinic(
  graph: Record<string, Record<string, number>>,
  source: string,
  sink: string
): number {
  const residual = buildResidual(graph);
  let maxFlow = 0;
  while (true) {
    const level = bfsLevelGraph(residual, source, sink);
    if (level === null) break;
    const it = new Map<string, string[]>();
    while (true) {
      const pushed = dfsBlockingFlow(residual, level, source, sink, Infinity, it);
      if (pushed === 0) break;
      maxFlow += pushed;
    }
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
using LevelMap = std::unordered_map<std::string, int>;
using IterMap = std::unordered_map<std::string, std::vector<std::string>>;

FlowGraph buildResidual(const FlowGraph& graph) {
    FlowGraph residual = graph;
    for (const auto& [u, neighbors] : graph) {
        for (const auto& [v, cap] : neighbors) {
            residual[v][u] += 0;
        }
    }
    return residual;
}

std::optional<LevelMap> bfsLevelGraph(const FlowGraph& residual, const std::string& source, const std::string& sink) {
    LevelMap level{{source, 0}};
    std::queue<std::string> queue;
    queue.push(source);
    while (!queue.empty()) {
        std::string node = queue.front();
        queue.pop();
        auto it = residual.find(node);
        if (it == residual.end()) continue;
        for (const auto& [neighbor, cap] : it->second) {
            if (cap > 0 && !level.count(neighbor)) {
                level[neighbor] = level[node] + 1;
                queue.push(neighbor);
            }
        }
    }
    if (!level.count(sink)) return std::nullopt;
    return level;
}

double dfsBlockingFlow(FlowGraph& residual, const LevelMap& level, const std::string& node,
                        const std::string& sink, double pushed, IterMap& it) {
    if (node == sink) return pushed;
    if (!it.count(node)) {
        std::vector<std::string> keys;
        auto rit = residual.find(node);
        if (rit != residual.end()) {
            for (const auto& [neighbor, cap] : rit->second) keys.push_back(neighbor);
        }
        it[node] = keys;
    }
    auto& neighbors = it[node];
    while (!neighbors.empty()) {
        const std::string& neighbor = neighbors.front();
        double cap = residual[node].count(neighbor) ? residual[node][neighbor] : 0;
        auto nodeLevelIt = level.find(node);
        auto neighborLevelIt = level.find(neighbor);
        int neighborLevel = neighborLevelIt != level.end() ? neighborLevelIt->second : -1;
        if (cap > 0 && nodeLevelIt != level.end() && neighborLevel == nodeLevelIt->second + 1) {
            double canPush = std::min(pushed, cap);
            double result = dfsBlockingFlow(residual, level, neighbor, sink, canPush, it);
            if (result > 0) {
                residual[node][neighbor] -= result;
                residual[neighbor][node] += result;
                return result;
            }
        }
        neighbors.erase(neighbors.begin());
    }
    return 0;
}

double dinic(const FlowGraph& graph, const std::string& source, const std::string& sink) {
    FlowGraph residual = buildResidual(graph);
    double maxFlow = 0;
    while (true) {
        auto level = bfsLevelGraph(residual, source, sink);
        if (!level.has_value()) break;
        IterMap it;
        while (true) {
            double pushed = dfsBlockingFlow(residual, *level, source, sink, std::numeric_limits<double>::infinity(), it);
            if (pushed == 0) break;
            maxFlow += pushed;
        }
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

fn bfs_level_graph(residual: &FlowGraph, source: &str, sink: &str) -> Option<HashMap<String, i32>> {
    let mut level: HashMap<String, i32> = HashMap::from([(source.to_string(), 0)]);
    let mut queue = VecDeque::from([source.to_string()]);
    while let Some(node) = queue.pop_front() {
        if let Some(neighbors) = residual.get(&node) {
            for (neighbor, &cap) in neighbors {
                if cap > 0.0 && !level.contains_key(neighbor) {
                    let next_level = level[&node] + 1;
                    level.insert(neighbor.clone(), next_level);
                    queue.push_back(neighbor.clone());
                }
            }
        }
    }
    if level.contains_key(sink) { Some(level) } else { None }
}

fn dfs_blocking_flow(
    residual: &mut FlowGraph,
    level: &HashMap<String, i32>,
    node: &str,
    sink: &str,
    pushed: f64,
    it: &mut HashMap<String, Vec<String>>,
) -> f64 {
    if node == sink {
        return pushed;
    }
    if !it.contains_key(node) {
        let keys: Vec<String> = residual.get(node).map(|m| m.keys().cloned().collect()).unwrap_or_default();
        it.insert(node.to_string(), keys);
    }
    while let Some(neighbor) = it.get(node).and_then(|v| v.first().cloned()) {
        let cap = *residual.get(node).and_then(|m| m.get(&neighbor)).unwrap_or(&0.0);
        let node_level = level.get(node).copied().unwrap_or(-1);
        let neighbor_level = level.get(&neighbor).copied().unwrap_or(-1);
        if cap > 0.0 && neighbor_level == node_level + 1 {
            let can_push = pushed.min(cap);
            let result = dfs_blocking_flow(residual, level, &neighbor, sink, can_push, it);
            if result > 0.0 {
                *residual.get_mut(node).unwrap().get_mut(&neighbor).unwrap() -= result;
                *residual.get_mut(&neighbor).unwrap().entry(node.to_string()).or_insert(0.0) += result;
                return result;
            }
        }
        it.get_mut(node).unwrap().remove(0);
    }
    0.0
}

fn dinic(graph: &FlowGraph, source: &str, sink: &str) -> f64 {
    let mut residual = build_residual(graph);
    let mut max_flow = 0.0;
    loop {
        let level = match bfs_level_graph(&residual, source, sink) {
            Some(l) => l,
            None => break,
        };
        let mut it: HashMap<String, Vec<String>> = HashMap::new();
        loop {
            let pushed = dfs_blocking_flow(&mut residual, &level, source, sink, f64::INFINITY, &mut it);
            if pushed == 0.0 {
                break;
            }
            max_flow += pushed;
        }
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

static Dictionary<string, int>? BfsLevelGraph(Dictionary<string, Dictionary<string, double>> residual, string source, string sink)
{
    var level = new Dictionary<string, int> { [source] = 0 };
    var queue = new Queue<string>(new[] { source });
    while (queue.Count > 0)
    {
        var node = queue.Dequeue();
        if (!residual.TryGetValue(node, out var neighbors)) continue;
        foreach (var (neighbor, cap) in neighbors)
        {
            if (cap > 0 && !level.ContainsKey(neighbor))
            {
                level[neighbor] = level[node] + 1;
                queue.Enqueue(neighbor);
            }
        }
    }
    return level.ContainsKey(sink) ? level : null;
}

static double DfsBlockingFlow(Dictionary<string, Dictionary<string, double>> residual, Dictionary<string, int> level, string node, string sink, double pushed, Dictionary<string, List<string>> it)
{
    if (node == sink) return pushed;
    if (!it.ContainsKey(node)) it[node] = residual.TryGetValue(node, out var n0) ? new List<string>(n0.Keys) : new List<string>();
    var neighbors = it[node];
    while (neighbors.Count > 0)
    {
        var neighbor = neighbors[0];
        double cap = residual.TryGetValue(node, out var n1) && n1.TryGetValue(neighbor, out var c) ? c : 0;
        int nodeLevel = level.TryGetValue(node, out var nl) ? nl : -1;
        int neighborLevel = level.TryGetValue(neighbor, out var nb) ? nb : -1;
        if (cap > 0 && neighborLevel == nodeLevel + 1)
        {
            double canPush = Math.Min(pushed, cap);
            double result = DfsBlockingFlow(residual, level, neighbor, sink, canPush, it);
            if (result > 0)
            {
                residual[node][neighbor] -= result;
                if (!residual.ContainsKey(neighbor)) residual[neighbor] = new Dictionary<string, double>();
                residual[neighbor][node] = residual[neighbor].GetValueOrDefault(node, 0) + result;
                return result;
            }
        }
        neighbors.RemoveAt(0);
    }
    return 0;
}

static double Dinic(Dictionary<string, Dictionary<string, double>> graph, string source, string sink)
{
    var residual = BuildResidual(graph);
    double maxFlow = 0;
    while (true)
    {
        var level = BfsLevelGraph(residual, source, sink);
        if (level == null) break;
        var it = new Dictionary<string, List<string>>();
        while (true)
        {
            double pushed = DfsBlockingFlow(residual, level, source, sink, double.MaxValue, it);
            if (pushed == 0) break;
            maxFlow += pushed;
        }
    }
    return maxFlow;
}
```
