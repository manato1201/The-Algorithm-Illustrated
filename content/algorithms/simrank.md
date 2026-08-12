---
name: SimRank(構造的類似度)
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(反復回数 × n²・d²)(nはノード数、dは平均次数、素朴な実装の場合)
summary: 「似ているノード同士から指されているノードは似ている」という再帰的な定義を、[PageRank](/algorithms/pagerank)の反復更新と同じ発想で不動点まで計算することで、直接つながっていない2つのノードの構造的な類似度を数値化する。
---

## 概要

[PageRank](/algorithms/pagerank)や[HITS](/algorithms/hits)は「あるノードがどれだけ重要か」という**単一ノードのスコア**を計算するが、SimRankは視点を変え、**「2つのノードがどれだけ構造的に似ているか」というペアの類似度**を計算する。2002年にグレン・ジェーとジェニファー・ウィドムが提案したこの手法は、「2つのオブジェクトは、それらを指しているオブジェクト同士が似ているほど似ている」という直感を、再帰的な数式でそのまま定式化する——論文の引用関係で例えるなら、「2つの論文Aと論文Bが似ているのは、Aを引用している論文群とBを引用している論文群が、それぞれ互いに似た論文同士だから」という考え方である。この再帰的な定義を、行き止まりのない循環参照を含めて不動点まで解くことで、直接のリンクがなくても構造的な位置づけが似ている2つのノードを発見できる。

## 仕組み

1. 全てのノードペア`(a, b)`について、類似度`sim(a, b)`を初期化する(`a = b`なら1、それ以外は0など)
2. **SimRankの再帰的な定義式**を使って、類似度を更新する:
   `sim(a, b) = C / (|In(a)|・|In(b)|) × Σ_{i∈In(a)} Σ_{j∈In(b)} sim(i, j)`(`a ≠ b`の場合)
   ここで`In(a)`は`a`を指しているノード(入次数の隣接ノード)の集合、`C`は0〜1の減衰係数(`In(a)`や`In(b)`が空の場合は`sim(a,b)=0`とする)
3. この式は、「`a`を指している全てのノードと、`b`を指している全てのノードの、全ての組み合わせについて類似度の平均を取る」ことを意味する——`a`と`b`を指しているノード同士が(再帰的に)似ているほど、`a`と`b`自身の類似度も高くなる
4. この更新を全ノードペアについて同時に(前の反復の値を使って)行い、これを繰り返す。[PageRank](/algorithms/pagerank)がスコアベクトルの不動点を反復計算で求めるのと同じ発想で、類似度行列全体が収束するまで反復を続ける
5. 収束した`sim(a, b)`の値が、ノード`a`と`b`の構造的類似度を表す最終的なスコアとなる

## 特性・トレードオフ

- **直接のリンクがなくても類似性を発見できる**: SimRankは`a`と`b`の間に直接のエッジがなくても、両者を指しているノード群の構造が似ていれば高い類似度を与える。これは単純な共通近傍の数を数えるような手法(Jaccard係数など)よりも、間接的で多段階の構造的な類似性を捉えられるという利点がある
- **計算コストの高さ**: 素朴な実装では、全ノードペアについて、それぞれの入次数の組み合わせを毎回計算する必要があり、密なグラフでは計算量が急激に増大する。実務では、類似度がほぼゼロになる遠いノードペアの計算を早期に打ち切る、サンプリングベースの近似計算(モンテカルロ法によるランダムウォークのペア一致確率としてSimRankを推定する)といった高速化が使われる
- **[PageRank](/algorithms/pagerank)・[HITS](/algorithms/hits)との位置づけの違い**: PageRankやHITSが「単一ノードの重要度」という1次元のスコアを出すのに対し、SimRankは「ノードペア間の類似度」というより高次元の情報を提供する。用途としては、PageRankが「検索結果のランキング」に使われるのに対し、SimRankは「似ているアイテムを探す(協調フィルタリング、関連商品推薦)」ような場面で使われる、補完的な関係にある
- **使いどころ**: 引用ネットワークにおける類似論文・関連研究の発見、レコメンドシステムにおける「このアイテムを見た人はこんなアイテムも」の関連度計算、ソーシャルネットワーク分析における構造的に似た役割を持つユーザーの発見、Webページ間の意味的な関連性の推定(検索エンジンの関連ページ表示機能の理論的基盤)

## 実装例

```python
def simrank(
    nodes: list[int], in_edges: dict[int, list[int]], c: float = 0.8, iterations: int = 10,
) -> dict[tuple[int, int], float]:
    sim = {(a, b): (1.0 if a == b else 0.0) for a in nodes for b in nodes}

    for _ in range(iterations):
        new_sim = dict(sim)
        for a in nodes:
            for b in nodes:
                if a == b:
                    continue
                in_a, in_b = in_edges.get(a, []), in_edges.get(b, [])
                if not in_a or not in_b:
                    new_sim[(a, b)] = 0.0
                    continue
                total = sum(sim[(i, j)] for i in in_a for j in in_b)
                new_sim[(a, b)] = (c / (len(in_a) * len(in_b))) * total
        sim = new_sim

    return sim
```

```typescript
function simrank(
  nodes: number[],
  inEdges: Map<number, number[]>,
  c = 0.8,
  iterations = 10,
): Map<string, number> {
  const key = (a: number, b: number) => `${a},${b}`;
  let sim = new Map<string, number>();
  for (const a of nodes)
    for (const b of nodes) sim.set(key(a, b), a === b ? 1.0 : 0.0);

  for (let iter = 0; iter < iterations; iter++) {
    const newSim = new Map(sim);
    for (const a of nodes) {
      for (const b of nodes) {
        if (a === b) continue;
        const inA = inEdges.get(a) ?? [];
        const inB = inEdges.get(b) ?? [];
        if (inA.length === 0 || inB.length === 0) {
          newSim.set(key(a, b), 0.0);
          continue;
        }
        let total = 0;
        for (const i of inA)
          for (const j of inB) total += sim.get(key(i, j)) ?? 0;
        newSim.set(key(a, b), (c / (inA.length * inB.length)) * total);
      }
    }
    sim = newSim;
  }

  return sim;
}
```

```cpp
#include <vector>
#include <map>
#include <unordered_map>

std::map<std::pair<int, int>, double> simrank(
    const std::vector<int>& nodes, const std::unordered_map<int, std::vector<int>>& inEdges,
    double c = 0.8, int iterations = 10) {
    std::map<std::pair<int, int>, double> sim;
    for (int a : nodes) for (int b : nodes) sim[{a, b}] = (a == b) ? 1.0 : 0.0;

    for (int iter = 0; iter < iterations; iter++) {
        auto newSim = sim;
        for (int a : nodes) {
            for (int b : nodes) {
                if (a == b) continue;
                auto itA = inEdges.find(a), itB = inEdges.find(b);
                if (itA == inEdges.end() || itB == inEdges.end() || itA->second.empty() || itB->second.empty()) {
                    newSim[{a, b}] = 0.0;
                    continue;
                }
                double total = 0.0;
                for (int i : itA->second) for (int j : itB->second) total += sim[{i, j}];
                newSim[{a, b}] = (c / (itA->second.size() * itB->second.size())) * total;
            }
        }
        sim = newSim;
    }

    return sim;
}
```

```rust
use std::collections::HashMap;

fn simrank(
    nodes: &[i32], in_edges: &HashMap<i32, Vec<i32>>, c: f64, iterations: usize,
) -> HashMap<(i32, i32), f64> {
    let mut sim: HashMap<(i32, i32), f64> =
        nodes.iter().flat_map(|&a| nodes.iter().map(move |&b| ((a, b), if a == b { 1.0 } else { 0.0 }))).collect();

    for _ in 0..iterations {
        let mut new_sim = sim.clone();
        for &a in nodes {
            for &b in nodes {
                if a == b {
                    continue;
                }
                let empty = Vec::new();
                let in_a = in_edges.get(&a).unwrap_or(&empty);
                let in_b = in_edges.get(&b).unwrap_or(&empty);
                if in_a.is_empty() || in_b.is_empty() {
                    new_sim.insert((a, b), 0.0);
                    continue;
                }
                let mut total = 0.0;
                for &i in in_a {
                    for &j in in_b {
                        total += sim[&(i, j)];
                    }
                }
                new_sim.insert((a, b), (c / (in_a.len() * in_b.len()) as f64) * total);
            }
        }
        sim = new_sim;
    }

    sim
}
```

```csharp
static Dictionary<(int, int), double> SimRank(
    List<int> nodes, Dictionary<int, List<int>> inEdges, double c = 0.8, int iterations = 10)
{
    var sim = new Dictionary<(int, int), double>();
    foreach (int a in nodes) foreach (int b in nodes) sim[(a, b)] = a == b ? 1.0 : 0.0;

    for (int iter = 0; iter < iterations; iter++)
    {
        var newSim = new Dictionary<(int, int), double>(sim);
        foreach (int a in nodes)
        {
            foreach (int b in nodes)
            {
                if (a == b) continue;
                var inA = inEdges.GetValueOrDefault(a, new List<int>());
                var inB = inEdges.GetValueOrDefault(b, new List<int>());
                if (inA.Count == 0 || inB.Count == 0)
                {
                    newSim[(a, b)] = 0.0;
                    continue;
                }
                double total = 0;
                foreach (int i in inA) foreach (int j in inB) total += sim[(i, j)];
                newSim[(a, b)] = (c / (inA.Count * inB.Count)) * total;
            }
        }
        sim = newSim;
    }

    return sim;
}
```
