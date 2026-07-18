---
name: タージャンの強連結成分分解
category: グラフ
subcategory: 連結性・順序
complexity: O(V + E)
summary: 1回のDFSで有向グラフの強連結成分をすべて求める。
---

## 概要

有向グラフにおいて、「頂点Aから頂点Bへ到達でき、かつBからAへも到達できる」頂点同士をひとまとめにしたグループを「強連結成分(SCC)」と呼ぶ。タージャンのアルゴリズムは、**たった1回のDFS(深さ優先探索)だけ**で、グラフ全体の強連結成分を全て見つけ出す、驚くほど効率的な手法。1972年にロバート・タージャンが考案した。

## 仕組み

DFSで各頂点を訪問する際、2つの数値を管理するのが鍵になる:
- **発見時刻(discovery time)**: その頂点をDFSで最初に訪れた順番
- **低リンク値(low-link value)**: その頂点からDFSの木の辺・後退辺をたどって到達できる、最も早く発見された頂点の発見時刻

1. DFSで頂点を訪問するたびに、発見時刻を記録し、訪問中の頂点をスタックに積む
2. 隣接する頂点を再帰的に訪問し、戻ってきたら自分の低リンク値を「子の低リンク値」で更新する(より小さければ)。まだスタックに残っている頂点への後退辺があれば、その頂点の発見時刻でも低リンク値を更新する
3. **ある頂点の低リンク値が自分自身の発見時刻と一致したとき**、その頂点は1つの強連結成分の「根」であるとわかる。このとき、スタックからその頂点まで積まれている全ての頂点を取り出せば、それが1つの強連結成分になる

「低リンク値が自分の発見時刻と一致する=自分より上には後退辺で戻れない=ここが強連結成分の境界」という、DFSの訪問順序の性質だけから境界を見抜く発想が、このアルゴリズムの核心。

## 特性・トレードオフ

- **計算量**: O(V + E)。1回のDFSで完結するため、非常に効率が良い
- **同種のアルゴリズムとの比較**: 強連結成分を求める別解法として「コサラジュのアルゴリズム(2回のDFSが必要)」もあるが、タージャンの方法は1回のDFSで済む分、実装はやや複雑になる代わりに効率が良い
- **DAGへの縮約**: 強連結成分ごとに1つの頂点にまとめてしまう(縮約する)と、元のグラフから必ずDAG(有向非巡回グラフ)が得られる。これにより、複雑な有向グラフの問題を「まず強連結成分でグループ化し、DAGとして扱う」という形に単純化できる
- **使いどころ**: ソフトウェアのモジュール間の循環依存の検出、Webページのリンク構造の解析、デッドロック検出(待ち合いの循環を見つける)、コンパイラの静的解析など

## 実装例

```python
def tarjan_scc(graph: dict[str, list[str]]) -> list[list[str]]:
    index_counter = [0]
    stack: list[str] = []
    on_stack: set[str] = set()
    indices: dict[str, int] = {}
    lowlink: dict[str, int] = {}
    result: list[list[str]] = []

    def strongconnect(node: str) -> None:
        indices[node] = index_counter[0]
        lowlink[node] = index_counter[0]
        index_counter[0] += 1
        stack.append(node)
        on_stack.add(node)

        for neighbor in graph.get(node, []):
            if neighbor not in indices:
                strongconnect(neighbor)
                lowlink[node] = min(lowlink[node], lowlink[neighbor])
            elif neighbor in on_stack:
                lowlink[node] = min(lowlink[node], indices[neighbor])

        if lowlink[node] == indices[node]:
            component = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                component.append(w)
                if w == node:
                    break
            result.append(component)

    for node in graph:
        if node not in indices:
            strongconnect(node)
    return result
```

```typescript
function tarjanScc(graph: Record<string, string[]>): string[][] {
  let indexCounter = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const result: string[][] = [];

  function strongconnect(node: string) {
    indices.set(node, indexCounter);
    lowlink.set(node, indexCounter);
    indexCounter++;
    stack.push(node);
    onStack.add(node);

    for (const neighbor of graph[node] ?? []) {
      if (!indices.has(neighbor)) {
        strongconnect(neighbor);
        lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(neighbor)!));
      } else if (onStack.has(neighbor)) {
        lowlink.set(node, Math.min(lowlink.get(node)!, indices.get(neighbor)!));
      }
    }

    if (lowlink.get(node) === indices.get(node)) {
      const component: string[] = [];
      while (true) {
        const w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
        if (w === node) break;
      }
      result.push(component);
    }
  }

  for (const node of Object.keys(graph)) {
    if (!indices.has(node)) strongconnect(node);
  }
  return result;
}
```

```cpp
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <functional>
#include <algorithm>
#include <climits>

using Graph = std::unordered_map<std::string, std::vector<std::string>>;

std::vector<std::vector<std::string>> tarjanScc(const Graph& graph) {
    int indexCounter = 0;
    std::vector<std::string> stack;
    std::unordered_set<std::string> onStack;
    std::unordered_map<std::string, int> indices;
    std::unordered_map<std::string, int> lowlink;
    std::vector<std::vector<std::string>> result;

    std::function<void(const std::string&)> strongconnect = [&](const std::string& node) {
        indices[node] = indexCounter;
        lowlink[node] = indexCounter;
        indexCounter++;
        stack.push_back(node);
        onStack.insert(node);

        auto it = graph.find(node);
        if (it != graph.end()) {
            for (const auto& neighbor : it->second) {
                if (!indices.count(neighbor)) {
                    strongconnect(neighbor);
                    lowlink[node] = std::min(lowlink[node], lowlink[neighbor]);
                } else if (onStack.count(neighbor)) {
                    lowlink[node] = std::min(lowlink[node], indices[neighbor]);
                }
            }
        }

        if (lowlink[node] == indices[node]) {
            std::vector<std::string> component;
            while (true) {
                std::string w = stack.back();
                stack.pop_back();
                onStack.erase(w);
                component.push_back(w);
                if (w == node) break;
            }
            result.push_back(component);
        }
    };

    for (const auto& [node, _] : graph) {
        if (!indices.count(node)) strongconnect(node);
    }
    return result;
}
```

```rust
use std::collections::{HashMap, HashSet};

struct TarjanState {
    index_counter: i32,
    stack: Vec<String>,
    on_stack: HashSet<String>,
    indices: HashMap<String, i32>,
    lowlink: HashMap<String, i32>,
    result: Vec<Vec<String>>,
}

fn strongconnect(graph: &HashMap<String, Vec<String>>, node: &str, state: &mut TarjanState) {
    state.indices.insert(node.to_string(), state.index_counter);
    state.lowlink.insert(node.to_string(), state.index_counter);
    state.index_counter += 1;
    state.stack.push(node.to_string());
    state.on_stack.insert(node.to_string());

    if let Some(neighbors) = graph.get(node) {
        for neighbor in neighbors.clone() {
            if !state.indices.contains_key(&neighbor) {
                strongconnect(graph, &neighbor, state);
                let low = state.lowlink[&neighbor].min(state.lowlink[node]);
                state.lowlink.insert(node.to_string(), low);
            } else if state.on_stack.contains(&neighbor) {
                let low = state.indices[&neighbor].min(state.lowlink[node]);
                state.lowlink.insert(node.to_string(), low);
            }
        }
    }

    if state.lowlink[node] == state.indices[node] {
        let mut component = vec![];
        loop {
            let w = state.stack.pop().unwrap();
            state.on_stack.remove(&w);
            let is_node = w == node;
            component.push(w);
            if is_node {
                break;
            }
        }
        state.result.push(component);
    }
}

fn tarjan_scc(graph: &HashMap<String, Vec<String>>) -> Vec<Vec<String>> {
    let mut state = TarjanState {
        index_counter: 0,
        stack: vec![],
        on_stack: HashSet::new(),
        indices: HashMap::new(),
        lowlink: HashMap::new(),
        result: vec![],
    };
    for node in graph.keys() {
        if !state.indices.contains_key(node) {
            strongconnect(graph, node, &mut state);
        }
    }
    state.result
}
```

```csharp
static List<List<string>> TarjanScc(Dictionary<string, List<string>> graph)
{
    int indexCounter = 0;
    var stack = new List<string>();
    var onStack = new HashSet<string>();
    var indices = new Dictionary<string, int>();
    var lowlink = new Dictionary<string, int>();
    var result = new List<List<string>>();

    void StrongConnect(string node)
    {
        indices[node] = indexCounter;
        lowlink[node] = indexCounter;
        indexCounter++;
        stack.Add(node);
        onStack.Add(node);

        if (graph.TryGetValue(node, out var neighbors))
        {
            foreach (var neighbor in neighbors)
            {
                if (!indices.ContainsKey(neighbor))
                {
                    StrongConnect(neighbor);
                    lowlink[node] = Math.Min(lowlink[node], lowlink[neighbor]);
                }
                else if (onStack.Contains(neighbor))
                {
                    lowlink[node] = Math.Min(lowlink[node], indices[neighbor]);
                }
            }
        }

        if (lowlink[node] == indices[node])
        {
            var component = new List<string>();
            while (true)
            {
                var w = stack[^1];
                stack.RemoveAt(stack.Count - 1);
                onStack.Remove(w);
                component.Add(w);
                if (w == node) break;
            }
            result.Add(component);
        }
    }

    foreach (var node in graph.Keys)
    {
        if (!indices.ContainsKey(node)) StrongConnect(node);
    }
    return result;
}
```
