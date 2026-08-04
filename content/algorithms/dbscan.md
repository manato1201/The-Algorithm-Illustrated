---
name: DBSCAN
category: 機械学習
subcategory: 教師なし学習
complexity: O(n log n)(空間索引使用時)、O(n²)(素朴な実装)
summary: クラスタ数を事前に指定する必要がなく、球状でない任意の形のクラスタを検出でき、かつノイズ点を自動的に識別できる、密度に基づくクラスタリング手法。「点の密集度」だけを頼りにクラスタの境界を見つける。
---

## 概要

[k-means法](/algorithms/k-means)は球状のクラスタを前提とし、クラスタ数kを事前に指定する必要があり、外れ値にも弱い。1996年にマルティン・エスター(Ester)らが発表したDBSCAN(Density-Based Spatial Clustering of Applications with Noise)は、これらの制約を全て取り払う——「点の周囲に十分な数の他の点が密集していれば、それらは同じクラスタに属する」という密度の考え方だけに基づいてクラスタを定義する。三日月形・渦巻き形のような複雑な形状のクラスタも正しく検出でき、かつどのクラスタにも属さない「ノイズ点」(外れ値)を自然に識別できるという、[k-means法](/algorithms/k-means)や[階層的クラスタリング](/algorithms/hierarchical-clustering)にはない独自の強みを持つ。

## 仕組み

1. 2つのパラメータを設定する: 近傍半径`ε`(この距離以内にある点を「近い」とみなす)と、最小点数`minPts`(コア点とみなすために必要な近傍点の最小数)
2. 各点`p`について、`p`から半径`ε`以内にある点の数を数える。その数が`minPts`以上であれば`p`を「コア点」とする
3. コア点`p`の`ε`近傍にある全ての点(コア点自身も含む)は、`p`と同じクラスタに属するとみなす。この「近傍を辿って併合する」操作を連鎖的に繰り返す——コア点`p`の近傍にある別のコア点`q`があれば、`q`の近傍もさらに同じクラスタに加える
4. コア点ではないが、あるコア点の`ε`近傍に含まれる点は「境界点」としてそのクラスタに含める
5. どのコア点の`ε`近傍にも含まれない点は「ノイズ点」として、どのクラスタにも属さないと判定する
6. 全点を訪問し終えると、密度で連結された領域ごとにクラスタが自動的に確定する(クラスタの個数を事前に指定する必要はない)

## 特性・トレードオフ

- **計算量**: 各点について`ε`近傍を求める操作が中心で、k-d木やR木のような空間索引構造(既に取り上げた[k-d木](/algorithms/kd-tree)や[R木](/algorithms/r-tree)と同じ技術)を使えば近傍探索が`O(log n)`になり全体で`O(n log n)`。索引を使わない素朴な実装では全点ペアの距離を計算するため`O(n²)`
- **クラスタ数を指定不要+任意形状+ノイズ検出という3つの利点**: [k-means法](/algorithms/k-means)が苦手とする3つの課題(クラスタ数の事前指定、非球状クラスタ、外れ値への敏感さ)をまとめて解決する点がDBSCANの最大の特徴——ただし`ε`と`minPts`という2つのパラメータの選び方に結果が大きく左右され、密度が場所によって大きく異なるデータには不向きという新たな課題も抱える
- **密度が一様でないデータへの弱さ**: 全域で同じ`ε`・`minPts`を使うため、密度の異なる複数のクラスタが混在するデータ(あるクラスタは密集していて、別のクラスタはまばらである場合)では、片方が正しく検出されない、あるいは1つのクラスタに誤って統合されてしまうことがある。この弱点を克服する発展形としてOPTICS法が知られている
- **使いどころ**: 地理空間データにおける密集地域の検出(GPS軌跡データからの立ち寄りスポット抽出)、異常検知(ノイズ点として自動的に外れ値を識別できる)、画像処理における領域分割、天文学における星団の検出など、クラスタの形状が事前に分からない・外れ値混入が想定される実務データでの第一選択肢

## 実装例

空間索引を使わない素朴な`O(n²)`実装。ラベルは`0`(未訪問)・`-1`(ノイズ)・`1`以上(クラスタID)で表す。

```python
def region_query(points: list[tuple[float, float]], idx: int, eps: float) -> list[int]:
    px, py = points[idx]
    neighbors = []
    for i, (x, y) in enumerate(points):
        if (x - px) ** 2 + (y - py) ** 2 <= eps * eps:
            neighbors.append(i)
    return neighbors


def dbscan(points: list[tuple[float, float]], eps: float, min_pts: int) -> list[int]:
    n = len(points)
    labels = [0] * n  # 0=未訪問, -1=ノイズ, >0=クラスタID
    cluster_id = 0
    for i in range(n):
        if labels[i] != 0:
            continue
        neighbors = region_query(points, i, eps)
        if len(neighbors) < min_pts:
            labels[i] = -1
            continue
        cluster_id += 1
        labels[i] = cluster_id
        seeds = [x for x in neighbors if x != i]
        j = 0
        while j < len(seeds):
            q = seeds[j]
            if labels[q] == -1:
                labels[q] = cluster_id
            if labels[q] == 0:
                labels[q] = cluster_id
                q_neighbors = region_query(points, q, eps)
                if len(q_neighbors) >= min_pts:
                    for nb in q_neighbors:
                        if nb not in seeds:
                            seeds.append(nb)
            j += 1
    return labels
```

```typescript
function regionQuery(points: [number, number][], idx: number, eps: number): number[] {
  const [px, py] = points[idx];
  const neighbors: number[] = [];
  points.forEach(([x, y], i) => {
    if ((x - px) ** 2 + (y - py) ** 2 <= eps * eps) neighbors.push(i);
  });
  return neighbors;
}

function dbscan(points: [number, number][], eps: number, minPts: number): number[] {
  const n = points.length;
  const labels = new Array(n).fill(0);
  let clusterId = 0;
  for (let i = 0; i < n; i++) {
    if (labels[i] !== 0) continue;
    const neighbors = regionQuery(points, i, eps);
    if (neighbors.length < minPts) { labels[i] = -1; continue; }
    clusterId += 1;
    labels[i] = clusterId;
    const seeds = neighbors.filter((x) => x !== i);
    let j = 0;
    while (j < seeds.length) {
      const q = seeds[j];
      if (labels[q] === -1) labels[q] = clusterId;
      if (labels[q] === 0) {
        labels[q] = clusterId;
        const qNeighbors = regionQuery(points, q, eps);
        if (qNeighbors.length >= minPts) {
          for (const nb of qNeighbors) if (!seeds.includes(nb)) seeds.push(nb);
        }
      }
      j += 1;
    }
  }
  return labels;
}
```

```cpp
#include <vector>
#include <utility>

std::vector<int> regionQuery(const std::vector<std::pair<double, double>>& points, int idx, double eps) {
    auto [px, py] = points[idx];
    std::vector<int> neighbors;
    for (int i = 0; i < static_cast<int>(points.size()); i++) {
        auto [x, y] = points[i];
        if ((x - px) * (x - px) + (y - py) * (y - py) <= eps * eps) neighbors.push_back(i);
    }
    return neighbors;
}

std::vector<int> dbscan(const std::vector<std::pair<double, double>>& points, double eps, int minPts) {
    int n = static_cast<int>(points.size());
    std::vector<int> labels(n, 0);  // 0=未訪問, -1=ノイズ, >0=クラスタID
    int clusterId = 0;
    for (int i = 0; i < n; i++) {
        if (labels[i] != 0) continue;
        auto neighbors = regionQuery(points, i, eps);
        if (static_cast<int>(neighbors.size()) < minPts) { labels[i] = -1; continue; }
        clusterId += 1;
        labels[i] = clusterId;
        std::vector<int> seeds;
        for (int x : neighbors) if (x != i) seeds.push_back(x);
        size_t j = 0;
        while (j < seeds.size()) {
            int q = seeds[j];
            if (labels[q] == -1) labels[q] = clusterId;
            if (labels[q] == 0) {
                labels[q] = clusterId;
                auto qNeighbors = regionQuery(points, q, eps);
                if (static_cast<int>(qNeighbors.size()) >= minPts) {
                    for (int nb : qNeighbors) {
                        bool found = false;
                        for (int s : seeds) if (s == nb) { found = true; break; }
                        if (!found) seeds.push_back(nb);
                    }
                }
            }
            j += 1;
        }
    }
    return labels;
}
```

```rust
fn region_query(points: &[(f64, f64)], idx: usize, eps: f64) -> Vec<usize> {
    let (px, py) = points[idx];
    points
        .iter()
        .enumerate()
        .filter(|(_, &(x, y))| (x - px).powi(2) + (y - py).powi(2) <= eps * eps)
        .map(|(i, _)| i)
        .collect()
}

fn dbscan(points: &[(f64, f64)], eps: f64, min_pts: usize) -> Vec<i32> {
    let n = points.len();
    let mut labels = vec![0i32; n]; // 0=未訪問, -1=ノイズ, >0=クラスタID
    let mut cluster_id = 0i32;

    for i in 0..n {
        if labels[i] != 0 {
            continue;
        }
        let neighbors = region_query(points, i, eps);
        if neighbors.len() < min_pts {
            labels[i] = -1;
            continue;
        }
        cluster_id += 1;
        labels[i] = cluster_id;
        let mut seeds: Vec<usize> = neighbors.into_iter().filter(|&x| x != i).collect();
        let mut j = 0;
        while j < seeds.len() {
            let q = seeds[j];
            if labels[q] == -1 {
                labels[q] = cluster_id;
            }
            if labels[q] == 0 {
                labels[q] = cluster_id;
                let q_neighbors = region_query(points, q, eps);
                if q_neighbors.len() >= min_pts {
                    for nb in q_neighbors {
                        if !seeds.contains(&nb) {
                            seeds.push(nb);
                        }
                    }
                }
            }
            j += 1;
        }
    }
    labels
}
```

```csharp
static class Dbscan
{
    private static List<int> RegionQuery(List<(double, double)> points, int idx, double eps)
    {
        var (px, py) = points[idx];
        var neighbors = new List<int>();
        for (int i = 0; i < points.Count; i++)
        {
            var (x, y) = points[i];
            if ((x - px) * (x - px) + (y - py) * (y - py) <= eps * eps) neighbors.Add(i);
        }
        return neighbors;
    }

    public static int[] Run(List<(double, double)> points, double eps, int minPts)
    {
        int n = points.Count;
        var labels = new int[n];  // 0=未訪問, -1=ノイズ, >0=クラスタID
        int clusterId = 0;
        for (int i = 0; i < n; i++)
        {
            if (labels[i] != 0) continue;
            var neighbors = RegionQuery(points, i, eps);
            if (neighbors.Count < minPts) { labels[i] = -1; continue; }
            clusterId += 1;
            labels[i] = clusterId;
            var seeds = neighbors.Where(x => x != i).ToList();
            int j = 0;
            while (j < seeds.Count)
            {
                int q = seeds[j];
                if (labels[q] == -1) labels[q] = clusterId;
                if (labels[q] == 0)
                {
                    labels[q] = clusterId;
                    var qNeighbors = RegionQuery(points, q, eps);
                    if (qNeighbors.Count >= minPts)
                    {
                        foreach (var nb in qNeighbors) if (!seeds.Contains(nb)) seeds.Add(nb);
                    }
                }
                j += 1;
            }
        }
        return labels;
    }
}
```
