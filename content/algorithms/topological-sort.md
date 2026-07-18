---
name: トポロジカルソート
category: グラフ
subcategory: 連結性・順序
complexity: O(V + E)
summary: 依存関係のあるタスクを実行可能な順序に並べる。DAG(有向非巡回グラフ)にのみ適用できる。
---

## 概要

「AをやってからでないとBはできない」という依存関係が矢印(有向辺)で表されたグラフがあるとき、**全ての依存関係を満たすようにタスクを一列に並べる**問題。大学の履修計画(前提科目を先に取る)、ビルドシステムのタスク実行順序、スプレッドシートのセルの再計算順序など、「順序に制約がある作業をどう並べるか」というごく日常的な問題を、グラフ理論の言葉で解く代表例。

## 仕組み(DFSベース)

1. 各頂点をDFSで訪問する
2. ある頂点から出る全ての辺(=その頂点に依存するタスク)を先に再帰的に訪問し尽くしてから、その頂点自体を結果リストの**先頭**に追加する(あるいは訪問完了順にリストへ追加し、最後に全体を反転する)
3. 全頂点の訪問が終わったとき、結果リストが依存関係を満たす順序になっている

「自分に依存する全てのタスクを先に片付けてから、自分をリストに載せる」という発想により、依存元は必ず依存先より後ろに並ぶことが保証される。

## 特性・トレードオフ

- **計算量**: O(V + E)。DFSベースもカーンのアルゴリズム(BFS的な別解法)も同じオーダー
- **DAG(有向非巡回グラフ)にしか適用できない**: 依存関係に循環(AがBに依存し、BもAに依存する)があると、そもそも矛盾のない順序が存在しないため、トポロジカルソートは失敗する。DFSベースの実装では「訪問中」の頂点に再度到達したら閉路の存在を検出できる
- **答えが一意とは限らない**: 依存関係を満たす順序が複数存在する場合、どれを選ぶかはアルゴリズムの実装(訪問順序)に依存する。全ての妥当な順序が「正解」になりうる
- **使いどころ**: ビルドツール・パッケージマネージャの依存解決順序、スプレッドシートのセル再計算順序、大学のカリキュラム設計、タスクスケジューラなど、「順序制約のあるタスク群をどう並べて実行するか」というソフトウェア工学の随所に登場する

## 実装例

```python
def topological_sort(graph: dict[str, list[str]]) -> list[str]:
    visited: set[str] = set()
    result: list[str] = []

    def dfs(node: str) -> None:
        visited.add(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                dfs(neighbor)
        result.append(node)

    for node in graph:
        if node not in visited:
            dfs(node)
    result.reverse()
    return result
```

```typescript
function topologicalSort(graph: Record<string, string[]>): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function dfs(node: string) {
    visited.add(node);
    for (const neighbor of graph[node] ?? []) {
      if (!visited.has(neighbor)) dfs(neighbor);
    }
    result.push(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) dfs(node);
  }
  return result.reverse();
}
```

```cpp
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <algorithm>
#include <functional>

using Graph = std::unordered_map<std::string, std::vector<std::string>>;

std::vector<std::string> topologicalSort(const Graph& graph) {
    std::unordered_set<std::string> visited;
    std::vector<std::string> result;

    std::function<void(const std::string&)> dfs = [&](const std::string& node) {
        visited.insert(node);
        auto it = graph.find(node);
        if (it != graph.end()) {
            for (const auto& neighbor : it->second) {
                if (!visited.count(neighbor)) dfs(neighbor);
            }
        }
        result.push_back(node);
    };

    for (const auto& [node, _] : graph) {
        if (!visited.count(node)) dfs(node);
    }
    std::reverse(result.begin(), result.end());
    return result;
}
```

```rust
use std::collections::{HashMap, HashSet};

fn dfs(
    graph: &HashMap<String, Vec<String>>,
    node: &str,
    visited: &mut HashSet<String>,
    result: &mut Vec<String>,
) {
    visited.insert(node.to_string());
    if let Some(neighbors) = graph.get(node) {
        for neighbor in neighbors {
            if !visited.contains(neighbor) {
                dfs(graph, neighbor, visited, result);
            }
        }
    }
    result.push(node.to_string());
}

fn topological_sort(graph: &HashMap<String, Vec<String>>) -> Vec<String> {
    let mut visited = HashSet::new();
    let mut result = vec![];
    for node in graph.keys() {
        if !visited.contains(node) {
            dfs(graph, node, &mut visited, &mut result);
        }
    }
    result.reverse();
    result
}
```

```csharp
static List<string> TopologicalSort(Dictionary<string, List<string>> graph)
{
    var visited = new HashSet<string>();
    var result = new List<string>();

    void Dfs(string node)
    {
        visited.Add(node);
        if (graph.TryGetValue(node, out var neighbors))
        {
            foreach (var neighbor in neighbors)
            {
                if (!visited.Contains(neighbor)) Dfs(neighbor);
            }
        }
        result.Add(node);
    }

    foreach (var node in graph.Keys)
    {
        if (!visited.Contains(node)) Dfs(node);
    }
    result.Reverse();
    return result;
}
```
