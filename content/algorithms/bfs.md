---
name: 幅優先探索(BFS)
category: 探索
subcategory: グラフ・経路探索
complexity: O(V + E)
summary: 近い頂点から順に探索し、重みなしグラフでの最短経路を保証する。
---

## 概要

スタート地点から「近い順」に少しずつ輪を広げるように探索するグラフ探索アルゴリズム。水面に落ちた石から波紋が同心円状に広がっていく様子に近い。すべての辺のコストが等しい(重みなし)グラフにおいては、最初にゴールへ到達した経路が必ず最短経路になることが保証されるという、非常に強力な性質を持つ。

## 仕組み

1. スタート地点をキュー(先入れ先出しの待ち行列)に入れ、訪問済みとしてマークする
2. キューの先頭を取り出し、それが探索対象の現在地になる
3. 現在地に隣接する未訪問のマスをすべてキューの末尾に追加し、訪問済みとしてマークする(このとき「誰から来たか」も記録しておくと、後で経路を復元できる)
4. キューが空になるか、ゴールが見つかるまで2〜3を繰り返す
5. ゴールが見つかったら、記録しておいた「誰から来たか」を逆にたどって最短経路を復元する

キューという「先に入れたものを先に処理する」構造を使うことで、必ず近い距離のマスから順に処理されることが保証される。この可視化では、キューに積まれた次の候補を「次の候補」、既に調べ終えたマスを「探索済み」、最後に復元された最短経路を「最短経路」の色で示している。

## 特性・トレードオフ

- **計算量**: O(V + E)(V=頂点数、E=辺数)。全ての頂点と辺を高々1回ずつしか調べない
- **最短経路の保証**: 辺の重みが均一な場合に限り、最初にゴールへ到達した時点の経路が最短であることが数学的に保証される
- **メモリ使用量**: キューに同時に多数のノードが積まれうるため、深さ優先探索(DFS)に比べてメモリを多く使う傾向がある(探索の「幅」が広いグラフほど顕著)
- **使いどころ**: 迷路の最短路探索、SNSの「6次の隔たり」のような最短関係の発見、Web クローラーのリンクを近い順にたどる処理など。**重み付きグラフの最短経路にはそのまま使えない**(その場合はダイクストラ法などが必要)

## 実装例(隣接リストを受け取り、開始頂点からの訪問順序を返す)

```python
from collections import deque
from typing import Dict, List


def bfs(graph: Dict[str, List[str]], start: str) -> List[str]:
    visited = {start}
    order = []
    queue = deque([start])
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return order
```

```typescript
function bfs(graph: Map<string, string[]>, start: string): string[] {
  const visited = new Set<string>([start]);
  const order: string[] = [];
  const queue: string[] = [start];
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];
    order.push(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return order;
}
```

```cpp
#include <vector>
#include <string>
#include <queue>
#include <unordered_map>
#include <unordered_set>

std::vector<std::string> bfs(
    const std::unordered_map<std::string, std::vector<std::string>>& graph,
    const std::string& start) {
    std::unordered_set<std::string> visited{start};
    std::vector<std::string> order;
    std::queue<std::string> q;
    q.push(start);
    while (!q.empty()) {
        std::string node = q.front();
        q.pop();
        order.push_back(node);
        auto it = graph.find(node);
        if (it != graph.end()) {
            for (const auto& neighbor : it->second) {
                if (visited.find(neighbor) == visited.end()) {
                    visited.insert(neighbor);
                    q.push(neighbor);
                }
            }
        }
    }
    return order;
}
```

```rust
use std::collections::{HashMap, HashSet, VecDeque};

fn bfs(graph: &HashMap<String, Vec<String>>, start: &str) -> Vec<String> {
    let mut visited: HashSet<String> = HashSet::new();
    visited.insert(start.to_string());
    let mut order = Vec::new();
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(start.to_string());
    while let Some(node) = queue.pop_front() {
        order.push(node.clone());
        if let Some(neighbors) = graph.get(&node) {
            for neighbor in neighbors {
                if !visited.contains(neighbor) {
                    visited.insert(neighbor.clone());
                    queue.push_back(neighbor.clone());
                }
            }
        }
    }
    order
}
```

```csharp
static List<string> Bfs(Dictionary<string, List<string>> graph, string start)
{
    var visited = new HashSet<string> { start };
    var order = new List<string>();
    var queue = new Queue<string>();
    queue.Enqueue(start);
    while (queue.Count > 0)
    {
        var node = queue.Dequeue();
        order.Add(node);
        if (graph.TryGetValue(node, out var neighbors))
        {
            foreach (var neighbor in neighbors)
            {
                if (!visited.Contains(neighbor))
                {
                    visited.Add(neighbor);
                    queue.Enqueue(neighbor);
                }
            }
        }
    }
    return order;
}
```
