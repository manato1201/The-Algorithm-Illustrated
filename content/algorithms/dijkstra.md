---
name: ダイクストラ法
category: グラフ
subcategory: 最短路
complexity: O((V + E) log V)
summary: 重み付きグラフの最短経路を、確定済み頂点を1つずつ広げながら求める。負の辺には非対応。
---

## 概要

BFS(幅優先探索)は「歩数」が最短の経路を保証するが、道ごとに移動コスト(距離・時間・通行料など)が異なる現実の地図では、歩数最短が必ずしもコスト最小とは限らない。ダイクストラ法は、辺に重みがある(=道ごとにコストが違う)グラフに対して、スタートからの**累積コストが最小**の経路を求めるアルゴリズム。1959年にエドガー・ダイクストラが考案し、カーナビや物流の経路最適化など、現実の最短経路問題のデファクトスタンダードとして使われ続けている。

## 仕組み

1. スタート地点の累積コストを0、それ以外の頂点の累積コストを「無限大(未確定)」として初期化する
2. まだ確定していない頂点の中から、**累積コストが最小のもの**を選び、それを確定させる(BFSの「キューの先頭」が、ここでは「コスト最小」に置き換わる)
3. 確定した頂点に隣接する各頂点について、「確定した頂点の累積コスト + その辺の重み」を計算し、これが今までの記録より小さければ更新する(このとき「誰から来たか」も記録しておく)
4. 全頂点が確定するか、ゴールが確定するまで2〜3を繰り返す
5. 記録しておいた「誰から来たか」を逆にたどって最短経路を復元する

BFSの「先入れ先出しのキュー」が「コストが最小のものを優先して取り出す優先度付きキュー」に置き換わっただけ、と捉えると理解しやすい。この可視化では、コストの高い地形(重み5)をあえて配置しており、**BFS/DFSはコストを無視してその地形を素通りするのに対し、ダイクストラ法だけが迂回して、歩数は増えても総コストが低い経路を選ぶ**様子を対比できるようになっている。

## 特性・トレードオフ

- **計算量**: 優先度付きキュー(二分ヒープなど)を使う実装でO((V + E) log V)。愚直な実装(毎回全頂点から最小を探す)ならO(V²)になる
- **負の辺には対応できない**: 「一度確定した頂点のコストは、後から辺を通ってももう下がらない」という前提の上に成り立っているアルゴリズムのため、負の重みの辺があるとこの前提が崩れ、正しい答えが出せなくなる。負の辺を扱いたい場合はベルマン・フォード法を使う
- **単一始点最短経路**: 1つのスタート地点から全ての頂点への最短経路をまとめて求められる。全頂点対の最短経路が必要な場合はフロイド・ワーシャル法や、ダイクストラ法を全頂点分繰り返す方法が使われる
- **A*探索との関係**: A*探索は、ダイクストラ法に「ゴールまでの残り距離の推定値(ヒューリスティック)」を加えた拡張版にあたる。ゴールの位置がわかっている場合はA*の方が探索範囲を絞り込める

## 実装例(隣接リスト、非負の重み。単一始点からの最短距離を返す)

```python
import heapq
from typing import Dict, List, Tuple


def dijkstra(graph: Dict[str, List[Tuple[str, float]]], start: str) -> Dict[str, float]:
    dist: Dict[str, float] = {start: 0.0}
    visited = set()
    pq: List[Tuple[float, str]] = [(0.0, start)]
    while pq:
        d, node = heapq.heappop(pq)
        if node in visited:
            continue
        visited.add(node)
        for neighbor, weight in graph.get(node, []):
            nd = d + weight
            if nd < dist.get(neighbor, float("inf")):
                dist[neighbor] = nd
                heapq.heappush(pq, (nd, neighbor))
    return dist
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

function dijkstra(
  graph: Map<string, [string, number][]>,
  start: string
): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  const visited = new Set<string>();
  const pq = new MinHeap<string>();
  pq.push(0, start);
  while (!pq.isEmpty) {
    const popped = pq.pop();
    if (!popped) break;
    const [d, node] = popped;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const [neighbor, weight] of graph.get(node) ?? []) {
      const nd = d + weight;
      if (nd < (dist.get(neighbor) ?? Infinity)) {
        dist.set(neighbor, nd);
        pq.push(nd, neighbor);
      }
    }
  }
  return dist;
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <utility>

std::unordered_map<std::string, double> dijkstra(
    const std::unordered_map<std::string, std::vector<std::pair<std::string, double>>>& graph,
    const std::string& start) {
    std::unordered_map<std::string, double> dist;
    dist[start] = 0.0;
    std::unordered_set<std::string> visited;
    using P = std::pair<double, std::string>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> pq;
    pq.push({0.0, start});
    while (!pq.empty()) {
        auto [d, node] = pq.top();
        pq.pop();
        if (visited.count(node)) continue;
        visited.insert(node);
        auto it = graph.find(node);
        if (it != graph.end()) {
            for (const auto& [neighbor, weight] : it->second) {
                double nd = d + weight;
                auto found = dist.find(neighbor);
                if (found == dist.end() || nd < found->second) {
                    dist[neighbor] = nd;
                    pq.push({nd, neighbor});
                }
            }
        }
    }
    return dist;
}
```

```rust
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};

#[derive(PartialEq)]
struct State {
    cost: f64,
    node: String,
}

impl Eq for State {}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        // 最小ヒープにするため大小関係を反転させる
        other.cost.partial_cmp(&self.cost).unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn dijkstra(graph: &HashMap<String, Vec<(String, f64)>>, start: &str) -> HashMap<String, f64> {
    let mut dist: HashMap<String, f64> = HashMap::new();
    dist.insert(start.to_string(), 0.0);
    let mut visited: HashSet<String> = HashSet::new();
    let mut heap = BinaryHeap::new();
    heap.push(State { cost: 0.0, node: start.to_string() });

    while let Some(State { cost, node }) = heap.pop() {
        if visited.contains(&node) {
            continue;
        }
        visited.insert(node.clone());
        if let Some(neighbors) = graph.get(&node) {
            for (neighbor, weight) in neighbors {
                let nd = cost + weight;
                if nd < *dist.get(neighbor).unwrap_or(&f64::INFINITY) {
                    dist.insert(neighbor.clone(), nd);
                    heap.push(State { cost: nd, node: neighbor.clone() });
                }
            }
        }
    }
    dist
}
```

```csharp
static Dictionary<string, double> Dijkstra(
    Dictionary<string, List<(string to, double weight)>> graph, string start)
{
    var dist = new Dictionary<string, double> { [start] = 0 };
    var visited = new HashSet<string>();
    var pq = new PriorityQueue<string, double>();
    pq.Enqueue(start, 0);
    while (pq.Count > 0)
    {
        var node = pq.Dequeue();
        if (visited.Contains(node)) continue;
        visited.Add(node);
        double d = dist[node];
        if (graph.TryGetValue(node, out var neighbors))
        {
            foreach (var (to, weight) in neighbors)
            {
                double nd = d + weight;
                if (!dist.TryGetValue(to, out var cur) || nd < cur)
                {
                    dist[to] = nd;
                    pq.Enqueue(to, nd);
                }
            }
        }
    }
    return dist;
}
```
