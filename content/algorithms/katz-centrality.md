---
name: Katz中心性(減衰係数付き経路カウント)
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(反復回数 × (V+E))(Vは頂点数、Eは辺数)
summary: あるノードの重要度を「そのノードへ至る、あらゆる長さの経路の本数」の重み付き総和として定義し、経路が長くなるほど影響を指数的に減衰させることで、[PageRank](/algorithms/pagerank)以前から使われてきた古典的なネットワーク中心性指標を計算する。
---

## 概要

[PageRank](/algorithms/pagerank)は「ランダムサーファーがそのページに訪れる確率」という確率的な解釈でノードの重要度を定義したが、Katz中心性は1953年にレオ・カッツが提案した、より古典的で直接的な発想に立つ——**あるノードへ至る経路の本数**を、その重要度の指標とする。ただし単純に経路の総数を数えると、長い経路も短い経路も同じ重みで扱われ、次数が高いノードの周辺で経路数が爆発的に増えてしまう。Katz中心性は、経路の長さが`k`のとき、その経路の寄与を減衰係数`α^k`(`0 < α < 1`)で指数的に割り引くことで、**近くのノードからの影響を強く、遠くのノードからの影響を弱く**反映する、直感的で解釈しやすい中心性指標を作り出す。

## 仕組み

1. 隣接行列`A`(`A_ij = 1`なら`i`から`j`への辺がある)と、減衰係数`α`(グラフの最大固有値の逆数より小さい値に設定する必要がある、収束条件)を用意する
2. Katz中心性ベクトル`x`は、次の連立方程式(不動点方程式)の解として定義される:
   `x = α・A^T・x + β・1`(`β`は各ノードに一律に与える基本スコア、`1`は全成分が1のベクトル)
   これは「ノード`j`の中心性は、`j`を指しているノード`i`それぞれの中心性を`α`倍して足し合わせたものに、基本スコア`β`を加えたもの」という再帰的な定義を表している
3. この方程式は、`x = β・(I - α・A^T)^(-1)・1`という形で行列の逆行列を使って解析的に解けるが、大規模なグラフでは逆行列の計算が高コストになるため、実務では[PageRank](/algorithms/pagerank)と同様に**反復法**で近似的に解く:`x ← α・A^T・x + β・1`という更新を、`x`が収束するまで繰り返す
4. `α`の値は、隣接行列`A`の最大固有値`λ_max`の逆数より小さい値(`α < 1/λ_max`)に設定する必要がある。この条件を満たさないと、経路の長さが増えるにつれて寄与が減衰するどころか発散してしまう
5. 収束した`x`の各成分が、対応するノードのKatz中心性スコアとなる

## 特性・トレードオフ

- **経路本数という直感的な定義**: [PageRank](/algorithms/pagerank)の「ランダムウォークでの訪問確率」という確率的な解釈に対し、Katz中心性は「あらゆる長さの経路の重み付き本数」というより直接的で解釈しやすい定義を持つ。単純な次数中心性(直接の接続数だけを数える)を、間接的なつながりまで拡張した自然な一般化とみなせる
- **[PageRank](/algorithms/pagerank)との数学的な関係**: 両者はともに隣接行列の固有ベクトルに関連する中心性指標であり、数式の構造もよく似ている(PageRankは各ノードの出次数で正規化する点、ダンピングファクターの扱いなどが異なる)。有向グラフのリンク構造解析において、目的に応じてどちらを使うかが選ばれる
- **減衰係数`α`の選択が結果を左右する**: `α`が最大固有値の逆数に近いほど、遠くのノードからの影響がより強く反映されるようになり、逆に`α`が0に近いほど、直接の隣接関係(次数中心性に近い指標)がより重視される。適切な`α`の選択には、グラフの構造(最大固有値)を事前に把握しておく必要がある
- **使いどころ**: ソーシャルネットワーク分析における影響力の測定、学術論文の引用ネットワークにおける間接的な影響力の評価、[PageRank](/algorithms/pagerank)や[HITS](/algorithms/hits)と並ぶ、ネットワーク科学における基本的な中心性指標としての比較・ベンチマーク、有向グラフにおける「間接的な支持」を考慮したランキング

## 実装例

```python
def katz_centrality(
    nodes: list[int], in_edges: dict[int, list[int]], alpha: float = 0.1, beta: float = 1.0, iterations: int = 100,
) -> dict[int, float]:
    x = {n: beta for n in nodes}

    for _ in range(iterations):
        new_x = {}
        for n in nodes:
            incoming_sum = sum(x[i] for i in in_edges.get(n, []))
            new_x[n] = alpha * incoming_sum + beta
        x = new_x

    return x
```

```typescript
function katzCentrality(
  nodes: number[],
  inEdges: Map<number, number[]>,
  alpha = 0.1,
  beta = 1.0,
  iterations = 100,
): Map<number, number> {
  let x = new Map(nodes.map((n) => [n, beta]));

  for (let iter = 0; iter < iterations; iter++) {
    const newX = new Map<number, number>();
    for (const n of nodes) {
      const incomingSum = (inEdges.get(n) ?? []).reduce(
        (sum, i) => sum + (x.get(i) ?? 0),
        0,
      );
      newX.set(n, alpha * incomingSum + beta);
    }
    x = newX;
  }

  return x;
}
```

```cpp
#include <vector>
#include <unordered_map>

std::unordered_map<int, double> katzCentrality(
    const std::vector<int>& nodes, const std::unordered_map<int, std::vector<int>>& inEdges,
    double alpha = 0.1, double beta = 1.0, int iterations = 100) {
    std::unordered_map<int, double> x;
    for (int n : nodes) x[n] = beta;

    for (int iter = 0; iter < iterations; iter++) {
        std::unordered_map<int, double> newX;
        for (int n : nodes) {
            double incomingSum = 0.0;
            auto it = inEdges.find(n);
            if (it != inEdges.end()) {
                for (int i : it->second) incomingSum += x[i];
            }
            newX[n] = alpha * incomingSum + beta;
        }
        x = newX;
    }

    return x;
}
```

```rust
use std::collections::HashMap;

fn katz_centrality(
    nodes: &[i32], in_edges: &HashMap<i32, Vec<i32>>, alpha: f64, beta: f64, iterations: usize,
) -> HashMap<i32, f64> {
    let mut x: HashMap<i32, f64> = nodes.iter().map(|&n| (n, beta)).collect();

    for _ in 0..iterations {
        let mut new_x = HashMap::new();
        for &n in nodes {
            let incoming_sum: f64 = in_edges.get(&n).map_or(0.0, |ins| ins.iter().map(|i| x[i]).sum());
            new_x.insert(n, alpha * incoming_sum + beta);
        }
        x = new_x;
    }

    x
}
```

```csharp
static Dictionary<int, double> KatzCentrality(
    List<int> nodes, Dictionary<int, List<int>> inEdges, double alpha = 0.1, double beta = 1.0, int iterations = 100)
{
    var x = nodes.ToDictionary(n => n, n => beta);

    for (int iter = 0; iter < iterations; iter++)
    {
        var newX = new Dictionary<int, double>();
        foreach (int n in nodes)
        {
            double incomingSum = inEdges.GetValueOrDefault(n, new List<int>()).Sum(i => x[i]);
            newX[n] = alpha * incomingSum + beta;
        }
        x = newX;
    }

    return x;
}
```
