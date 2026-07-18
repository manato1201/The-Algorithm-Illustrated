---
name: 逆削除法(Reverse-Delete Algorithm)
category: グラフ
subcategory: 最小全域木
complexity: O(E log E)(または辺のソートにO(E log V))
summary: クラスカル法とは正反対に、重い辺から順に「取り除いても連結性が保たれるなら削除する」ことを繰り返して最小全域木を構成する、貪欲法の対称的な発想によるアルゴリズム。
---

## 概要

[クラスカル法](/algorithms/kruskal)は「軽い辺から順に、閉路を作らない限り採用する」という加算的な貪欲戦略で最小全域木を構築するが、逆削除法はその名の通り、正反対の減算的な発想を取る——グラフの全ての辺から出発し、**重い辺から順に**、「その辺を取り除いてもグラフの連結性が保たれるなら削除する」ことを繰り返す。最終的に、それ以上削除すると非連結になってしまう辺だけが残り、それが最小全域木になる。[クラスカル法](/algorithms/kruskal)と同じ「辺を重みでソートして貪欲に判断する」という骨格を共有しながら、判断の方向(採用するか、削除するか)と順序(軽い順か、重い順か)が鏡写しになっている。

## 仕組み

1. グラフの全ての辺を重みの**降順**(重い順)にソートする(クラスカル法が昇順にソートするのと対照的)
2. 重い辺から順に、以下を判定する: その辺を取り除いた場合でも、グラフ全体が連結なままであるか([BFS](/algorithms/bfs)や[DFS](/algorithms/dfs)、または[Union-Find](/algorithms/union-find)の逆操作に相当する判定)
3. 連結性が保たれるなら、その辺を実際にグラフから削除する。連結性が失われる(その辺が現在唯一の連絡路になっている)なら、削除せずそのまま残す
4. 全ての辺について判定を終えたら、残った辺の集合が最小全域木になる

## 特性・トレードオフ

- **計算量**: 辺のソートに`O(E log E)`、各辺ごとの連結性判定に[BFS](/algorithms/bfs)や[DFS](/algorithms/dfs)を使うと`O(V+E)`かかるため、素朴な実装では全体で`O(E×(V+E))`と重くなりやすい。[クラスカル法](/algorithms/kruskal)が[Union-Find](/algorithms/union-find)を使って各判定を効率的な償却計算量`O(α(V))`で行えるのと比べ、逆削除法の「辺を取り除いても連結か」という判定は本質的に[Union-Find](/algorithms/union-find)の得意な「併合」ではなく苦手な「分割」の判定になるため、同等の効率化が難しい
- **[クラスカル法](/algorithms/kruskal)との理論的な対称性**: どちらも「辺の重みでソートし、貪欲に判断する」という同じ枠組みに属しており、最小全域木問題が「加算的な貪欲」と「減算的な貪欲」のどちらからでも正しく解けるという、問題の構造そのものへの理解を深める好例になっている
- **実務での採用は限定的**: 連結性判定の効率化が[クラスカル法](/algorithms/kruskal)ほど容易でないため、実務では[クラスカル法](/algorithms/kruskal)や[プリム法](/algorithms/prim)が優先して使われることが多い。逆削除法は主に理論的な対比・教育目的で言及される
- **使いどころ**: 最小全域木問題における貪欲法の双対性(加算的アプローチと減算的アプローチが同じ答えに到達すること)を学ぶ教材、ネットワーク設計において「余分な回線を安全に取り除いていく」という運用上の発想と自然に対応する場面の理論的裏付け

## 実装例

```python
def is_connected(n: int, edges: set[tuple[int, int]]) -> bool:
    """DFSで、辺集合edgesが表すグラフ全体が連結かどうかを判定する"""
    if n == 0:
        return True
    adj: list[list[int]] = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    visited = [False] * n
    stack = [0]
    visited[0] = True
    count = 1
    while stack:
        u = stack.pop()
        for v in adj[u]:
            if not visited[v]:
                visited[v] = True
                count += 1
                stack.append(v)
    return count == n


def reverse_delete_mst(n: int, edges: list[tuple[int, int, float]]) -> set[tuple[int, int]]:
    """辺を重い順にソートし、取り除いても連結性が保たれるなら削除する"""
    remaining = {(u, v) for u, v, _ in edges}
    sorted_edges = sorted(edges, key=lambda e: e[2], reverse=True)  # 重い順

    for u, v, _ in sorted_edges:
        edge = (u, v) if (u, v) in remaining else (v, u)
        if edge not in remaining:
            continue
        remaining.discard(edge)
        if not is_connected(n, remaining):
            remaining.add(edge)  # 取り除くと非連結になるので、削除を取り消す

    return remaining
```

```typescript
type WEdge = [number, number, number];

function edgeKey(u: number, v: number): string {
  return u < v ? `${u}-${v}` : `${v}-${u}`;
}

// DFSで、辺集合edgesが表すグラフ全体が連結かどうかを判定する
function isConnected(n: number, edges: Set<string>): boolean {
  if (n === 0) return true;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const key of edges) {
    const [u, v] = key.split("-").map(Number);
    adj[u].push(v);
    adj[v].push(u);
  }
  const visited = new Array(n).fill(false);
  const stack = [0];
  visited[0] = true;
  let count = 1;
  while (stack.length > 0) {
    const u = stack.pop()!;
    for (const v of adj[u]) {
      if (!visited[v]) {
        visited[v] = true;
        count++;
        stack.push(v);
      }
    }
  }
  return count === n;
}

// 辺を重い順にソートし、取り除いても連結性が保たれるなら削除する
function reverseDeleteMst(n: number, edges: WEdge[]): Set<string> {
  const remaining = new Set(edges.map(([u, v]) => edgeKey(u, v)));
  const sortedEdges = [...edges].sort((a, b) => b[2] - a[2]); // 重い順

  for (const [u, v] of sortedEdges) {
    const key = edgeKey(u, v);
    if (!remaining.has(key)) continue;
    remaining.delete(key);
    if (!isConnected(n, remaining)) {
      remaining.add(key); // 削除を取り消す
    }
  }

  return remaining;
}
```

```cpp
#include <vector>
#include <set>
#include <algorithm>
#include <tuple>

using Edge = std::pair<int, int>;

Edge normalize(int u, int v) { return u < v ? Edge{u, v} : Edge{v, u}; }

// DFSで、辺集合edgesが表すグラフ全体が連結かどうかを判定する
bool isConnected(int n, const std::set<Edge>& edges) {
    if (n == 0) return true;
    std::vector<std::vector<int>> adj(n);
    for (auto& [u, v] : edges) {
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    std::vector<bool> visited(n, false);
    std::vector<int> stack{0};
    visited[0] = true;
    int count = 1;
    while (!stack.empty()) {
        int u = stack.back();
        stack.pop_back();
        for (int v : adj[u]) {
            if (!visited[v]) {
                visited[v] = true;
                count++;
                stack.push_back(v);
            }
        }
    }
    return count == n;
}

// 辺を重い順にソートし、取り除いても連結性が保たれるなら削除する
std::set<Edge> reverseDeleteMst(int n, std::vector<std::tuple<int, int, double>> edges) {
    std::set<Edge> remaining;
    for (auto& [u, v, w] : edges) remaining.insert(normalize(u, v));

    std::sort(edges.begin(), edges.end(), [](auto& a, auto& b) { return std::get<2>(a) > std::get<2>(b); }); // 重い順

    for (auto& [u, v, w] : edges) {
        Edge edge = normalize(u, v);
        if (!remaining.count(edge)) continue;
        remaining.erase(edge);
        if (!isConnected(n, remaining)) {
            remaining.insert(edge); // 削除を取り消す
        }
    }

    return remaining;
}
```

```rust
use std::collections::HashSet;

fn normalize(u: usize, v: usize) -> (usize, usize) {
    if u < v { (u, v) } else { (v, u) }
}

// DFSで、辺集合edgesが表すグラフ全体が連結かどうかを判定する
fn is_connected(n: usize, edges: &HashSet<(usize, usize)>) -> bool {
    if n == 0 {
        return true;
    }
    let mut adj: Vec<Vec<usize>> = vec![Vec::new(); n];
    for &(u, v) in edges {
        adj[u].push(v);
        adj[v].push(u);
    }
    let mut visited = vec![false; n];
    let mut stack = vec![0usize];
    visited[0] = true;
    let mut count = 1;
    while let Some(u) = stack.pop() {
        for &v in &adj[u] {
            if !visited[v] {
                visited[v] = true;
                count += 1;
                stack.push(v);
            }
        }
    }
    count == n
}

// 辺を重い順にソートし、取り除いても連結性が保たれるなら削除する
fn reverse_delete_mst(n: usize, edges: &[(usize, usize, f64)]) -> HashSet<(usize, usize)> {
    let mut remaining: HashSet<(usize, usize)> = edges.iter().map(|&(u, v, _)| normalize(u, v)).collect();

    let mut sorted_edges = edges.to_vec();
    sorted_edges.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap()); // 重い順

    for &(u, v, _) in &sorted_edges {
        let edge = normalize(u, v);
        if !remaining.contains(&edge) {
            continue;
        }
        remaining.remove(&edge);
        if !is_connected(n, &remaining) {
            remaining.insert(edge); // 削除を取り消す
        }
    }

    remaining
}
```

```csharp
static (int, int) Normalize(int u, int v) => u < v ? (u, v) : (v, u);

// DFSで、辺集合edgesが表すグラフ全体が連結かどうかを判定する
static bool IsConnected(int n, HashSet<(int, int)> edges)
{
    if (n == 0) return true;
    var adj = new List<int>[n];
    for (int i = 0; i < n; i++) adj[i] = new List<int>();
    foreach (var (u, v) in edges)
    {
        adj[u].Add(v);
        adj[v].Add(u);
    }
    var visited = new bool[n];
    var stack = new Stack<int>();
    stack.Push(0);
    visited[0] = true;
    int count = 1;
    while (stack.Count > 0)
    {
        int u = stack.Pop();
        foreach (var v in adj[u])
        {
            if (!visited[v])
            {
                visited[v] = true;
                count++;
                stack.Push(v);
            }
        }
    }
    return count == n;
}

// 辺を重い順にソートし、取り除いても連結性が保たれるなら削除する
static HashSet<(int, int)> ReverseDeleteMst(int n, List<(int U, int V, double W)> edges)
{
    var remaining = new HashSet<(int, int)>(edges.Select(e => Normalize(e.U, e.V)));

    foreach (var e in edges.OrderByDescending(e => e.W)) // 重い順
    {
        var edge = Normalize(e.U, e.V);
        if (!remaining.Contains(edge)) continue;
        remaining.Remove(edge);
        if (!IsConnected(n, remaining))
        {
            remaining.Add(edge); // 削除を取り消す
        }
    }

    return remaining;
}
```
