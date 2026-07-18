---
name: フォード・ファルカーソン法
category: グラフ
subcategory: 最大流・マッチング
complexity: O(E・maxflow)
summary: 増加パスを探し続けて最大フローを求める。増加パスの選び方で性能が大きく変わる。
---

## 概要

パイプラインのネットワークで、始点(source)から終点(sink)へ流せる**最大の流量**を求める「最大フロー問題」を解くための、最も基本的な考え方。各辺には「その辺を流せる容量の上限」が設定されており、これを超えない範囲で全体の流量を最大化する。ネットワークの帯域幅設計から、二部マッチング問題など一見無関係に見える多くの問題が、実はこの最大フロー問題に帰着できることでも知られている。

## 仕組み

1. 最初、全ての辺の流量を0とする
2. 始点から終点まで、**まだ余裕(残余容量)のある辺だけをたどって到達できる経路(増加パス)**を1本見つける
3. その経路上で「最も余裕が少ない辺の余裕分」だけ、経路全体の流量を増やす
4. 増やした分だけ、各辺の残余容量を減らす。同時に、逆方向にも「取り消し」のための残余容量を増やしておく(これにより、後から「一度流した分を巻き戻す」ことも可能になる)
5. これ以上増加パスが見つからなくなるまで2〜4を繰り返す。見つからなくなった時点の総流量が最大フローになる

「逆方向の残余容量」を用意しておくことで、最初に選んだ増加パスが必ずしも最適でなくても、後から流れを"訂正"できる——これがこのアルゴリズムの正しさを支える巧妙な仕掛け。

## 特性・トレードオフ

- **計算量**: O(E・maxflow)。増加パスをどうやって探すかを指定していない(素朴なDFSで探すこともできる)ため、**増加パスの選び方次第で実際の速度が大きく変わる**。容量が大きい・整数でない場合、最悪ケースでは非常に遅くなったり、無限ループに陥ることすらある
- **「最大フロー最小カット定理」との関係**: 最大フローの値は、ネットワークを「始点側」と「終点側」に分断するのに必要な最小のカット容量(最小カット)と必ず一致する、という美しい双対性が成り立つ。この定理はネットワークの脆弱性分析にも応用される
- **増加パスの選び方を改善した派生形**: 増加パスをBFSで選ぶ(エドモンズ・カープ法)、レベルグラフを使う(ディニッツ法)など、計算量を理論的に保証する改良版が後に考案されている
- **使いどころ**: 通信ネットワークの帯域幅計画、物流の輸送計画、二部マッチング問題(仕事の割り当て、学生と学校のマッチングなど)、画像セグメンテーションなど、驚くほど幅広い問題がこのフレームワークに帰着できる

## 実装例

グラフは残余容量を持つ隣接辞書(`u -> {v: 残余容量}`)として表現し、逆辺もあらかじめ容量0で用意しておく。増加パスの探索にはDFSを使う。

```python
def build_residual(graph: dict[str, dict[str, float]]) -> dict[str, dict[str, float]]:
    residual = {u: dict(neighbors) for u, neighbors in graph.items()}
    for u in graph:
        for v in graph[u]:
            residual.setdefault(v, {})
            residual[v].setdefault(u, 0)
    return residual


def dfs_find_path(residual, source: str, sink: str):
    visited = {source}
    stack = [(source, [source])]
    while stack:
        node, path = stack.pop()
        if node == sink:
            return path
        for neighbor, cap in residual.get(node, {}).items():
            if cap > 0 and neighbor not in visited:
                visited.add(neighbor)
                stack.append((neighbor, path + [neighbor]))
    return None


def ford_fulkerson(graph: dict[str, dict[str, float]], source: str, sink: str) -> float:
    residual = build_residual(graph)
    max_flow = 0
    while True:
        path = dfs_find_path(residual, source, sink)
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

function dfsFindPath(
  residual: Record<string, Record<string, number>>,
  source: string,
  sink: string
): string[] | null {
  const visited = new Set([source]);
  const stack: [string, string[]][] = [[source, [source]]];
  while (stack.length > 0) {
    const [node, path] = stack.pop()!;
    if (node === sink) return path;
    for (const [neighbor, cap] of Object.entries(residual[node] ?? {})) {
      if (cap > 0 && !visited.has(neighbor)) {
        visited.add(neighbor);
        stack.push([neighbor, [...path, neighbor]]);
      }
    }
  }
  return null;
}

function fordFulkerson(
  graph: Record<string, Record<string, number>>,
  source: string,
  sink: string
): number {
  const residual = buildResidual(graph);
  let maxFlow = 0;
  while (true) {
    const path = dfsFindPath(residual, source, sink);
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
#include <unordered_set>
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

std::optional<std::vector<std::string>> dfsFindPath(
    const FlowGraph& residual, const std::string& source, const std::string& sink) {
    std::unordered_set<std::string> visited{source};
    std::vector<std::pair<std::string, std::vector<std::string>>> stack;
    stack.push_back({source, {source}});
    while (!stack.empty()) {
        auto [node, path] = stack.back();
        stack.pop_back();
        if (node == sink) return path;
        auto it = residual.find(node);
        if (it == residual.end()) continue;
        for (const auto& [neighbor, cap] : it->second) {
            if (cap > 0 && !visited.count(neighbor)) {
                visited.insert(neighbor);
                auto newPath = path;
                newPath.push_back(neighbor);
                stack.push_back({neighbor, newPath});
            }
        }
    }
    return std::nullopt;
}

double fordFulkerson(const FlowGraph& graph, const std::string& source, const std::string& sink) {
    FlowGraph residual = buildResidual(graph);
    double maxFlow = 0;
    while (true) {
        auto path = dfsFindPath(residual, source, sink);
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
use std::collections::{HashMap, HashSet};

type FlowGraph = HashMap<String, HashMap<String, f64>>;

fn build_residual(graph: &FlowGraph) -> FlowGraph {
    let mut residual = graph.clone();
    for (_, neighbors) in graph {
        for (v, _) in neighbors {
            // 逆辺を容量0で用意(まだ無ければ)
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

fn dfs_find_path(residual: &FlowGraph, source: &str, sink: &str) -> Option<Vec<String>> {
    let mut visited: HashSet<String> = HashSet::from([source.to_string()]);
    let mut stack = vec![(source.to_string(), vec![source.to_string()])];
    while let Some((node, path)) = stack.pop() {
        if node == sink {
            return Some(path);
        }
        if let Some(neighbors) = residual.get(&node) {
            for (neighbor, &cap) in neighbors {
                if cap > 0.0 && !visited.contains(neighbor) {
                    visited.insert(neighbor.clone());
                    let mut new_path = path.clone();
                    new_path.push(neighbor.clone());
                    stack.push((neighbor.clone(), new_path));
                }
            }
        }
    }
    None
}

fn ford_fulkerson(graph: &FlowGraph, source: &str, sink: &str) -> f64 {
    let mut residual = build_residual(graph);
    let mut max_flow = 0.0;
    loop {
        let path = match dfs_find_path(&residual, source, sink) {
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

static List<string>? DfsFindPath(Dictionary<string, Dictionary<string, double>> residual, string source, string sink)
{
    var visited = new HashSet<string> { source };
    var stack = new Stack<(string node, List<string> path)>();
    stack.Push((source, new List<string> { source }));
    while (stack.Count > 0)
    {
        var (node, path) = stack.Pop();
        if (node == sink) return path;
        if (!residual.TryGetValue(node, out var neighbors)) continue;
        foreach (var (neighbor, cap) in neighbors)
        {
            if (cap > 0 && !visited.Contains(neighbor))
            {
                visited.Add(neighbor);
                var newPath = new List<string>(path) { neighbor };
                stack.Push((neighbor, newPath));
            }
        }
    }
    return null;
}

static double FordFulkerson(Dictionary<string, Dictionary<string, double>> graph, string source, string sink)
{
    var residual = BuildResidual(graph);
    double maxFlow = 0;
    while (true)
    {
        var path = DfsFindPath(residual, source, sink);
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
