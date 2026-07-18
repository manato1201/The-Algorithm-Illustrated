---
name: Hierholzerのアルゴリズム(オイラー路)
category: グラフ
subcategory: 連結性・順序
complexity: O(V+E)
summary: グラフの全ての辺をちょうど1回ずつ通る経路(オイラー路・オイラー閉路)を、小さな閉路を見つけては経路に挿入していくことを繰り返して構築する古典的アルゴリズム。
---

## 概要

「ケーニヒスベルクの七つの橋」問題(全ての橋をちょうど1回ずつ渡って町を一周できるか)は、1736年にオイラーによって初めて数学的に定式化された、グラフ理論の起源とされる問題である。グラフの全ての辺をちょうど1回ずつ通る経路をオイラー路(始点と終点が同じならオイラー閉路)と呼び、1873年にカール・ヒエルホルツァーが発表したこのアルゴリズムは、「全頂点の次数が偶数(オイラー閉路の場合)」という存在条件を満たすグラフに対して、実際にそのオイラー路を線形時間で構築する方法を与える。[de Bruijnグラフによるゲノムアセンブリ](/algorithms/de-bruijn-graph-assembly)がまさにこのアルゴリズムを応用してゲノム配列を復元することでも知られる。

## 仕組み

1. オイラー路(閉路)が存在するかを確認する: 無向グラフの場合、オイラー閉路には「全頂点の次数が偶数」、オイラー路(始点と終点が異なってもよい)には「次数が奇数の頂点がちょうど0個または2個」という条件が必要
2. 適当な頂点(オイラー路の場合は次数が奇数の頂点)から出発し、まだ使っていない辺を辿れる限り辿っていき、1つの閉路(またはこれ以上進めない経路)を作る——この経路をスタックに積みながら進む
3. スタックの先頭(現在地)から、まだ未使用の辺が出ている頂点があれば、そこを新たな起点として2と同様に閉路を作り、元の経路に「挿入」する(閉路と閉路を繋ぎ合わせるイメージ)
4. 全ての辺が使用済みになるまで2〜3を繰り返す。最終的にスタックに積まれた頂点の列を逆順に読むと、全辺をちょうど1回ずつ通るオイラー路(閉路)になる

## 特性・トレードオフ

- **計算量**: 各辺をちょうど1回だけ処理するため`O(V+E)`。効率的なデータ構造(隣接リストと「まだ使っていない辺」への高速なアクセス)を使えば線形時間で完了する
- **存在条件の事前確認が必須**: このアルゴリズムはオイラー路(閉路)が存在することを前提に動作する。次数の条件を満たさないグラフには適用できず、事前に頂点の次数を数えて存在条件を確認する必要がある
- **ハミルトン路との対比**: 「全ての辺を1回ずつ通る」オイラー路は多項式時間で判定・構築できるのに対し、「全ての頂点を1回ずつ訪れる」[ハミルトン路](/algorithms/tsp-bitdp)(巡回セールスマン問題に関連)は一般に[NP困難](/algorithms/branch-and-bound)であり、似た響きの問題でありながら計算量の困難さが全く異なる、という好対照な事例として教育的にも重要である
- **使いどころ**: [de Bruijnグラフによるゲノムアセンブリ](/algorithms/de-bruijn-graph-assembly)における最終的な配列の復元、郵便配達員問題(全ての道を通って配達するための最短巡回路)、回路基板の配線パターンの検証、SNSのいいねグラフのような辺データから訪問順序を復元する場面

## 実装例

```python
def find_euler_circuit(n: int, edges: list[tuple[int, int]]) -> list[int] | None:
    """無向グラフ(頂点0..n-1)のオイラー閉路を求める。存在しなければNoneを返す。"""
    adj: list[list[tuple[int, int]]] = [[] for _ in range(n)]  # (隣接頂点, 辺ID)
    for edge_id, (u, v) in enumerate(edges):
        adj[u].append((v, edge_id))
        adj[v].append((u, edge_id))

    degree = [len(a) for a in adj]
    if any(d % 2 != 0 for d in degree):
        return None
    if not edges:
        return [0] if n > 0 else []

    used_edge = [False] * len(edges)
    ptr = [0] * n  # 各頂点で次に調べる隣接辺のインデックス
    start = next((v for v in range(n) if degree[v] > 0), 0)

    stack = [start]
    circuit: list[int] = []
    while stack:
        v = stack[-1]
        advanced = False
        while ptr[v] < len(adj[v]):
            nxt, edge_id = adj[v][ptr[v]]
            ptr[v] += 1
            if not used_edge[edge_id]:
                used_edge[edge_id] = True
                stack.append(nxt)
                advanced = True
                break
        if not advanced:
            circuit.append(stack.pop())

    circuit.reverse()
    if len(circuit) != len(edges) + 1:
        return None  # グラフが連結でない
    return circuit
```

```typescript
function findEulerCircuit(n: number, edges: [number, number][]): number[] | null {
  const adj: [number, number][][] = Array.from({ length: n }, () => []);
  edges.forEach(([u, v], edgeId) => {
    adj[u].push([v, edgeId]);
    adj[v].push([u, edgeId]);
  });

  const degree = adj.map((a) => a.length);
  if (degree.some((d) => d % 2 !== 0)) return null;
  if (edges.length === 0) return n > 0 ? [0] : [];

  const usedEdge = new Array(edges.length).fill(false);
  const ptr = new Array(n).fill(0);
  let start = 0;
  for (let v = 0; v < n; v++) {
    if (degree[v] > 0) { start = v; break; }
  }

  const stack = [start];
  const circuit: number[] = [];
  while (stack.length > 0) {
    const v = stack[stack.length - 1];
    let advanced = false;
    while (ptr[v] < adj[v].length) {
      const [nxt, edgeId] = adj[v][ptr[v]];
      ptr[v]++;
      if (!usedEdge[edgeId]) {
        usedEdge[edgeId] = true;
        stack.push(nxt);
        advanced = true;
        break;
      }
    }
    if (!advanced) circuit.push(stack.pop()!);
  }

  circuit.reverse();
  if (circuit.length !== edges.length + 1) return null;
  return circuit;
}
```

```cpp
#include <vector>
#include <optional>
#include <algorithm>

std::optional<std::vector<int>> findEulerCircuit(int n, const std::vector<std::pair<int, int>>& edges) {
    std::vector<std::vector<std::pair<int, int>>> adj(n);
    for (int edgeId = 0; edgeId < static_cast<int>(edges.size()); edgeId++) {
        auto [u, v] = edges[edgeId];
        adj[u].push_back({v, edgeId});
        adj[v].push_back({u, edgeId});
    }

    std::vector<int> degree(n);
    for (int v = 0; v < n; v++) degree[v] = static_cast<int>(adj[v].size());
    for (int d : degree) {
        if (d % 2 != 0) return std::nullopt;
    }
    if (edges.empty()) {
        return n > 0 ? std::optional<std::vector<int>>({0}) : std::vector<int>{};
    }

    std::vector<bool> usedEdge(edges.size(), false);
    std::vector<int> ptr(n, 0);
    int start = 0;
    for (int v = 0; v < n; v++) {
        if (degree[v] > 0) { start = v; break; }
    }

    std::vector<int> stack{start};
    std::vector<int> circuit;
    while (!stack.empty()) {
        int v = stack.back();
        bool advanced = false;
        while (ptr[v] < static_cast<int>(adj[v].size())) {
            auto [nxt, edgeId] = adj[v][ptr[v]];
            ptr[v]++;
            if (!usedEdge[edgeId]) {
                usedEdge[edgeId] = true;
                stack.push_back(nxt);
                advanced = true;
                break;
            }
        }
        if (!advanced) {
            circuit.push_back(stack.back());
            stack.pop_back();
        }
    }

    std::reverse(circuit.begin(), circuit.end());
    if (circuit.size() != edges.size() + 1) return std::nullopt;
    return circuit;
}
```

```rust
fn find_euler_circuit(n: usize, edges: &[(usize, usize)]) -> Option<Vec<usize>> {
    let mut adj: Vec<Vec<(usize, usize)>> = vec![Vec::new(); n];
    for (edge_id, &(u, v)) in edges.iter().enumerate() {
        adj[u].push((v, edge_id));
        adj[v].push((u, edge_id));
    }

    let degree: Vec<usize> = adj.iter().map(|a| a.len()).collect();
    if degree.iter().any(|d| d % 2 != 0) {
        return None;
    }
    if edges.is_empty() {
        return Some(if n > 0 { vec![0] } else { vec![] });
    }

    let mut used_edge = vec![false; edges.len()];
    let mut ptr = vec![0usize; n];
    let start = (0..n).find(|&v| degree[v] > 0).unwrap_or(0);

    let mut stack = vec![start];
    let mut circuit = Vec::new();
    while let Some(&v) = stack.last() {
        let mut advanced = false;
        while ptr[v] < adj[v].len() {
            let (nxt, edge_id) = adj[v][ptr[v]];
            ptr[v] += 1;
            if !used_edge[edge_id] {
                used_edge[edge_id] = true;
                stack.push(nxt);
                advanced = true;
                break;
            }
        }
        if !advanced {
            circuit.push(stack.pop().unwrap());
        }
    }

    circuit.reverse();
    if circuit.len() != edges.len() + 1 {
        return None;
    }
    Some(circuit)
}
```

```csharp
static List<int>? FindEulerCircuit(int n, (int, int)[] edges)
{
    var adj = new List<(int next, int edgeId)>[n];
    for (int i = 0; i < n; i++) adj[i] = new List<(int, int)>();
    for (int edgeId = 0; edgeId < edges.Length; edgeId++)
    {
        var (u, v) = edges[edgeId];
        adj[u].Add((v, edgeId));
        adj[v].Add((u, edgeId));
    }

    var degree = adj.Select(a => a.Count).ToArray();
    if (degree.Any(d => d % 2 != 0)) return null;
    if (edges.Length == 0) return n > 0 ? new List<int> { 0 } : new List<int>();

    var usedEdge = new bool[edges.Length];
    var ptr = new int[n];
    int start = 0;
    for (int v = 0; v < n; v++)
    {
        if (degree[v] > 0) { start = v; break; }
    }

    var stack = new List<int> { start };
    var circuit = new List<int>();
    while (stack.Count > 0)
    {
        int v = stack[^1];
        bool advanced = false;
        while (ptr[v] < adj[v].Count)
        {
            var (nxt, edgeId) = adj[v][ptr[v]];
            ptr[v]++;
            if (!usedEdge[edgeId])
            {
                usedEdge[edgeId] = true;
                stack.Add(nxt);
                advanced = true;
                break;
            }
        }
        if (!advanced)
        {
            circuit.Add(stack[^1]);
            stack.RemoveAt(stack.Count - 1);
        }
    }

    circuit.Reverse();
    if (circuit.Count != edges.Length + 1) return null;
    return circuit;
}
```
