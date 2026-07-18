---
name: k近傍法(k-NN)
category: 機械学習
subcategory: 教師あり学習
complexity: O(nd)(クエリごと)
summary: 学習フェーズを持たず、予測時に最も近いk個のデータの多数決/平均で判断する怠惰学習の代表格。
---

## 概要

「類は友を呼ぶ」という発想をそのままアルゴリズムにした、機械学習の中でも最も直感的な手法のひとつ。新しいデータを分類したいとき、**訓練データの中から最も近いk個の点を探し、それらの多数決(分類の場合)や平均(回帰の場合)で答えを決める**。多くの機械学習手法が「訓練データからモデルのパラメータを事前に学習する」のに対し、k近傍法は事前学習を一切行わず、予測のたびに訓練データそのものを参照する「怠惰学習(Lazy Learning)」の代表格。

## 仕組み

1. 訓練データ(特徴量とラベルの組)をそのまま記憶しておく(学習フェーズと呼べるほどの処理はない)
2. 新しいデータが与えられたら、訓練データの全ての点との距離(ユークリッド距離など)を計算する
3. 距離が近い順にk個の点を選ぶ
4. **分類問題**: 選ばれたk個の点の中で、最も多いラベルを予測結果とする(多数決)
5. **回帰問題**: 選ばれたk個の点のラベル(数値)の平均を予測結果とする

「モデルを学習する」代わりに「訓練データそのものが判断基準になる」という点が、パラメトリックなモデル(線形回帰やニューラルネットワークのように、固定数のパラメータを学習する手法)とは根本的に異なる発想。

## 特性・トレードオフ

- **計算量**: 学習コストはほぼゼロだが、**予測のたびに全訓練データとの距離計算が必要**なため、予測1回あたりO(nd)(n=訓練データ数、d=次元数)かかる。訓練データが増えるほど予測が遅くなるのが最大の弱点(kd木などの空間分割構造で高速化することもある)
- **kの選び方が精度を左右する**: kが小さすぎるとノイズに敏感になり(過学習)、大きすぎると細かい構造を見逃す(未学習)。適切なkを交差検証などで探る必要がある
- **次元の呪い**: 次元数が高くなると、「近い」という概念自体が意味を持ちにくくなり(全ての点が互いに同じくらい離れて見える)、精度が悪化しやすい
- **使いどころ**: シンプルな分類・回帰タスクのベースライン手法、レコメンデーションシステム(似たユーザー・商品の発見)、異常検知(近傍が極端に少ない/遠い点を異常とみなす)、画像認識の初期の手法など

## 実装例(ラベル付き点群+クエリ点からk近傍の多数決でラベルを予測)

```python
import math
from collections import Counter
from typing import List, Tuple


def knn_predict(
    points: List[Tuple[float, float]],
    labels: List[str],
    query: Tuple[float, float],
    k: int,
) -> str:
    distances = [(math.dist(p, query), label) for p, label in zip(points, labels)]
    distances.sort(key=lambda x: x[0])
    nearest_labels = [label for _, label in distances[:k]]
    return Counter(nearest_labels).most_common(1)[0][0]
```

```typescript
function knnPredict(
  points: [number, number][],
  labels: string[],
  query: [number, number],
  k: number
): string {
  const distances = points.map((p, i) => {
    const dx = p[0] - query[0];
    const dy = p[1] - query[1];
    return { dist: Math.sqrt(dx * dx + dy * dy), label: labels[i] };
  });
  distances.sort((a, b) => a.dist - b.dist);
  const nearest = distances.slice(0, k).map((d) => d.label);

  const counts = new Map<string, number>();
  for (const label of nearest) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let best = nearest[0];
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}
```

```cpp
#include <vector>
#include <string>
#include <cmath>
#include <algorithm>
#include <unordered_map>
#include <utility>

std::string knnPredict(const std::vector<std::pair<double, double>>& points,
                        const std::vector<std::string>& labels,
                        std::pair<double, double> query, int k) {
    std::vector<std::pair<double, int>> distances;  // (距離, インデックス)
    for (size_t i = 0; i < points.size(); i++) {
        double dx = points[i].first - query.first;
        double dy = points[i].second - query.second;
        distances.push_back({std::sqrt(dx * dx + dy * dy), static_cast<int>(i)});
    }
    std::sort(distances.begin(), distances.end());

    std::unordered_map<std::string, int> counts;
    std::string best;
    int bestCount = 0;
    size_t limit = std::min(static_cast<size_t>(k), distances.size());
    for (size_t i = 0; i < limit; i++) {
        const std::string& label = labels[distances[i].second];
        int c = ++counts[label];
        if (c > bestCount) {
            bestCount = c;
            best = label;
        }
    }
    return best;
}
```

```rust
use std::collections::HashMap;

fn knn_predict(points: &[(f64, f64)], labels: &[String], query: (f64, f64), k: usize) -> String {
    let mut distances: Vec<(f64, &String)> = points
        .iter()
        .zip(labels.iter())
        .map(|(p, label)| {
            let dx = p.0 - query.0;
            let dy = p.1 - query.1;
            ((dx * dx + dy * dy).sqrt(), label)
        })
        .collect();
    distances.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());

    let mut counts: HashMap<&String, usize> = HashMap::new();
    for (_, label) in distances.iter().take(k) {
        *counts.entry(label).or_insert(0) += 1;
    }
    counts
        .into_iter()
        .max_by_key(|&(_, count)| count)
        .map(|(label, _)| label.clone())
        .unwrap_or_default()
}
```

```csharp
static string KnnPredict((double, double)[] points, string[] labels,
                          (double, double) query, int k)
{
    var distances = points.Zip(labels, (p, label) =>
    {
        double dx = p.Item1 - query.Item1;
        double dy = p.Item2 - query.Item2;
        return (dist: Math.Sqrt(dx * dx + dy * dy), label);
    }).OrderBy(d => d.dist).ToList();

    return distances
        .Take(k)
        .Select(d => d.label)
        .GroupBy(l => l)
        .OrderByDescending(g => g.Count())
        .First()
        .Key;
}
```
