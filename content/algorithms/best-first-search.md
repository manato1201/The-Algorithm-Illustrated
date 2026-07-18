---
name: 貪欲最良優先探索(Greedy Best-First Search)
category: 探索
subcategory: グラフ・経路探索
complexity: O(E)(E辺数、優先度付きキュー使用時)
summary: スタートからの実際のコストを一切考慮せず、ゴールまでの推定距離(ヒューリスティック)だけを頼りに最も有望に見えるノードへ突き進む、A*探索から最適性の保証を外した高速な近似探索法。
---

## 概要

[A*探索](/algorithms/a-star)は`f = g + h`(スタートからの実コスト`g`とゴールまでの推定コスト`h`の合計)で優先順位を決めることで最短経路を保証するが、`g`の計算・比較には相応のコストがかかる。貪欲最良優先探索は、この`g`を完全に無視し、ヒューリスティック`h`(ゴールまでの推定距離)だけを頼りに「今、最もゴールに近そうに見えるノード」へひたすら進む、より単純で高速だが最短性の保証を失った探索法である。名前に反して、必ずしも「良い」経路を保証しないが、探索が速く済むという明確なトレードオフを提供する。

## 仕組み

1. 優先度付きキューに、スタートノードをヒューリスティック値`h(スタート)`で登録する
2. キューから`h`が最小のノードを取り出し、それを現在地とする
3. 現在地がゴールなら探索終了。そうでなければ、隣接するノードそれぞれについて`h`(ゴールまでの推定距離)を計算し、優先度付きキューに追加する(スタートからの実コスト`g`は一切追跡しない)
4. ゴールに到達するか、キューが空になるまで2〜3を繰り返す

[A*探索](/algorithms/a-star)が「これまでの実コスト+残りの推定コスト」という2つの情報を天秤にかけるのに対し、貪欲最良優先探索は「残りの推定コスト」だけを見て突き進む——ヒューリスティックが完璧であればこれでも最短経路になるが、ヒューリスティックが不完全な現実の多くの場面では、遠回りな経路を選んでしまうことがある。

## 特性・トレードオフ

- **計算量**: [A*探索](/algorithms/a-star)と同じく優先度付きキューを使った実装で`O(E log V)`程度だが、`g`の管理・更新が不要な分、定数倍のオーバーヘッドは軽い。より重要なのは、ヒューリスティックが強く効く場面では実際に調べるノード数が[A*探索](/algorithms/a-star)よりさらに少なくなりやすい点である
- **最短経路の保証を失う**: `g`(実際にかかったコスト)を考慮しないため、見た目上ゴールに近そうな方向へ進んだ結果、実は大回りだった、という経路を選んでしまうことがある。[A*探索](/algorithms/a-star)のような「ヒューリスティックが過大評価しなければ最短性を保証する」という性質は持たない
- **速度と最適性のトレードオフの典型例**: [A*探索](/algorithms/a-star)からdijkstra的な厳密さ(`g`の考慮)を取り除いた極端な形と位置づけられ、「速いが最適とは限らない」探索の代表例として、最適性を保証する探索とのトレードオフを学ぶ教材にもなる
- **使いどころ**: リアルタイム性が最短性よりも重要な場面(ゲームAIの大まかな方向づけ、初期解の高速生成)、[A*探索](/algorithms/a-star)の前段階として大まかな見込みを立てるためのヒューリスティック探索、パズル解法における枝刈りの初期候補生成

## 実装例

```python
import heapq


def best_first_search(
    graph: dict[str, list[str]], heuristics: dict[str, float], start: str, goal: str
) -> list[str] | None:
    visited: set[str] = set()
    pq = [(heuristics[start], start, [start])]
    while pq:
        h, node, path = heapq.heappop(pq)
        if node == goal:
            return path
        if node in visited:
            continue
        visited.add(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                heapq.heappush(pq, (heuristics[neighbor], neighbor, path + [neighbor]))
    return None
```

```typescript
function bestFirstSearch(
  graph: Record<string, string[]>,
  heuristics: Record<string, number>,
  start: string,
  goal: string
): string[] | null {
  const visited = new Set<string>();
  const pq: [number, string, string[]][] = [[heuristics[start], start, [start]]];
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [, node, path] = pq.shift()!;
    if (node === goal) return path;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbor of graph[node] ?? []) {
      if (!visited.has(neighbor)) {
        pq.push([heuristics[neighbor], neighbor, [...path, neighbor]]);
      }
    }
  }
  return null;
}
```

```cpp
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <queue>
#include <optional>

using Graph = std::unordered_map<std::string, std::vector<std::string>>;

struct Candidate {
    double h;
    std::string node;
    std::vector<std::string> path;
};

struct CandidateCompare {
    bool operator()(const Candidate& a, const Candidate& b) const {
        return a.h > b.h; // 最小のhを優先
    }
};

std::optional<std::vector<std::string>> bestFirstSearch(
    const Graph& graph, const std::unordered_map<std::string, double>& heuristics,
    const std::string& start, const std::string& goal) {
    std::unordered_set<std::string> visited;
    std::priority_queue<Candidate, std::vector<Candidate>, CandidateCompare> pq;
    pq.push({heuristics.at(start), start, {start}});

    while (!pq.empty()) {
        Candidate current = pq.top();
        pq.pop();
        if (current.node == goal) return current.path;
        if (visited.count(current.node)) continue;
        visited.insert(current.node);
        auto it = graph.find(current.node);
        if (it == graph.end()) continue;
        for (const auto& neighbor : it->second) {
            if (!visited.count(neighbor)) {
                auto newPath = current.path;
                newPath.push_back(neighbor);
                pq.push({heuristics.at(neighbor), neighbor, newPath});
            }
        }
    }
    return std::nullopt;
}
```

```rust
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};

#[derive(Clone)]
struct Candidate {
    h: i64,
    node: String,
    path: Vec<String>,
}

impl PartialEq for Candidate {
    fn eq(&self, other: &Self) -> bool {
        self.h == other.h
    }
}
impl Eq for Candidate {}
impl Ord for Candidate {
    fn cmp(&self, other: &Self) -> Ordering {
        other.h.cmp(&self.h) // 最小のhを優先(最小ヒープ化)
    }
}
impl PartialOrd for Candidate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn best_first_search(
    graph: &HashMap<String, Vec<String>>,
    heuristics: &HashMap<String, i64>,
    start: &str,
    goal: &str,
) -> Option<Vec<String>> {
    let mut visited: HashSet<String> = HashSet::new();
    let mut pq = BinaryHeap::new();
    pq.push(Candidate {
        h: heuristics[start],
        node: start.to_string(),
        path: vec![start.to_string()],
    });

    while let Some(current) = pq.pop() {
        if current.node == goal {
            return Some(current.path);
        }
        if visited.contains(&current.node) {
            continue;
        }
        visited.insert(current.node.clone());
        if let Some(neighbors) = graph.get(&current.node) {
            for neighbor in neighbors {
                if !visited.contains(neighbor) {
                    let mut new_path = current.path.clone();
                    new_path.push(neighbor.clone());
                    pq.push(Candidate {
                        h: heuristics[neighbor],
                        node: neighbor.clone(),
                        path: new_path,
                    });
                }
            }
        }
    }
    None
}
```

```csharp
static List<string>? BestFirstSearch(Dictionary<string, List<string>> graph, Dictionary<string, double> heuristics, string start, string goal)
{
    var visited = new HashSet<string>();
    var pq = new List<(double h, string node, List<string> path)> { (heuristics[start], start, new List<string> { start }) };
    while (pq.Count > 0)
    {
        pq.Sort((a, b) => a.h.CompareTo(b.h));
        var (h, node, path) = pq[0];
        pq.RemoveAt(0);
        if (node == goal) return path;
        if (visited.Contains(node)) continue;
        visited.Add(node);
        if (!graph.TryGetValue(node, out var neighbors)) continue;
        foreach (var neighbor in neighbors)
        {
            if (!visited.Contains(neighbor))
            {
                var newPath = new List<string>(path) { neighbor };
                pq.Add((heuristics[neighbor], neighbor, newPath));
            }
        }
    }
    return null;
}
```
