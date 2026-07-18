---
name: A*探索
category: 探索
subcategory: グラフ・経路探索
complexity: O(E)
summary: ヒューリスティックで探索方向を絞り込むダイクストラ法の拡張。ゲームの経路探索の定番。
---

## 概要

ダイクストラ法は「スタートからの距離が近い順」に律儀に全方向を調べるため、ゴールの方向がわかっていても無駄な探索をしてしまうことがある。A*(エースター)探索は、これに「ゴールまでの残り距離の見積もり(ヒューリスティック)」を加味することで、ゴール方向を優先的に探索する。1968年に考案されて以来、ゲームのキャラクター移動やカーナビの経路探索など、実世界で最も広く使われる経路探索アルゴリズムのひとつになっている。

## 仕組み

1. 各マス(頂点)の優先度を `f = g + h` で決める。`g` はスタートからそのマスまでの実際のコスト、`h` はそのマスからゴールまでの**推定**コスト(ヒューリスティック関数)
2. `f` が最小のマスを優先度付きキューから取り出し、そこを現在地とする
3. 現在地に隣接するマスについて、それぞれの `g` と `h` から `f` を計算し、優先度付きキューに追加する
4. ゴールに到達するまで2〜3を繰り返す

ヒューリスティック関数`h`が「実際のコストを絶対に過大評価しない」(admissibleである)という条件を満たしていれば、A*は**最短経路を保証**する。グリッド上の経路探索では、マンハッタン距離やユークリッド距離がよく使われる。

## 特性・トレードオフ

- **計算量**: 最悪でもダイクストラ法と同程度だが、**良いヒューリスティックがあれば実際に調べるノード数を劇的に減らせる**。h=0(推定を一切しない)にすると、A*はダイクストラ法そのものに一致する
- **最短経路の保証**: ヒューリスティックが「過大評価しない」性質を満たす限り保証される。過大評価するヒューリスティックを使うと探索は速くなるが最短性は失われる(ゲームAIなどではこのトレードオフをあえて選ぶこともある)
- **ヒューリスティック関数の設計が本質**: どれだけ賢く「ゴールまでの残り距離」を見積もれるかが性能を左右する。設計が悪いと(例えば常にh=0)、A*の恩恵はほぼ得られない
- **使いどころ**: ゲームのキャラクター移動、ロボットの経路計画、カーナビの経路探索など、「地図上のゴールの位置がわかっている」経路探索のほぼデファクトスタンダード

## 実装例(重み付きグラフ+ヒューリスティック関数でstartからgoalへの最短経路を求める)

```python
import heapq
from typing import Callable, Dict, List, Optional, Tuple


def a_star(
    graph: Dict[str, List[Tuple[str, float]]],
    start: str,
    goal: str,
    heuristic: Callable[[str], float],
) -> Optional[List[str]]:
    open_set: List[Tuple[float, str]] = [(heuristic(start), start)]
    g_score: Dict[str, float] = {start: 0.0}
    came_from: Dict[str, str] = {}
    visited = set()
    while open_set:
        _, node = heapq.heappop(open_set)
        if node == goal:
            path = [node]
            while node in came_from:
                node = came_from[node]
                path.append(node)
            return path[::-1]
        if node in visited:
            continue
        visited.add(node)
        for neighbor, weight in graph.get(node, []):
            tentative_g = g_score[node] + weight
            if tentative_g < g_score.get(neighbor, float("inf")):
                g_score[neighbor] = tentative_g
                came_from[neighbor] = node
                heapq.heappush(open_set, (tentative_g + heuristic(neighbor), neighbor))
    return None
```

```typescript
class MinHeap<T> {
  private items: [number, T][] = [];
  push(priority: number, item: T): void {
    this.items.push([priority, item]);
    this.items.sort((a, b) => a[0] - b[0]);
  }
  pop(): [number, T] | undefined {
    return this.items.shift();
  }
  get isEmpty(): boolean {
    return this.items.length === 0;
  }
}

function aStar(
  graph: Map<string, [string, number][]>,
  start: string,
  goal: string,
  heuristic: (node: string) => number
): string[] | null {
  const gScore = new Map<string, number>([[start, 0]]);
  const cameFrom = new Map<string, string>();
  const visited = new Set<string>();
  const open = new MinHeap<string>();
  open.push(heuristic(start), start);
  while (!open.isEmpty) {
    const popped = open.pop();
    if (!popped) break;
    const [, node] = popped;
    if (node === goal) {
      const path = [node];
      let cur = node;
      while (cameFrom.has(cur)) {
        cur = cameFrom.get(cur)!;
        path.push(cur);
      }
      return path.reverse();
    }
    if (visited.has(node)) continue;
    visited.add(node);
    for (const [neighbor, weight] of graph.get(node) ?? []) {
      const tentativeG = (gScore.get(node) ?? Infinity) + weight;
      if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
        gScore.set(neighbor, tentativeG);
        cameFrom.set(neighbor, node);
        open.push(tentativeG + heuristic(neighbor), neighbor);
      }
    }
  }
  return null;
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <functional>
#include <optional>
#include <algorithm>
#include <utility>

std::optional<std::vector<std::string>> aStar(
    const std::unordered_map<std::string, std::vector<std::pair<std::string, double>>>& graph,
    const std::string& start, const std::string& goal,
    std::function<double(const std::string&)> heuristic) {
    std::unordered_map<std::string, double> gScore;
    gScore[start] = 0.0;
    std::unordered_map<std::string, std::string> cameFrom;
    std::unordered_set<std::string> visited;

    using P = std::pair<double, std::string>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> open;
    open.push({heuristic(start), start});

    while (!open.empty()) {
        auto [f, node] = open.top();
        open.pop();
        if (node == goal) {
            std::vector<std::string> path{node};
            while (cameFrom.count(node)) {
                node = cameFrom[node];
                path.push_back(node);
            }
            std::reverse(path.begin(), path.end());
            return path;
        }
        if (visited.count(node)) continue;
        visited.insert(node);
        auto it = graph.find(node);
        if (it != graph.end()) {
            for (const auto& [neighbor, weight] : it->second) {
                double tentativeG = gScore[node] + weight;
                auto found = gScore.find(neighbor);
                if (found == gScore.end() || tentativeG < found->second) {
                    gScore[neighbor] = tentativeG;
                    cameFrom[neighbor] = node;
                    open.push({tentativeG + heuristic(neighbor), neighbor});
                }
            }
        }
    }
    return std::nullopt;
}
```

```rust
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};

#[derive(PartialEq)]
struct Candidate {
    f_score: f64,
    node: String,
}

impl Eq for Candidate {}

impl Ord for Candidate {
    fn cmp(&self, other: &Self) -> Ordering {
        // 最小ヒープにするため大小関係を反転させる
        other.f_score.partial_cmp(&self.f_score).unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for Candidate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn a_star<H: Fn(&str) -> f64>(
    graph: &HashMap<String, Vec<(String, f64)>>,
    start: &str,
    goal: &str,
    heuristic: H,
) -> Option<Vec<String>> {
    let mut g_score: HashMap<String, f64> = HashMap::new();
    g_score.insert(start.to_string(), 0.0);
    let mut came_from: HashMap<String, String> = HashMap::new();
    let mut visited: HashSet<String> = HashSet::new();

    let mut open = BinaryHeap::new();
    open.push(Candidate { f_score: heuristic(start), node: start.to_string() });

    while let Some(Candidate { node, .. }) = open.pop() {
        if node == goal {
            let mut path = vec![node.clone()];
            let mut cur = node;
            while let Some(prev) = came_from.get(&cur) {
                path.push(prev.clone());
                cur = prev.clone();
            }
            path.reverse();
            return Some(path);
        }
        if visited.contains(&node) {
            continue;
        }
        visited.insert(node.clone());
        if let Some(neighbors) = graph.get(&node) {
            for (neighbor, weight) in neighbors {
                let tentative_g = g_score[&node] + weight;
                if tentative_g < *g_score.get(neighbor).unwrap_or(&f64::INFINITY) {
                    g_score.insert(neighbor.clone(), tentative_g);
                    came_from.insert(neighbor.clone(), node.clone());
                    open.push(Candidate {
                        f_score: tentative_g + heuristic(neighbor),
                        node: neighbor.clone(),
                    });
                }
            }
        }
    }
    None
}
```

```csharp
static List<string>? AStar(Dictionary<string, List<(string to, double weight)>> graph,
                            string start, string goal, Func<string, double> heuristic)
{
    var gScore = new Dictionary<string, double> { [start] = 0 };
    var cameFrom = new Dictionary<string, string>();
    var visited = new HashSet<string>();
    var open = new PriorityQueue<string, double>();
    open.Enqueue(start, heuristic(start));
    while (open.Count > 0)
    {
        var node = open.Dequeue();
        if (node == goal)
        {
            var path = new List<string> { node };
            while (cameFrom.ContainsKey(node))
            {
                node = cameFrom[node];
                path.Add(node);
            }
            path.Reverse();
            return path;
        }
        if (visited.Contains(node)) continue;
        visited.Add(node);
        if (graph.TryGetValue(node, out var neighbors))
        {
            foreach (var (to, weight) in neighbors)
            {
                double tentativeG = gScore[node] + weight;
                if (!gScore.TryGetValue(to, out var cur) || tentativeG < cur)
                {
                    gScore[to] = tentativeG;
                    cameFrom[to] = node;
                    open.Enqueue(to, tentativeG + heuristic(to));
                }
            }
        }
    }
    return null;
}
```
