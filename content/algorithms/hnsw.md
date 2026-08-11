---
name: HNSW(階層的近傍探索グラフ)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(log n)(1回の検索、平均)、O(n log n)(構築全体)
summary: ベクトル同士を「近い者同士つなぐ」グラフを、遠距離用の疎な上層から近距離用の密な下層まで複数のレイヤーとして積み重ね、高速道路から一般道へ降りるように上層から絞り込みながら検索することで、対数時間に近い近似最近傍検索を実現する。
---

## 概要

[直積量子化](/algorithms/product-quantization)がベクトルをコードへ圧縮して距離計算そのものを近似するのに対し、HNSW(Hierarchical Navigable Small World)は発想の異なるアプローチを取る——ベクトルの集合を、**近いベクトル同士をエッジでつないだグラフ**として表現し、そのグラフをたどることでクエリに近いベクトルを高速に見つけ出す。2016年にユーリ・マルコフとドミトリー・イャシュニンが提案したこのグラフは、"Navigable Small World"(少ないホップ数でどこへでもたどり着けるスモールワールド性を持つグラフ)を、**遠距離の移動に適した疎な上層から、近距離の精密な探索に適した密な下層まで、複数階層に積み重ねた**構造を持つ。高速道路網で長距離を移動してから一般道で目的地に近づくのと同じ発想で、対数時間に近い計算量で高精度な近似最近傍検索を実現し、現在最も広く使われる近似最近傍検索アルゴリズムの一つになっている。

## 仕組み

1. **多層グラフの構築**: 各ベクトル(ノード)を、確率的に決まる最大階層`l`(指数分布に従って大半のノードは低い階層、ごく少数が高い階層に割り当てられる)まで、下から順にグラフへ挿入していく
2. 各階層で、挿入するノードから**近い既存ノードをいくつか探し、それらとエッジで接続する**(この探索自体も、既に構築済みの1つ上の階層から降りてくる形で行われる)。1ノードあたりの接続数(次数)には上限を設け、密になりすぎないよう管理する
3. 結果として、**最上層は少数のノードだけがまばらに長距離のエッジで接続され、下層に行くほどノード数が増えて密な近距離のエッジで接続される**という階層構造ができあがる
4. **検索**: クエリベクトルが与えられたら、最上層のエントリポイント(あらかじめ決めた1つのノード)から探索を始める。各階層で、現在地点の近傍ノードを見て、クエリにより近いノードがあればそちらへ移動する「貪欲探索」を、それ以上近づけなくなるまで繰り返す
5. その階層で探索が収束したら、見つかったノードを次の(1つ下の)階層でのエントリポイントとして使い、同様の貪欲探索を繰り返す。最下層(全ノードを含む階層)まで降りたら、その時点で見つかった近傍ノード群がクエリへの近似的な最近傍として返される

## 特性・トレードオフ

- **対数時間に近い検索速度と高い精度の両立**: グラフのスモールワールド性(少ないホップ数で任意のノードに到達できる)と階層構造による粗密な絞り込みの組み合わせにより、[MinHash/LSH](/algorithms/minhash-lsh)のようなハッシュベースの手法と比べても高い再現率(本当に近いベクトルを取りこぼしにくい)を、対数時間に近い速さで実現できることが実験的に広く確認されている
- **メモリ使用量とのトレードオフ**: グラフ構造(各ノードが持つエッジのリスト)を保持する必要があるため、[直積量子化](/algorithms/product-quantization)のような圧縮ベースの手法と比べるとメモリ効率では劣る。実務では、HNSWのグラフ構造とPQによるベクトル圧縮を組み合わせて、検索速度とメモリ効率の両方を狙うハイブリッドな実装(FAISSのIVF-PQ+HNSWなど)もよく使われる
- **構築コストと更新の扱いにくさ**: グラフの構築には各ノード挿入時に近傍探索が必要なため、静的なデータセット全体を一括構築するのは効率的だが、ベクトルの追加・削除が頻繁に発生する動的な用途では、グラフ構造の再編成コストが課題になることがある
- **使いどころ**: 大規模ベクトル検索エンジン(画像検索、類似文書検索)、検索拡張生成(RAG)における埋め込みベクトルの近傍検索、レコメンドシステムの類似アイテム検索、Milvus・Qdrant・Elasticsearchのベクトル検索機能など主要なベクトルデータベースの標準的なインデックス方式

## 実装例

簡略化した単層版(グラフの近傍接続と貪欲探索の核心部分)を示す。実際のHNSWは複数階層を持つが、ここでは1階層での挿入・検索ロジックに絞って実装する。

```python
import math
import random

class HnswLayer:
    def __init__(self, m: int = 5):
        self.m = m  # 各ノードが持つ最大エッジ数
        self.vectors: dict[int, list[float]] = {}
        self.edges: dict[int, set[int]] = {}

    def distance(self, a: list[float], b: list[float]) -> float:
        return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

    def insert(self, node_id: int, vector: list[float], entry_point: int | None) -> None:
        self.vectors[node_id] = vector
        self.edges[node_id] = set()
        if entry_point is None:
            return

        candidates = self.greedy_search(vector, entry_point, ef=self.m)
        for neighbor_id in candidates[: self.m]:
            self.edges[node_id].add(neighbor_id)
            self.edges[neighbor_id].add(node_id)

    def greedy_search(self, query: list[float], entry_point: int, ef: int = 5) -> list[int]:
        visited = {entry_point}
        candidates = [entry_point]
        best = sorted(candidates, key=lambda n: self.distance(query, self.vectors[n]))

        improved = True
        while improved:
            improved = False
            for node in list(best[:ef]):
                for neighbor in self.edges[node]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        best.append(neighbor)
                        improved = True
            best = sorted(set(best), key=lambda n: self.distance(query, self.vectors[n]))

        return best[:ef]
```

```typescript
type Vec = number[];

class HnswLayer {
  vectors = new Map<number, Vec>();
  edges = new Map<number, Set<number>>();
  constructor(private m = 5) {}

  private distance(a: Vec, b: Vec): number {
    return Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
  }

  insert(nodeId: number, vector: Vec, entryPoint: number | null): void {
    this.vectors.set(nodeId, vector);
    this.edges.set(nodeId, new Set());
    if (entryPoint === null) return;

    const candidates = this.greedySearch(vector, entryPoint, this.m);
    for (const neighborId of candidates.slice(0, this.m)) {
      this.edges.get(nodeId)!.add(neighborId);
      this.edges.get(neighborId)!.add(nodeId);
    }
  }

  greedySearch(query: Vec, entryPoint: number, ef = 5): number[] {
    const visited = new Set<number>([entryPoint]);
    let best = [entryPoint];

    let improved = true;
    while (improved) {
      improved = false;
      for (const node of best.slice(0, ef)) {
        for (const neighbor of this.edges.get(node) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            best.push(neighbor);
            improved = true;
          }
        }
      }
      best = [...new Set(best)].sort(
        (a, b) => this.distance(query, this.vectors.get(a)!) - this.distance(query, this.vectors.get(b)!),
      );
    }

    return best.slice(0, ef);
  }
}
```

```cpp
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <cmath>
#include <algorithm>

class HnswLayer {
    int m;
    std::unordered_map<int, std::vector<double>> vectors;
    std::unordered_map<int, std::unordered_set<int>> edges;

    double distance(const std::vector<double>& a, const std::vector<double>& b) {
        double sum = 0.0;
        for (size_t i = 0; i < a.size(); i++) sum += (a[i] - b[i]) * (a[i] - b[i]);
        return std::sqrt(sum);
    }

public:
    explicit HnswLayer(int m_ = 5) : m(m_) {}

    std::vector<int> greedySearch(const std::vector<double>& query, int entryPoint, int ef = 5) {
        std::unordered_set<int> visited = {entryPoint};
        std::vector<int> best = {entryPoint};

        bool improved = true;
        while (improved) {
            improved = false;
            std::vector<int> frontier(best.begin(), best.begin() + std::min<size_t>(ef, best.size()));
            for (int node : frontier) {
                for (int neighbor : edges[node]) {
                    if (!visited.count(neighbor)) {
                        visited.insert(neighbor);
                        best.push_back(neighbor);
                        improved = true;
                    }
                }
            }
            std::sort(best.begin(), best.end(), [&](int a, int b) {
                return distance(query, vectors[a]) < distance(query, vectors[b]);
            });
        }
        if (static_cast<int>(best.size()) > ef) best.resize(ef);
        return best;
    }

    void insert(int nodeId, const std::vector<double>& vector, int entryPoint, bool hasEntry) {
        vectors[nodeId] = vector;
        edges[nodeId] = {};
        if (!hasEntry) return;

        auto candidates = greedySearch(vector, entryPoint, m);
        for (int neighborId : candidates) {
            edges[nodeId].insert(neighborId);
            edges[neighborId].insert(nodeId);
        }
    }
};
```

```rust
use std::collections::{HashMap, HashSet};

struct HnswLayer {
    m: usize,
    vectors: HashMap<i32, Vec<f64>>,
    edges: HashMap<i32, HashSet<i32>>,
}

impl HnswLayer {
    fn distance(&self, a: &[f64], b: &[f64]) -> f64 {
        a.iter().zip(b.iter()).map(|(x, y)| (x - y).powi(2)).sum::<f64>().sqrt()
    }

    fn greedy_search(&self, query: &[f64], entry_point: i32, ef: usize) -> Vec<i32> {
        let mut visited: HashSet<i32> = [entry_point].into_iter().collect();
        let mut best = vec![entry_point];

        let mut improved = true;
        while improved {
            improved = false;
            let frontier: Vec<i32> = best.iter().take(ef).cloned().collect();
            for node in frontier {
                if let Some(neighbors) = self.edges.get(&node) {
                    for &neighbor in neighbors {
                        if !visited.contains(&neighbor) {
                            visited.insert(neighbor);
                            best.push(neighbor);
                            improved = true;
                        }
                    }
                }
            }
            best.sort_by(|&a, &b| {
                self.distance(query, &self.vectors[&a])
                    .partial_cmp(&self.distance(query, &self.vectors[&b]))
                    .unwrap()
            });
            best.dedup();
        }
        best.truncate(ef);
        best
    }

    fn insert(&mut self, node_id: i32, vector: Vec<f64>, entry_point: Option<i32>) {
        self.vectors.insert(node_id, vector.clone());
        self.edges.insert(node_id, HashSet::new());
        let Some(entry) = entry_point else { return };

        let candidates = self.greedy_search(&vector, entry, self.m);
        for neighbor_id in candidates {
            self.edges.get_mut(&node_id).unwrap().insert(neighbor_id);
            self.edges.get_mut(&neighbor_id).unwrap().insert(node_id);
        }
    }
}
```

```csharp
class HnswLayer
{
    int m;
    Dictionary<int, double[]> vectors = new();
    Dictionary<int, HashSet<int>> edges = new();

    public HnswLayer(int m = 5) { this.m = m; }

    double Distance(double[] a, double[] b) => Math.Sqrt(a.Select((x, i) => Math.Pow(x - b[i], 2)).Sum());

    public List<int> GreedySearch(double[] query, int entryPoint, int ef = 5)
    {
        var visited = new HashSet<int> { entryPoint };
        var best = new List<int> { entryPoint };

        bool improved = true;
        while (improved)
        {
            improved = false;
            foreach (var node in best.Take(ef).ToList())
            {
                foreach (var neighbor in edges[node])
                {
                    if (!visited.Contains(neighbor))
                    {
                        visited.Add(neighbor);
                        best.Add(neighbor);
                        improved = true;
                    }
                }
            }
            best = best.Distinct().OrderBy(n => Distance(query, vectors[n])).ToList();
        }

        return best.Take(ef).ToList();
    }

    public void Insert(int nodeId, double[] vector, int? entryPoint)
    {
        vectors[nodeId] = vector;
        edges[nodeId] = new HashSet<int>();
        if (entryPoint == null) return;

        var candidates = GreedySearch(vector, entryPoint.Value, m);
        foreach (var neighborId in candidates)
        {
            edges[nodeId].Add(neighborId);
            edges[neighborId].Add(nodeId);
        }
    }
}
```
