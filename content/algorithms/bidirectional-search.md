---
name: 双方向探索(Bidirectional Search)
category: 探索
subcategory: グラフ・経路探索
complexity: O(b^(d/2))(b分岐数、d最短経路長。片方向探索のO(b^d)より高速)
summary: スタートからとゴールからの2方向で同時に探索を進め、両者が出会った時点で最短経路が確定する、片方向探索より指数的に少ない探索量で済む経路探索法。
---

## 概要

[BFS](/algorithms/bfs)や[A*探索](/algorithms/a-star)のような片方向の探索は、スタートからゴールまでの距離`d`に対して`O(b^d)`(`b`は分岐数)というノード数を調べる必要があり、`d`が大きいと組み合わせ爆発を起こす。双方向探索は、スタートからの探索とゴールからの逆方向の探索を同時に(交互に)進め、2つの探索の波面が出会った瞬間に最短経路が見つかったとみなす、という単純だが強力なアイデアに基づく。指数関数`b^d`は`d`を半分にするだけで劇的に小さくなるため(`b^(d/2)`は`b^d`よりはるかに小さい)、理論上は探索量を平方根オーダーまで削減できる。

## 仕組み

1. スタート地点からの[BFS](/algorithms/bfs)(前向き探索)と、ゴール地点からの[BFS](/algorithms/bfs)(逆向き探索、辺を逆向きに辿る)を、それぞれ独立したキューと訪問済み集合で準備する
2. 2つの探索を交互に(あるいは同じペースで)1ステップずつ進める
3. 各ステップの後、「前向き探索の訪問済み集合」と「逆向き探索の訪問済み集合」の共通部分(両方から到達済みのノード)がないかを確認する
4. 共通のノードが見つかったら、そこがスタートとゴールを繋ぐ経路の中間点になる。前向き探索でそのノードまでの経路と、逆向き探索でそのノードまでの経路(を逆にしたもの)を繋ぎ合わせると、スタートからゴールまでの最短経路が得られる
5. 共通ノードが見つかるまで2〜3を繰り返す

## 特性・トレードオフ

- **計算量**: 分岐数`b`、最短経路長`d`に対して、片方向探索が`O(b^d)`かかるのに対し、双方向探索は理論上`O(b^(d/2))`程度で済む——`d`が大きいグラフほど効果が顕著になる
- **逆方向探索の前提条件**: ゴールから逆向きに探索するには、グラフの辺を逆に辿れる必要がある(有向グラフの場合は逆辺の情報を別途持つか、無向グラフである必要がある)。この前提が満たせない問題には適用できない
- **2つの探索のバランス調整**: 前向きと逆向きの探索を同じペースで進めることが理論上の効果を得るために重要で、片方だけが先行しすぎると効果が薄れる。実装では、常に「フロンティア(境界)が小さい方」を優先的に1ステップ進める工夫がよく使われる
- **使いどころ**: カーナビ・地図アプリの経路探索(スタートとゴールが両方明確な場合)、ソーシャルネットワークにおける2人のユーザー間の最短関係(六次の隔たり)の探索、パズルゲームの解法探索(状態空間が大きい場合)における[A*探索](/algorithms/a-star)との組み合わせ(双方向A*)

## 実装例

```python
from collections import deque


def expand_layer(graph, queue, parent, other_parent):
    for _ in range(len(queue)):
        node = queue.popleft()
        for neighbor in graph.get(node, []):
            if neighbor not in parent:
                parent[neighbor] = node
                if neighbor in other_parent:
                    return neighbor
                queue.append(neighbor)
    return None


def bidirectional_search(graph: dict[str, list[str]], start: str, goal: str) -> list[str] | None:
    if start == goal:
        return [start]
    front_parent = {start: None}
    back_parent = {goal: None}
    front_queue = deque([start])
    back_queue = deque([goal])
    meeting = None
    while front_queue and back_queue and meeting is None:
        meeting = expand_layer(graph, front_queue, front_parent, back_parent)
        if meeting is None:
            meeting = expand_layer(graph, back_queue, back_parent, front_parent)
    if meeting is None:
        return None

    path_front = []
    node = meeting
    while node is not None:
        path_front.append(node)
        node = front_parent[node]
    path_front.reverse()

    path_back = []
    node = back_parent[meeting]
    while node is not None:
        path_back.append(node)
        node = back_parent[node]

    return path_front + path_back
```

```typescript
function expandLayer(
  graph: Record<string, string[]>,
  queue: string[],
  parent: Map<string, string | null>,
  otherParent: Map<string, string | null>,
): string | null {
  const layerSize = queue.length;
  for (let i = 0; i < layerSize; i++) {
    const node = queue.shift()!;
    for (const neighbor of graph[node] ?? []) {
      if (!parent.has(neighbor)) {
        parent.set(neighbor, node);
        if (otherParent.has(neighbor)) return neighbor;
        queue.push(neighbor);
      }
    }
  }
  return null;
}

function bidirectionalSearch(
  graph: Record<string, string[]>,
  start: string,
  goal: string,
): string[] | null {
  if (start === goal) return [start];
  const frontParent = new Map<string, string | null>([[start, null]]);
  const backParent = new Map<string, string | null>([[goal, null]]);
  const frontQueue = [start];
  const backQueue = [goal];
  let meeting: string | null = null;
  while (frontQueue.length > 0 && backQueue.length > 0 && meeting === null) {
    meeting = expandLayer(graph, frontQueue, frontParent, backParent);
    if (meeting === null) {
      meeting = expandLayer(graph, backQueue, backParent, frontParent);
    }
  }
  if (meeting === null) return null;

  const pathFront: string[] = [];
  let node: string | null = meeting;
  while (node !== null) {
    pathFront.push(node);
    node = frontParent.get(node) ?? null;
  }
  pathFront.reverse();

  const pathBack: string[] = [];
  node = backParent.get(meeting) ?? null;
  while (node !== null) {
    pathBack.push(node);
    node = backParent.get(node) ?? null;
  }
  return [...pathFront, ...pathBack];
}
```

```cpp
#include <string>
#include <unordered_map>
#include <vector>
#include <deque>
#include <optional>
#include <algorithm>

using Graph = std::unordered_map<std::string, std::vector<std::string>>;

std::optional<std::string> expandLayer(
    const Graph& graph, std::deque<std::string>& queue,
    std::unordered_map<std::string, std::optional<std::string>>& parent,
    const std::unordered_map<std::string, std::optional<std::string>>& otherParent) {
    std::size_t layerSize = queue.size();
    for (std::size_t i = 0; i < layerSize; i++) {
        std::string node = queue.front();
        queue.pop_front();
        auto it = graph.find(node);
        if (it == graph.end()) continue;
        for (const auto& neighbor : it->second) {
            if (!parent.count(neighbor)) {
                parent[neighbor] = node;
                if (otherParent.count(neighbor)) return neighbor;
                queue.push_back(neighbor);
            }
        }
    }
    return std::nullopt;
}

std::optional<std::vector<std::string>> bidirectionalSearch(
    const Graph& graph, const std::string& start, const std::string& goal) {
    if (start == goal) return std::vector<std::string>{start};

    std::unordered_map<std::string, std::optional<std::string>> frontParent{{start, std::nullopt}};
    std::unordered_map<std::string, std::optional<std::string>> backParent{{goal, std::nullopt}};
    std::deque<std::string> frontQueue{start};
    std::deque<std::string> backQueue{goal};
    std::optional<std::string> meeting;

    while (!frontQueue.empty() && !backQueue.empty() && !meeting.has_value()) {
        meeting = expandLayer(graph, frontQueue, frontParent, backParent);
        if (!meeting.has_value()) {
            meeting = expandLayer(graph, backQueue, backParent, frontParent);
        }
    }
    if (!meeting.has_value()) return std::nullopt;

    std::vector<std::string> pathFront;
    std::optional<std::string> node = meeting;
    while (node.has_value()) {
        pathFront.push_back(*node);
        node = frontParent[*node];
    }
    std::reverse(pathFront.begin(), pathFront.end());

    std::vector<std::string> pathBack;
    node = backParent[*meeting];
    while (node.has_value()) {
        pathBack.push_back(*node);
        node = backParent[*node];
    }

    pathFront.insert(pathFront.end(), pathBack.begin(), pathBack.end());
    return pathFront;
}
```

```rust
use std::collections::{HashMap, VecDeque};

fn expand_layer(
    graph: &HashMap<String, Vec<String>>,
    queue: &mut VecDeque<String>,
    parent: &mut HashMap<String, Option<String>>,
    other_parent: &HashMap<String, Option<String>>,
) -> Option<String> {
    let layer_size = queue.len();
    for _ in 0..layer_size {
        let node = queue.pop_front().unwrap();
        if let Some(neighbors) = graph.get(&node) {
            for neighbor in neighbors {
                if !parent.contains_key(neighbor) {
                    parent.insert(neighbor.clone(), Some(node.clone()));
                    if other_parent.contains_key(neighbor) {
                        return Some(neighbor.clone());
                    }
                    queue.push_back(neighbor.clone());
                }
            }
        }
    }
    None
}

fn bidirectional_search(
    graph: &HashMap<String, Vec<String>>,
    start: &str,
    goal: &str,
) -> Option<Vec<String>> {
    if start == goal {
        return Some(vec![start.to_string()]);
    }
    let mut front_parent: HashMap<String, Option<String>> = HashMap::from([(start.to_string(), None)]);
    let mut back_parent: HashMap<String, Option<String>> = HashMap::from([(goal.to_string(), None)]);
    let mut front_queue: VecDeque<String> = VecDeque::from([start.to_string()]);
    let mut back_queue: VecDeque<String> = VecDeque::from([goal.to_string()]);
    let mut meeting: Option<String> = None;

    while !front_queue.is_empty() && !back_queue.is_empty() && meeting.is_none() {
        meeting = expand_layer(graph, &mut front_queue, &mut front_parent, &back_parent);
        if meeting.is_none() {
            meeting = expand_layer(graph, &mut back_queue, &mut back_parent, &front_parent);
        }
    }
    let meeting = meeting?;

    let mut path_front = vec![];
    let mut node = Some(meeting.clone());
    while let Some(n) = node {
        path_front.push(n.clone());
        node = front_parent[&n].clone();
    }
    path_front.reverse();

    let mut path_back = vec![];
    let mut node = back_parent[&meeting].clone();
    while let Some(n) = node {
        path_back.push(n.clone());
        node = back_parent[&n].clone();
    }

    path_front.extend(path_back);
    Some(path_front)
}
```

```csharp
static string? ExpandLayer(Dictionary<string, List<string>> graph, Queue<string> queue, Dictionary<string, string?> parent, Dictionary<string, string?> otherParent)
{
    int layerSize = queue.Count;
    for (int i = 0; i < layerSize; i++)
    {
        var node = queue.Dequeue();
        if (!graph.TryGetValue(node, out var neighbors)) continue;
        foreach (var neighbor in neighbors)
        {
            if (!parent.ContainsKey(neighbor))
            {
                parent[neighbor] = node;
                if (otherParent.ContainsKey(neighbor)) return neighbor;
                queue.Enqueue(neighbor);
            }
        }
    }
    return null;
}

static List<string>? BidirectionalSearch(Dictionary<string, List<string>> graph, string start, string goal)
{
    if (start == goal) return new List<string> { start };
    var frontParent = new Dictionary<string, string?> { [start] = null };
    var backParent = new Dictionary<string, string?> { [goal] = null };
    var frontQueue = new Queue<string>(new[] { start });
    var backQueue = new Queue<string>(new[] { goal });
    string? meeting = null;
    while (frontQueue.Count > 0 && backQueue.Count > 0 && meeting == null)
    {
        meeting = ExpandLayer(graph, frontQueue, frontParent, backParent);
        if (meeting == null) meeting = ExpandLayer(graph, backQueue, backParent, frontParent);
    }
    if (meeting == null) return null;

    var pathFront = new List<string>();
    string? node = meeting;
    while (node != null)
    {
        pathFront.Add(node);
        node = frontParent[node];
    }
    pathFront.Reverse();

    var pathBack = new List<string>();
    node = backParent[meeting];
    while (node != null)
    {
        pathBack.Add(node);
        node = backParent[node];
    }

    pathFront.AddRange(pathBack);
    return pathFront;
}
```
