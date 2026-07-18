---
name: 反復深化探索(IDDFS)
category: 探索
subcategory: グラフ・経路探索
complexity: O(b^d)
summary: 深さ制限を徐々に広げるDFS。メモリ効率とBFS相当の最短性を両立する。
---

## 概要

BFS(幅優先探索)は最短経路を保証できるがメモリを多く消費し、DFS(深さ優先探索)はメモリ効率が良いが最短性を保証できない——この2つのいいとこ取りを狙ったのが反復深化探索(Iterative Deepening DFS)。「深さ制限つきのDFS」を、制限を1段ずつ広げながら何度も繰り返す、という一見遠回りな発想で両方の利点を実現する。

## 仕組み

1. 深さ制限を0に設定し、DFSを行う(スタート地点だけを調べて終わる)
2. ゴールが見つからなければ、深さ制限を1増やして、**再びスタート地点からDFSをやり直す**
3. これを、ゴールが見つかるか探索すべき空間がなくなるまで繰り返す

「同じ浅い部分を何度も探索し直す」のは一見無駄に思えるが、木構造の性質上、浅い階層のノード数は深い階層に比べて圧倒的に少ない。そのため再探索のコストは全体からすればごくわずかで済み、最終的な計算量のオーダーは通常のBFSと大きくは変わらない。

## 特性・トレードオフ

- **計算量**: O(b^d)(b=分岐数、d=深さ)で、これは通常のBFS/DFSと同じオーダー。浅い階層を繰り返し探索する分のオーバーヘッドは、定数倍程度に収まる
- **メモリ効率**: DFSと同様、同時に保持する必要があるのは「今たどっている一本道」の分だけ。BFSのようにキューに大量のノードを溜め込む必要がない
- **最短性の保証**: 深さ制限を1つずつ広げていくため、最初に見つかった解が必ず最短(浅い方)の解になる。BFSと同じ保証をDFSベースの省メモリな実装で得られる
- **使いどころ**: チェスや将棋のようなゲーム木探索(深さが非常に大きく、BFSのメモリ消費が現実的でない場面)。「メモリは限られているが、最短手順を知りたい」という状況で真価を発揮する

## 実装例

```python
def dls(graph: dict[str, list[str]], node: str, goal: str, depth: int,
        path: list[str], visited: set[str]) -> list[str] | None:
    if node == goal:
        return path
    if depth <= 0:
        return None
    for neighbor in graph.get(node, []):
        if neighbor not in visited:
            visited.add(neighbor)
            result = dls(graph, neighbor, goal, depth - 1, path + [neighbor], visited)
            if result is not None:
                return result
            visited.remove(neighbor)
    return None


def iddfs(graph: dict[str, list[str]], start: str, goal: str, max_depth: int = 50) -> list[str] | None:
    for depth in range(max_depth + 1):
        visited = {start}
        result = dls(graph, start, goal, depth, [start], visited)
        if result is not None:
            return result
    return None
```

```typescript
function dls(
  graph: Record<string, string[]>,
  node: string,
  goal: string,
  depth: number,
  path: string[],
  visited: Set<string>
): string[] | null {
  if (node === goal) return path;
  if (depth <= 0) return null;
  for (const neighbor of graph[node] ?? []) {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);
      const result = dls(graph, neighbor, goal, depth - 1, [...path, neighbor], visited);
      if (result !== null) return result;
      visited.delete(neighbor);
    }
  }
  return null;
}

function iddfs(
  graph: Record<string, string[]>,
  start: string,
  goal: string,
  maxDepth = 50
): string[] | null {
  for (let depth = 0; depth <= maxDepth; depth++) {
    const visited = new Set([start]);
    const result = dls(graph, start, goal, depth, [start], visited);
    if (result !== null) return result;
  }
  return null;
}
```

```cpp
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <optional>

using Graph = std::unordered_map<std::string, std::vector<std::string>>;

std::optional<std::vector<std::string>> dls(
    const Graph& graph, const std::string& node, const std::string& goal,
    int depth, std::vector<std::string> path, std::unordered_set<std::string>& visited) {
    if (node == goal) return path;
    if (depth <= 0) return std::nullopt;
    auto it = graph.find(node);
    if (it == graph.end()) return std::nullopt;
    for (const auto& neighbor : it->second) {
        if (!visited.count(neighbor)) {
            visited.insert(neighbor);
            auto newPath = path;
            newPath.push_back(neighbor);
            auto result = dls(graph, neighbor, goal, depth - 1, newPath, visited);
            if (result.has_value()) return result;
            visited.erase(neighbor);
        }
    }
    return std::nullopt;
}

std::optional<std::vector<std::string>> iddfs(
    const Graph& graph, const std::string& start, const std::string& goal, int maxDepth = 50) {
    for (int depth = 0; depth <= maxDepth; depth++) {
        std::unordered_set<std::string> visited{start};
        auto result = dls(graph, start, goal, depth, {start}, visited);
        if (result.has_value()) return result;
    }
    return std::nullopt;
}
```

```rust
use std::collections::{HashMap, HashSet};

type Graph = HashMap<String, Vec<String>>;

fn dls(
    graph: &Graph,
    node: &str,
    goal: &str,
    depth: i32,
    path: Vec<String>,
    visited: &mut HashSet<String>,
) -> Option<Vec<String>> {
    if node == goal {
        return Some(path);
    }
    if depth <= 0 {
        return None;
    }
    if let Some(neighbors) = graph.get(node) {
        for neighbor in neighbors {
            if !visited.contains(neighbor) {
                visited.insert(neighbor.clone());
                let mut new_path = path.clone();
                new_path.push(neighbor.clone());
                if let Some(result) = dls(graph, neighbor, goal, depth - 1, new_path, visited) {
                    return Some(result);
                }
                visited.remove(neighbor);
            }
        }
    }
    None
}

fn iddfs(graph: &Graph, start: &str, goal: &str, max_depth: i32) -> Option<Vec<String>> {
    for depth in 0..=max_depth {
        let mut visited = HashSet::new();
        visited.insert(start.to_string());
        let result = dls(graph, start, goal, depth, vec![start.to_string()], &mut visited);
        if result.is_some() {
            return result;
        }
    }
    None
}
```

```csharp
static List<string>? Dls(Dictionary<string, List<string>> graph, string node, string goal, int depth, List<string> path, HashSet<string> visited)
{
    if (node == goal) return path;
    if (depth <= 0) return null;
    if (!graph.TryGetValue(node, out var neighbors)) return null;
    foreach (var neighbor in neighbors)
    {
        if (!visited.Contains(neighbor))
        {
            visited.Add(neighbor);
            var newPath = new List<string>(path) { neighbor };
            var result = Dls(graph, neighbor, goal, depth - 1, newPath, visited);
            if (result != null) return result;
            visited.Remove(neighbor);
        }
    }
    return null;
}

static List<string>? Iddfs(Dictionary<string, List<string>> graph, string start, string goal, int maxDepth = 50)
{
    for (int depth = 0; depth <= maxDepth; depth++)
    {
        var visited = new HashSet<string> { start };
        var result = Dls(graph, start, goal, depth, new List<string> { start }, visited);
        if (result != null) return result;
    }
    return null;
}
```
