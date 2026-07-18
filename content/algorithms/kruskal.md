---
name: クラスカル法
category: グラフ
subcategory: 最小全域木
complexity: O(E log E)
summary: 辺をコストの小さい順に採用し、Union-Findで閉路を避けながら最小全域木を作る。
---

## 概要

最小全域木を求めるもうひとつの代表的な手法。プリム法が「頂点」を軸に木を広げていくのに対し、クラスカル法は**「辺」を軸に**、コストの小さい辺から順に「採用しても閉路ができないなら採用する」を繰り返すという、貪欲法の考え方がそのまま最適解に結びつく好例。

## 仕組み

1. 全ての辺を、コストの小さい順にソートする
2. コストの小さい辺から順に見ていき、その辺の両端の頂点が**まだ同じグループに属していなければ**(閉路ができないなら)、その辺を採用し、両端の頂点を同じグループに統合する
3. 既に同じグループに属している場合(採用すると閉路ができてしまう場合)は、その辺を捨てて次の辺に進む
4. 採用した辺の数が「頂点数-1」になったら、最小全域木が完成している

「同じグループに属しているかどうか」の判定と「グループの統合」を高速に行うために、**Union-Find(素集合データ構造)**がほぼ必須の相棒として使われる。この2つの技法はセットで学ばれることが多い。

## 特性・トレードオフ

- **計算量**: 辺のソートがO(E log E)で支配的。Union-Findによる判定・統合はほぼ定数時間(O(α(E))、αはアッカーマン関数の逆関数で実質定数とみなせる)なので、全体としてO(E log E)になる
- **貪欲法が最適解を導く証明済みの例**: 「今その場で最良に見える辺を選び続ける」という単純な貪欲戦略が、実際に大域的な最適解(最小全域木)に到達することが数学的に証明されている、貪欲法の教科書的な成功例
- **疎なグラフに強い**: 辺の数Eが少ない(頂点数に比べて疎な)グラフでは、ソートのコストが小さく済むため、プリム法より有利になりやすい
- **使いどころ**: プリム法と同じくインフラ設計(最小コストでの拠点接続)全般。Union-Findという再利用性の高いデータ構造を学ぶ入り口としても定番

## 実装例

```python
def kruskal(vertices: list[str], edges: list[tuple[str, str, float]]):
    parent = {v: v for v in vertices}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> bool:
        ra, rb = find(a), find(b)
        if ra == rb:
            return False
        parent[ra] = rb
        return True

    mst = []
    total = 0
    for u, v, w in sorted(edges, key=lambda e: e[2]):
        if union(u, v):
            mst.append((u, v, w))
            total += w
    return mst, total
```

```typescript
type Edge = [string, string, number];

function kruskal(
  vertices: string[],
  edges: Edge[],
): { mst: Edge[]; total: number } {
  const parent: Record<string, string> = {};
  for (const v of vertices) parent[v] = v;

  function find(x: string): string {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a: string, b: string): boolean {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  }

  const mst: Edge[] = [];
  let total = 0;
  const sorted = [...edges].sort((a, b) => a[2] - b[2]);
  for (const [u, v, w] of sorted) {
    if (union(u, v)) {
      mst.push([u, v, w]);
      total += w;
    }
  }
  return { mst, total };
}
```

```cpp
#include <string>
#include <unordered_map>
#include <vector>
#include <tuple>
#include <algorithm>
#include <functional>

using Edge = std::tuple<std::string, std::string, double>;

std::pair<std::vector<Edge>, double> kruskal(
    const std::vector<std::string>& vertices, std::vector<Edge> edges) {
    std::unordered_map<std::string, std::string> parent;
    for (const auto& v : vertices) parent[v] = v;

    std::function<std::string(std::string)> find = [&](std::string x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };
    auto unite = [&](const std::string& a, const std::string& b) {
        std::string ra = find(a), rb = find(b);
        if (ra == rb) return false;
        parent[ra] = rb;
        return true;
    };

    std::sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b) {
        return std::get<2>(a) < std::get<2>(b);
    });

    std::vector<Edge> mst;
    double total = 0;
    for (const auto& [u, v, w] : edges) {
        if (unite(u, v)) {
            mst.push_back({u, v, w});
            total += w;
        }
    }
    return {mst, total};
}
```

```rust
use std::collections::HashMap;

fn find(parent: &mut HashMap<String, String>, x: &str) -> String {
    let mut root = x.to_string();
    while parent[&root] != root {
        let grandparent = parent[&parent[&root]].clone();
        parent.insert(root.clone(), grandparent);
        root = parent[&root].clone();
    }
    root
}

fn union(parent: &mut HashMap<String, String>, a: &str, b: &str) -> bool {
    let ra = find(parent, a);
    let rb = find(parent, b);
    if ra == rb {
        return false;
    }
    parent.insert(ra, rb);
    true
}

fn kruskal(
    vertices: &[String],
    edges: &[(String, String, f64)],
) -> (Vec<(String, String, f64)>, f64) {
    let mut parent: HashMap<String, String> = vertices.iter().map(|v| (v.clone(), v.clone())).collect();
    let mut sorted_edges = edges.to_vec();
    sorted_edges.sort_by(|a, b| a.2.partial_cmp(&b.2).unwrap());

    let mut mst = vec![];
    let mut total = 0.0;
    for (u, v, w) in sorted_edges {
        if union(&mut parent, &u, &v) {
            mst.push((u, v, w));
            total += w;
        }
    }
    (mst, total)
}
```

```csharp
static (List<(string, string, double)> mst, double total) Kruskal(List<string> vertices, List<(string u, string v, double w)> edges)
{
    var parent = vertices.ToDictionary(v => v, v => v);

    string Find(string x)
    {
        while (parent[x] != x)
        {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    bool Union(string a, string b)
    {
        var ra = Find(a);
        var rb = Find(b);
        if (ra == rb) return false;
        parent[ra] = rb;
        return true;
    }

    var mst = new List<(string, string, double)>();
    double total = 0;
    foreach (var (u, v, w) in edges.OrderBy(e => e.w))
    {
        if (Union(u, v))
        {
            mst.Add((u, v, w));
            total += w;
        }
    }
    return (mst, total);
}
```
