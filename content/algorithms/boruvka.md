---
name: ボルーフカ法
category: グラフ
subcategory: 最小全域木
complexity: O(E log V)
summary: 各連結成分から最も安い辺を同時に選び続ける、並列化しやすい最小全域木アルゴリズム。
---

## 概要

最小全域木を求めるアルゴリズムとしては、実はプリム法やクラスカル法よりも**歴史が古い**(1926年、チェコの数学者オタカール・ボルーフカが電力網の設計問題を解くために考案した)。プリム法が「1つの頂点集合を1つずつ広げる」、クラスカル法が「辺を1本ずつコスト順に見る」のに対し、ボルーフカ法は**全ての連結成分が同時並行で"最も安い出口"を選ぶ**という、並列処理と相性の良いアプローチを取る。

## 仕組み

1. 最初、各頂点をそれぞれ独立した連結成分とみなす
2. **全ての連結成分について同時に**、その成分から出る辺(他の成分へつながる辺)の中で最もコストが小さいものを選ぶ
3. 選ばれた辺を全てまとめて採用する(複数の成分が同じ辺を選ぶ場合は重複を除く)。採用した辺によって、いくつかの連結成分が統合される
4. 連結成分が1つだけになるまで(全頂点が1つの木にまとまるまで)、2〜3を繰り返す

プリム法やクラスカル法が「1本ずつ」辺を採用していくのに対し、ボルーフカ法は**1回のフェーズで複数の辺をまとめて採用する**ため、フェーズが進むごとに連結成分の数が半分以下になる(各成分が最低1本は辺を選ぶため)。これにより、必要なフェーズ数がO(log V)に収まる。

## 特性・トレードオフ

- **計算量**: O(E log V)。プリム法・クラスカル法と同じオーダーだが、「フェーズごとに全成分が同時に辺を選ぶ」という構造が特徴的
- **並列化に強い**: 各フェーズにおいて「各連結成分が最も安い出口を選ぶ」処理は、成分ごとに独立して行えるため、並列計算機やGPU上での実装に向いている。これは同じ最小全域木アルゴリズムでもプリム法・クラスカル法にはない際立った特徴
- **他アルゴリズムとのハイブリッド**: 実務では、ボルーフカ法で連結成分の数をある程度まで減らしてから、プリム法やクラスカル法に切り替えるハイブリッドな実装が使われることもある
- **使いどころ**: 並列・分散環境での大規模グラフに対する最小全域木の計算。歴史的には電力網の設計問題(まさにインフラの最小コスト接続)が発端であり、現在でもその文脈での応用が多い

## 実装例

```python
def boruvka(vertices: list[str], edges: list[tuple[str, str, float]]):
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
    num_components = len(vertices)
    while num_components > 1:
        cheapest: dict[str, tuple[str, str, float]] = {}
        for u, v, w in edges:
            ru, rv = find(u), find(v)
            if ru == rv:
                continue
            if ru not in cheapest or cheapest[ru][2] > w:
                cheapest[ru] = (u, v, w)
            if rv not in cheapest or cheapest[rv][2] > w:
                cheapest[rv] = (u, v, w)

        added = False
        for u, v, w in cheapest.values():
            ru, rv = find(u), find(v)
            if ru != rv:
                union(ru, rv)
                mst.append((u, v, w))
                total += w
                num_components -= 1
                added = True
        if not added:
            break  # グラフが非連結
    return mst, total
```

```typescript
type Edge = [string, string, number];

function boruvka(
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
  let numComponents = vertices.length;
  while (numComponents > 1) {
    const cheapest: Record<string, Edge> = {};
    for (const [u, v, w] of edges) {
      const ru = find(u);
      const rv = find(v);
      if (ru === rv) continue;
      if (!(ru in cheapest) || cheapest[ru][2] > w) cheapest[ru] = [u, v, w];
      if (!(rv in cheapest) || cheapest[rv][2] > w) cheapest[rv] = [u, v, w];
    }

    let added = false;
    for (const [u, v, w] of Object.values(cheapest)) {
      const ru = find(u);
      const rv = find(v);
      if (ru !== rv) {
        union(ru, rv);
        mst.push([u, v, w]);
        total += w;
        numComponents--;
        added = true;
      }
    }
    if (!added) break;
  }
  return { mst, total };
}
```

```cpp
#include <string>
#include <unordered_map>
#include <vector>
#include <tuple>
#include <functional>

using Edge = std::tuple<std::string, std::string, double>;

std::pair<std::vector<Edge>, double> boruvka(
    const std::vector<std::string>& vertices, const std::vector<Edge>& edges) {
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

    std::vector<Edge> mst;
    double total = 0;
    int numComponents = static_cast<int>(vertices.size());

    while (numComponents > 1) {
        std::unordered_map<std::string, Edge> cheapest;
        for (const auto& [u, v, w] : edges) {
            std::string ru = find(u), rv = find(v);
            if (ru == rv) continue;
            if (!cheapest.count(ru) || std::get<2>(cheapest[ru]) > w) cheapest[ru] = {u, v, w};
            if (!cheapest.count(rv) || std::get<2>(cheapest[rv]) > w) cheapest[rv] = {u, v, w};
        }

        bool added = false;
        for (const auto& [key, edge] : cheapest) {
            const auto& [u, v, w] = edge;
            std::string ru = find(u), rv = find(v);
            if (ru != rv) {
                unite(ru, rv);
                mst.push_back(edge);
                total += w;
                numComponents--;
                added = true;
            }
        }
        if (!added) break;
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

fn boruvka(
    vertices: &[String],
    edges: &[(String, String, f64)],
) -> (Vec<(String, String, f64)>, f64) {
    let mut parent: HashMap<String, String> = vertices.iter().map(|v| (v.clone(), v.clone())).collect();
    let mut mst = vec![];
    let mut total = 0.0;
    let mut num_components = vertices.len();

    while num_components > 1 {
        let mut cheapest: HashMap<String, (String, String, f64)> = HashMap::new();
        for (u, v, w) in edges {
            let ru = find(&mut parent, u);
            let rv = find(&mut parent, v);
            if ru == rv {
                continue;
            }
            cheapest
                .entry(ru.clone())
                .and_modify(|e| if e.2 > *w { *e = (u.clone(), v.clone(), *w) })
                .or_insert((u.clone(), v.clone(), *w));
            cheapest
                .entry(rv.clone())
                .and_modify(|e| if e.2 > *w { *e = (u.clone(), v.clone(), *w) })
                .or_insert((u.clone(), v.clone(), *w));
        }

        let mut added = false;
        for (u, v, w) in cheapest.values() {
            let ru = find(&mut parent, u);
            let rv = find(&mut parent, v);
            if ru != rv {
                union(&mut parent, &ru, &rv);
                mst.push((u.clone(), v.clone(), *w));
                total += w;
                num_components -= 1;
                added = true;
            }
        }
        if !added {
            break;
        }
    }
    (mst, total)
}
```

```csharp
static (List<(string, string, double)> mst, double total) Boruvka(List<string> vertices, List<(string u, string v, double w)> edges)
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
    int numComponents = vertices.Count;
    while (numComponents > 1)
    {
        var cheapest = new Dictionary<string, (string u, string v, double w)>();
        foreach (var (u, v, w) in edges)
        {
            var ru = Find(u);
            var rv = Find(v);
            if (ru == rv) continue;
            if (!cheapest.ContainsKey(ru) || cheapest[ru].w > w) cheapest[ru] = (u, v, w);
            if (!cheapest.ContainsKey(rv) || cheapest[rv].w > w) cheapest[rv] = (u, v, w);
        }

        bool added = false;
        foreach (var (u, v, w) in cheapest.Values)
        {
            var ru = Find(u);
            var rv = Find(v);
            if (ru != rv)
            {
                Union(ru, rv);
                mst.Add((u, v, w));
                total += w;
                numComponents--;
                added = true;
            }
        }
        if (!added) break;
    }
    return (mst, total);
}
```
