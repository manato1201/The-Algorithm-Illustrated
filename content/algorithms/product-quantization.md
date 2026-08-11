---
name: 直積量子化(Product Quantization)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(n・m)(前処理、nはベクトル数、mはサブベクトル数)、O(m)(1回の近似距離計算)
summary: 高次元ベクトルを複数の低次元サブベクトルに分割し、それぞれを独立にクラスタリングして少数のコードで表現することで、元のベクトルを保存せずに近似距離計算だけで高速な類似検索を実現する圧縮技法。
---

## 概要

[MinHash/LSH](/algorithms/minhash-lsh)や[SimHash](/algorithms/simhash)が集合やテキストの近似的な類似検索を扱うのに対し、直積量子化(PQ)は**高次元の実数値ベクトル**(画像特徴量、単語埋め込み、深層学習の埋め込みベクトルなど)を対象とした近似最近傍検索の圧縮技法である。数百万〜数十億件のベクトルをそのまま保存して総当たりで距離計算するのはメモリ・計算量の両面で非現実的だが、直積量子化は**ベクトルを複数の低次元の断片(サブベクトル)に分割し、各断片ごとに独立にクラスタリングして「どのクラスタに属するか」という短いコードに置き換える**ことで、元のベクトルよりずっと少ないメモリでベクトルを表現し、かつ元の距離を近似的に(高速に)復元できるようにする。大規模ベクトル検索エンジン(FAISS など)の中核技術として広く使われている。

## 仕組み

1. `D`次元のベクトルを`m`個のサブベクトル(それぞれ`D/m`次元)に分割する
2. 各サブベクトルの位置(1番目の断片、2番目の断片、…)ごとに、学習用のベクトル集合を使って**k-meansクラスタリング**を行い、`k`個(通常256個、8bitで表現できる数)の代表点(セントロイド)からなる「コードブック」を作る
3. 各ベクトルを符号化する際、`m`個のサブベクトルそれぞれについて、対応するコードブックの中で最も近いセントロイドのインデックス(0〜255の1バイト)を求める。これにより、元の`D`次元の実数ベクトルが、わずか`m`バイトの短いコードに圧縮される
4. **距離の近似計算**: クエリベクトルと、圧縮済みのデータベース中のベクトルとの距離を求めたいとき、クエリベクトルを同じ`m`個のサブベクトルに分割し、各サブベクトルと、対応するコードブックの全セントロイドとの距離を事前に計算しておく(**距離テーブル**)。データベース中の各ベクトルとの距離は、そのベクトルが持つ`m`個のコードを使って距離テーブルを参照し、足し合わせるだけで近似的に求まる(実際のベクトル同士の距離計算を一切行わない)
5. この近似距離を使って、クエリに最も近いベクトル群を高速に絞り込む。より高精度が必要な場合は、絞り込んだ候補についてのみ元のベクトルで正確な距離を再計算する(2段階の検索)

## 特性・トレードオフ

- **メモリ使用量の劇的な削減**: 例えば128次元・32bit浮動小数点のベクトル(512バイト)を、`m=16`のPQで符号化すると、わずか16バイトまで圧縮できる。数十億件規模のベクトルデータベースをメモリに収めるために不可欠な圧縮率である
- **距離計算の高速化**: 符号化されたベクトル同士の近似距離は、事前計算した距離テーブルの参照と加算だけで求まるため、元の高次元ベクトル同士のユークリッド距離計算(次元数に比例するコスト)よりもずっと高速になる
- **サブベクトルの独立性という近似の限界**: 各サブベクトルを独立にクラスタリングするため、次元間の相関(ある次元の値が別の次元の値と強く関連している場合)をPQ自体は直接考慮しない。この限界を緩和するため、次元をランダム回転させてから分割する(OPQ: Optimized Product Quantization)といった改良版が提案されている
- **使いどころ**: 大規模な画像・動画の類似検索(数億〜数十億件規模)、レコメンドシステムにおける埋め込みベクトルの近似最近傍検索、大規模言語モデルの検索拡張生成(RAG)におけるベクトルデータベースのインデックス圧縮、FAISS・Milvusなど主要なベクトル検索ライブラリの標準的な圧縮インデックス方式

## 実装例

```python
import random

def kmeans(vectors: list[list[float]], k: int, iterations: int = 10) -> list[list[float]]:
    centroids = random.sample(vectors, k)
    for _ in range(iterations):
        clusters: list[list[list[float]]] = [[] for _ in range(k)]
        for v in vectors:
            nearest = min(range(k), key=lambda c: sum((v[d] - centroids[c][d]) ** 2 for d in range(len(v))))
            clusters[nearest].append(v)
        for c in range(k):
            if clusters[c]:
                dim = len(vectors[0])
                centroids[c] = [sum(v[d] for v in clusters[c]) / len(clusters[c]) for d in range(dim)]
    return centroids

def train_pq_codebooks(training_vectors: list[list[float]], m: int, k: int = 256) -> list[list[list[float]]]:
    dim = len(training_vectors[0])
    sub_dim = dim // m
    codebooks = []
    for i in range(m):
        sub_vectors = [v[i * sub_dim:(i + 1) * sub_dim] for v in training_vectors]
        codebooks.append(kmeans(sub_vectors, k))
    return codebooks

def encode_vector(vector: list[float], codebooks: list[list[list[float]]], sub_dim: int) -> list[int]:
    codes = []
    for i, codebook in enumerate(codebooks):
        sub_vec = vector[i * sub_dim:(i + 1) * sub_dim]
        nearest = min(range(len(codebook)), key=lambda c: sum((sub_vec[d] - codebook[c][d]) ** 2 for d in range(sub_dim)))
        codes.append(nearest)
    return codes

def approximate_distance(query: list[float], codes: list[int], codebooks: list[list[list[float]]], sub_dim: int) -> float:
    total = 0.0
    for i, code in enumerate(codes):
        sub_query = query[i * sub_dim:(i + 1) * sub_dim]
        centroid = codebooks[i][code]
        total += sum((sub_query[d] - centroid[d]) ** 2 for d in range(sub_dim))
    return total
```

```typescript
function kmeans(
  vectors: number[][],
  k: number,
  iterations = 10,
  rand: () => number = Math.random,
): number[][] {
  const centroids = [...vectors].sort(() => rand() - 0.5).slice(0, k);
  const dim = vectors[0].length;

  for (let iter = 0; iter < iterations; iter++) {
    const clusters: number[][][] = Array.from({ length: k }, () => []);
    for (const v of vectors) {
      let nearest = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const dist = v.reduce(
          (s, val, d) => s + (val - centroids[c][d]) ** 2,
          0,
        );
        if (dist < bestDist) {
          bestDist = dist;
          nearest = c;
        }
      }
      clusters[nearest].push(v);
    }
    for (let c = 0; c < k; c++) {
      if (clusters[c].length > 0) {
        centroids[c] = Array.from(
          { length: dim },
          (_, d) =>
            clusters[c].reduce((s, v) => s + v[d], 0) / clusters[c].length,
        );
      }
    }
  }
  return centroids;
}

function encodeVector(
  vector: number[],
  codebooks: number[][][],
  subDim: number,
): number[] {
  return codebooks.map((codebook, i) => {
    const subVec = vector.slice(i * subDim, (i + 1) * subDim);
    let nearest = 0,
      bestDist = Infinity;
    codebook.forEach((centroid, c) => {
      const dist = subVec.reduce(
        (s, val, d) => s + (val - centroid[d]) ** 2,
        0,
      );
      if (dist < bestDist) {
        bestDist = dist;
        nearest = c;
      }
    });
    return nearest;
  });
}
```

```cpp
#include <vector>
#include <limits>
#include <algorithm>
#include <random>

std::vector<std::vector<double>> kmeans(const std::vector<std::vector<double>>& vectors, int k, int iterations = 10) {
    std::vector<std::vector<double>> centroids(vectors.begin(), vectors.begin() + k);
    int dim = static_cast<int>(vectors[0].size());

    for (int iter = 0; iter < iterations; iter++) {
        std::vector<std::vector<std::vector<double>>> clusters(k);
        for (auto& v : vectors) {
            int nearest = 0;
            double bestDist = std::numeric_limits<double>::infinity();
            for (int c = 0; c < k; c++) {
                double dist = 0.0;
                for (int d = 0; d < dim; d++) dist += (v[d] - centroids[c][d]) * (v[d] - centroids[c][d]);
                if (dist < bestDist) { bestDist = dist; nearest = c; }
            }
            clusters[nearest].push_back(v);
        }
        for (int c = 0; c < k; c++) {
            if (!clusters[c].empty()) {
                std::vector<double> newCentroid(dim, 0.0);
                for (auto& v : clusters[c]) for (int d = 0; d < dim; d++) newCentroid[d] += v[d];
                for (int d = 0; d < dim; d++) newCentroid[d] /= clusters[c].size();
                centroids[c] = newCentroid;
            }
        }
    }
    return centroids;
}
```

```rust
fn kmeans(vectors: &[Vec<f64>], k: usize, iterations: usize) -> Vec<Vec<f64>> {
    let dim = vectors[0].len();
    let mut centroids: Vec<Vec<f64>> = vectors[..k].to_vec();

    for _ in 0..iterations {
        let mut clusters: Vec<Vec<&Vec<f64>>> = vec![Vec::new(); k];
        for v in vectors {
            let mut nearest = 0;
            let mut best_dist = f64::MAX;
            for (c, centroid) in centroids.iter().enumerate() {
                let dist: f64 = v.iter().zip(centroid.iter()).map(|(a, b)| (a - b).powi(2)).sum();
                if dist < best_dist {
                    best_dist = dist;
                    nearest = c;
                }
            }
            clusters[nearest].push(v);
        }
        for c in 0..k {
            if !clusters[c].is_empty() {
                let mut new_centroid = vec![0.0; dim];
                for v in &clusters[c] {
                    for d in 0..dim {
                        new_centroid[d] += v[d];
                    }
                }
                for d in 0..dim {
                    new_centroid[d] /= clusters[c].len() as f64;
                }
                centroids[c] = new_centroid;
            }
        }
    }
    centroids
}
```

```csharp
static List<double[]> KMeans(List<double[]> vectors, int k, int iterations = 10)
{
    var centroids = vectors.Take(k).ToList();
    int dim = vectors[0].Length;

    for (int iter = 0; iter < iterations; iter++)
    {
        var clusters = Enumerable.Range(0, k).Select(_ => new List<double[]>()).ToList();
        foreach (var v in vectors)
        {
            int nearest = 0;
            double bestDist = double.PositiveInfinity;
            for (int c = 0; c < k; c++)
            {
                double dist = v.Select((val, d) => Math.Pow(val - centroids[c][d], 2)).Sum();
                if (dist < bestDist) { bestDist = dist; nearest = c; }
            }
            clusters[nearest].Add(v);
        }
        for (int c = 0; c < k; c++)
        {
            if (clusters[c].Count > 0)
            {
                centroids[c] = Enumerable.Range(0, dim).Select(d => clusters[c].Sum(v => v[d]) / clusters[c].Count).ToArray();
            }
        }
    }
    return centroids;
}
```
