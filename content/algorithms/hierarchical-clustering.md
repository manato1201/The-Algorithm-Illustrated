---
name: 階層的クラスタリング(凝集型)
category: 機械学習
subcategory: 教師なし学習
complexity: O(n³)(素朴な実装)、O(n² log n)(優先度付きキューを使う改良版)
summary: 各データ点を1つのクラスタとして出発し、最も近い2つのクラスタを繰り返し併合していくことで、クラスタ数kを事前に指定する必要のない、あらゆる粒度のクラスタリング結果を樹形図(デンドログラム)として一度に得られる手法。
---

## 概要

[k-means法](/algorithms/k-means)は「クラスタ数k」をあらかじめ指定する必要があり、適切なkが分からない場合には試行錯誤が必要になる。階層的クラスタリング(凝集型、Agglomerative Hierarchical Clustering)は全く異なるアプローチを取る——最初は各データ点をそれぞれ独立した1つのクラスタとみなし、「最も近い(似ている)2つのクラスタ」を1つに併合する、という操作をクラスタが1つになるまで繰り返す。この過程を記録した樹形図(デンドログラム)は、どの高さで切るかによって任意の粒度のクラスタリング結果を後から自由に取り出せる、k-meansにはない柔軟性を持つ。ちょうど[UPGMA法](/algorithms/upgma)が生物種の系統樹を構築する仕組みと全く同じ発想を、一般的なデータクラスタリングに応用したものである。

## 仕組み

1. `n`個のデータ点それぞれを、独立した1つのクラスタとして初期化する
2. 全クラスタ間の距離(非類似度)を計算する。単一のデータ点同士の距離はユークリッド距離などで直接計算できるが、複数の点を含むクラスタ同士の距離は「連結法(linkage)」によって定義が異なる: 最短距離法(2クラスタ内の最も近い点同士の距離)、最長距離法(最も遠い点同士の距離)、群平均法([UPGMA法](/algorithms/upgma)と同じ、全ペアの平均距離)、ウォード法(併合後のクラスタ内分散の増加が最小になるものを選ぶ)などがある
3. 距離が最小の2つのクラスタを1つに併合し、その併合をデンドログラム上の1つのノードとして記録する
4. 併合によってクラスタ数が1つ減るたびに、クラスタ間距離を再計算し、手順3を繰り返す
5. 最終的に全データ点が1つのクラスタに併合されるまで続け、全ての併合過程を記録した木構造(デンドログラム)を得る。後から任意の高さでデンドログラムを「切る」ことで、その高さに対応する粒度のクラスタ分割を取り出せる

## 特性・トレードオフ

- **計算量**: 素朴な実装では、各ステップで全クラスタペアの距離を再計算するため`O(n³)`(`n`ステップ×各ステップ`O(n²)`)。優先度付きキューで最小距離ペアを効率的に管理する改良版(SLINK法など)を使えば`O(n² log n)`まで改善できる
- **クラスタ数を事前に指定する必要がない柔軟性**: [k-means法](/algorithms/k-means)と最も対照的な利点——デンドログラムを一度構築してしまえば、その後で「クラスタ数を3にしたい」「クラスタ数を10にしたい」という異なる要求に、再計算なしで(木のどの高さで切るかを変えるだけで)応えられる
- **連結法の選び方が結果を大きく左右する**: 最短距離法は細長く伸びたクラスタを作りやすい(チェイン効果)、最長距離法はコンパクトな球状のクラスタを好む、ウォード法は分散に基づくためk-meansに近い結果になりやすい——どの連結法を選ぶかがドメイン知識を要する実務上の判断ポイントになる
- **使いどころ**: 生物学における種の分類・進化系統樹の構築([UPGMA法](/algorithms/upgma)・[近隣結合法](/algorithms/neighbor-joining)と同じ問題領域)、市場調査における顧客セグメンテーション(粒度をあとから調整したい場面)、遺伝子発現データのクラスタリング、[DBSCAN](/algorithms/dbscan)や[k-means法](/algorithms/k-means)と並ぶ教師なし学習の基本手法として、探索的データ分析の初期段階で頻繁に使われる

## 実装例

最短距離法(単連結法)による凝集型クラスタリング。各併合ステップを`(併合したクラスタA, 併合したクラスタB, 距離, 新クラスタID)`として記録し、この記録を後から辿ることでデンドログラムを任意の粒度で切り出せる。

```python
import math
from itertools import combinations


def euclidean(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def agglomerative_clustering(
    points: list[tuple[float, float]],
) -> list[tuple[int, int, float, int]]:
    clusters: dict[int, list[int]] = {i: [i] for i in range(len(points))}
    merges: list[tuple[int, int, float, int]] = []
    next_id = len(points)

    def cluster_distance(ca: list[int], cb: list[int]) -> float:
        return min(euclidean(points[i], points[j]) for i in ca for j in cb)  # 最短距離法

    while len(clusters) > 1:
        best_pair = None
        best_dist = float("inf")
        ids = list(clusters.keys())
        for a, b in combinations(ids, 2):
            d = cluster_distance(clusters[a], clusters[b])
            if d < best_dist:
                best_dist = d
                best_pair = (a, b)
        a, b = best_pair
        merged = clusters[a] + clusters[b]
        merges.append((a, b, best_dist, next_id))
        del clusters[a]
        del clusters[b]
        clusters[next_id] = merged
        next_id += 1
    return merges
```

```typescript
type Point = [number, number];

function euclidean(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function agglomerativeClustering(points: Point[]): [number, number, number, number][] {
  const clusters = new Map<number, number[]>();
  points.forEach((_, i) => clusters.set(i, [i]));
  const merges: [number, number, number, number][] = [];
  let nextId = points.length;

  const clusterDistance = (ca: number[], cb: number[]) => {
    let best = Infinity;
    for (const i of ca) for (const j of cb) best = Math.min(best, euclidean(points[i], points[j]));
    return best;
  };

  while (clusters.size > 1) {
    const ids = [...clusters.keys()];
    let bestPair: [number, number] | null = null;
    let bestDist = Infinity;
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const d = clusterDistance(clusters.get(ids[a])!, clusters.get(ids[b])!);
        if (d < bestDist) {
          bestDist = d;
          bestPair = [ids[a], ids[b]];
        }
      }
    }
    const [a, b] = bestPair!;
    const merged = [...clusters.get(a)!, ...clusters.get(b)!];
    merges.push([a, b, bestDist, nextId]);
    clusters.delete(a);
    clusters.delete(b);
    clusters.set(nextId, merged);
    nextId++;
  }
  return merges;
}
```

```cpp
#include <vector>
#include <map>
#include <cmath>
#include <limits>

using Point = std::pair<double, double>;

double euclidean(const Point& a, const Point& b) {
    return std::hypot(a.first - b.first, a.second - b.second);
}

struct Merge { int a, b, newId; double dist; };

std::vector<Merge> agglomerativeClustering(const std::vector<Point>& points) {
    std::map<int, std::vector<int>> clusters;
    for (int i = 0; i < static_cast<int>(points.size()); i++) clusters[i] = {i};
    std::vector<Merge> merges;
    int nextId = static_cast<int>(points.size());

    auto clusterDistance = [&](const std::vector<int>& ca, const std::vector<int>& cb) {
        double best = std::numeric_limits<double>::infinity();
        for (int i : ca) for (int j : cb) best = std::min(best, euclidean(points[i], points[j]));
        return best;
    };

    while (clusters.size() > 1) {
        double bestDist = std::numeric_limits<double>::infinity();
        int bestA = -1, bestB = -1;
        std::vector<int> ids;
        for (const auto& [id, _] : clusters) ids.push_back(id);
        for (size_t a = 0; a < ids.size(); a++) {
            for (size_t b = a + 1; b < ids.size(); b++) {
                double d = clusterDistance(clusters[ids[a]], clusters[ids[b]]);
                if (d < bestDist) { bestDist = d; bestA = ids[a]; bestB = ids[b]; }
            }
        }
        std::vector<int> merged = clusters[bestA];
        merged.insert(merged.end(), clusters[bestB].begin(), clusters[bestB].end());
        merges.push_back({bestA, bestB, nextId, bestDist});
        clusters.erase(bestA);
        clusters.erase(bestB);
        clusters[nextId] = merged;
        nextId++;
    }
    return merges;
}
```

```rust
struct Merge {
    a: usize,
    b: usize,
    dist: f64,
    new_id: usize,
}

fn euclidean(a: (f64, f64), b: (f64, f64)) -> f64 {
    ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt()
}

fn agglomerative_clustering(points: &[(f64, f64)]) -> Vec<Merge> {
    use std::collections::HashMap;
    let mut clusters: HashMap<usize, Vec<usize>> = (0..points.len()).map(|i| (i, vec![i])).collect();
    let mut merges = Vec::new();
    let mut next_id = points.len();

    let cluster_distance = |ca: &[usize], cb: &[usize]| -> f64 {
        ca.iter()
            .flat_map(|&i| cb.iter().map(move |&j| euclidean(points[i], points[j])))
            .fold(f64::INFINITY, f64::min)
    };

    while clusters.len() > 1 {
        let ids: Vec<usize> = clusters.keys().copied().collect();
        let mut best_dist = f64::INFINITY;
        let mut best_pair = (0usize, 0usize);
        for i in 0..ids.len() {
            for j in (i + 1)..ids.len() {
                let d = cluster_distance(&clusters[&ids[i]], &clusters[&ids[j]]);
                if d < best_dist {
                    best_dist = d;
                    best_pair = (ids[i], ids[j]);
                }
            }
        }
        let (a, b) = best_pair;
        let mut merged = clusters.remove(&a).unwrap();
        merged.extend(clusters.remove(&b).unwrap());
        merges.push(Merge { a, b, dist: best_dist, new_id: next_id });
        clusters.insert(next_id, merged);
        next_id += 1;
    }
    merges
}
```

```csharp
record Point(double X, double Y);

static double Euclidean(Point a, Point b) => Math.Sqrt(Math.Pow(a.X - b.X, 2) + Math.Pow(a.Y - b.Y, 2));

static List<(int a, int b, double dist, int newId)> AgglomerativeClustering(List<Point> points)
{
    var clusters = new Dictionary<int, List<int>>();
    for (int i = 0; i < points.Count; i++) clusters[i] = new List<int> { i };
    var merges = new List<(int, int, double, int)>();
    int nextId = points.Count;

    double ClusterDistance(List<int> ca, List<int> cb)
    {
        double best = double.PositiveInfinity;
        foreach (var i in ca) foreach (var j in cb) best = Math.Min(best, Euclidean(points[i], points[j]));
        return best;
    }

    while (clusters.Count > 1)
    {
        var ids = clusters.Keys.ToList();
        (int a, int b)? bestPair = null;
        double bestDist = double.PositiveInfinity;
        for (int a = 0; a < ids.Count; a++)
            for (int b = a + 1; b < ids.Count; b++)
            {
                double d = ClusterDistance(clusters[ids[a]], clusters[ids[b]]);
                if (d < bestDist) { bestDist = d; bestPair = (ids[a], ids[b]); }
            }
        var (pa, pb) = bestPair!.Value;
        var merged = clusters[pa].Concat(clusters[pb]).ToList();
        merges.Add((pa, pb, bestDist, nextId));
        clusters.Remove(pa);
        clusters.Remove(pb);
        clusters[nextId] = merged;
        nextId++;
    }
    return merges;
}
```
