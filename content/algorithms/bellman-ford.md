---
name: ベルマン・フォード法
category: グラフ
subcategory: 最短路
complexity: O(VE)
summary: 負の辺を許容する最短経路法。負閉路の検出にも使える。
---

## 概要

ダイクストラ法は高速だが、負の重みを持つ辺があると正しく動作しない(一度確定した頂点のコストがもう下がらない、という前提が崩れるため)。ベルマン・フォード法は、この制約を取り払い、**負の辺があっても正しく単一始点最短経路を求められる**アルゴリズム。ダイクストラ法より遅い代わりに適用範囲が広く、さらに「負の閉路(ぐるぐる回るほど総コストが下がり続ける経路)」の存在を検出できるという独自の強みも持つ。

## 仕組み

1. スタート地点の距離を0、それ以外を無限大として初期化する
2. **全ての辺**について、「辺の始点の距離 + 辺の重み < 辺の終点の距離」であれば、終点の距離を更新する(この操作を「緩和」と呼ぶ)
3. この「全ての辺を緩和する」という操作を、**頂点数-1回**繰り返す(グラフの最短経路は最大でも頂点数-1本の辺しか使わないため、これだけ繰り返せば十分)
4. 頂点数-1回の緩和が終わった後、**もう1回だけ**全ての辺を緩和してみる。もしこの追加の1回でまだ距離が更新される辺があれば、それは負の閉路が存在する証拠——理論上ありえない「無限に短くなる経路」が存在してしまっている

ダイクストラ法の「確定済み頂点を1つずつ広げる」洗練された戦略とは対照的に、ベルマン・フォード法は「とにかく全部の辺を何度も緩和する」という、力任せながら正しさが保証しやすいアプローチを取る。

## 特性・トレードオフ

- **計算量**: O(VE)(V=頂点数、E=辺数)。頂点数-1回×全辺の緩和を行うため、ダイクストラ法のO((V+E) log V)より遅い
- **負の辺に対応できる**: ダイクストラ法最大の弱点を克服している。ただし負の閉路がある場合、「最短経路」自体が定義できない(いくらでも小さくできてしまう)ため、その検出こそがベルマン・フォード法の重要な役割になる
- **負閉路検出の実用性**: 為替の裁定取引(通貨をぐるぐる交換すると利益が出る組み合わせがないか)の検出など、「コストの総和が負になる閉路がないか」を調べたい場面で、この副産物的な性質がそのまま主目的として使われることがある
- **使いどころ**: 負のコスト(割引・還元・利益)を持つ辺があるネットワークの最短経路問題。負の辺がないと分かっている場合は、素直にダイクストラ法を使う方が高速

## 実装例

負閉路が存在する場合は`None`(言語によっては`null`)を返し、そうでなければ各頂点までの最短距離を返す。

```python
def bellman_ford(
    vertices: list[str], edges: list[tuple[str, str, float]], start: str
) -> dict[str, float] | None:
    dist = {v: float("inf") for v in vertices}
    dist[start] = 0
    for _ in range(len(vertices) - 1):
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            return None  # 負閉路を検出
    return dist
```

```typescript
type Edge = [string, string, number];

function bellmanFord(
  vertices: string[],
  edges: Edge[],
  start: string
): Record<string, number> | null {
  const dist: Record<string, number> = {};
  for (const v of vertices) dist[v] = Infinity;
  dist[start] = 0;
  for (let i = 0; i < vertices.length - 1; i++) {
    for (const [u, v, w] of edges) {
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }
  for (const [u, v, w] of edges) {
    if (dist[u] + w < dist[v]) return null;
  }
  return dist;
}
```

```cpp
#include <string>
#include <unordered_map>
#include <vector>
#include <tuple>
#include <optional>
#include <limits>

using Edge = std::tuple<std::string, std::string, double>;

std::optional<std::unordered_map<std::string, double>> bellmanFord(
    const std::vector<std::string>& vertices, const std::vector<Edge>& edges, const std::string& start) {
    std::unordered_map<std::string, double> dist;
    for (const auto& v : vertices) dist[v] = std::numeric_limits<double>::infinity();
    dist[start] = 0;

    for (std::size_t i = 0; i + 1 < vertices.size(); i++) {
        for (const auto& [u, v, w] : edges) {
            if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
        }
    }
    for (const auto& [u, v, w] : edges) {
        if (dist[u] + w < dist[v]) return std::nullopt; // 負閉路を検出
    }
    return dist;
}
```

```rust
use std::collections::HashMap;

fn bellman_ford(
    vertices: &[String],
    edges: &[(String, String, f64)],
    start: &str,
) -> Option<HashMap<String, f64>> {
    let mut dist: HashMap<String, f64> = vertices.iter().map(|v| (v.clone(), f64::INFINITY)).collect();
    dist.insert(start.to_string(), 0.0);

    for _ in 0..vertices.len().saturating_sub(1) {
        for (u, v, w) in edges {
            let du = dist[u];
            if du + w < dist[v] {
                dist.insert(v.clone(), du + w);
            }
        }
    }
    for (u, v, w) in edges {
        if dist[u] + w < dist[v] {
            return None; // 負閉路を検出
        }
    }
    Some(dist)
}
```

```csharp
static Dictionary<string, double>? BellmanFord(List<string> vertices, List<(string u, string v, double w)> edges, string start)
{
    var dist = vertices.ToDictionary(v => v, v => double.PositiveInfinity);
    dist[start] = 0;
    for (int i = 0; i < vertices.Count - 1; i++)
    {
        foreach (var (u, v, w) in edges)
        {
            if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
        }
    }
    foreach (var (u, v, w) in edges)
    {
        if (dist[u] + w < dist[v]) return null; // 負閉路を検出
    }
    return dist;
}
```
