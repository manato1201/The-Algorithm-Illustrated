---
name: ランダム射影による局所性鋭敏型ハッシュ(Random Projection LSH)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(D)(1ベクトルあたりのハッシュ計算、Dはベクトルの次元数)
summary: ランダムな超平面を複数用意し、各ベクトルが各超平面のどちら側にあるかを1bitずつ記録するだけで、コサイン類似度が高いベクトルほど同じビット列(ハッシュ)になりやすいという性質を利用した近似検索手法。
---

## 概要

[MinHash/LSH](/algorithms/minhash-lsh)が集合のJaccard類似度を近似するための局所性鋭敏型ハッシュ(LSH)だったのに対し、ランダム射影LSHは**実数値ベクトル同士のコサイン類似度**(ベクトルの向きの近さ)を近似するために設計された、別系統のLSHファミリーである。1990年代にモーゼス・チャラモンテらが理論化したこの手法は、ベクトル空間中に**ランダムな向きの超平面**を何本も用意し、各ベクトルが「各超平面のどちら側にあるか」を1bitずつ記録してビット列(ハッシュ)を作る。2つのベクトルのなす角度が小さい(コサイン類似度が高い)ほど、ランダムな超平面によってたまたま分断されてしまう確率が低くなるため、**似たベクトルほど同じハッシュビット列になりやすい**という性質が数学的に保証される。[SimHash](/algorithms/simhash)はこの技法をテキストの重複検出に応用した具体例であり、より一般のベクトルデータに適用できる基礎理論がランダム射影LSHである。

## 仕組み

1. ベクトルの次元数`D`に対して、ランダムな方向を持つ超平面の法線ベクトル`r_1, r_2, ..., r_k`(各成分が標準正規分布からサンプリングされたランダムベクトル)を`k`本用意する
2. あるベクトル`v`について、各`r_i`との内積の符号を計算する:`h_i(v) = 1 if v・r_i ≥ 0 else 0`
3. `k`個の符号ビットを並べた`h(v) = (h_1(v), h_2(v), ..., h_k(v))`が、ベクトル`v`のハッシュ(局所性鋭敏型の指紋)になる
4. **理論的な保証**: 2つのベクトル`u`, `v`のなす角度を`θ`とすると、ランダムな超平面によって両者が分断される確率は`θ/π`に等しいことが幾何学的に示せる。つまり2つのベクトルの角度が小さい(似ている)ほど、同じ`h_i`のビットが一致する確率が高くなる
5. `k`本のハッシュビットの一致率(ハミング距離)から、元のベクトル同士のコサイン類似度を近似的に推定できる。実務では、複数のハッシュ関数群をANDやORで組み合わせ(バンディング手法、[MinHash/LSH](/algorithms/minhash-lsh)と同様の考え方)、類似ベクトルが同じバケットに集まるよう調整して、効率的な近似最近傍検索を実現する

## 特性・トレードオフ

- **実数値ベクトルへの直接適用**: [MinHash](/algorithms/minhash-lsh)が集合(0/1のような離散データ)向けに設計されているのに対し、ランダム射影LSHは連続値のベクトル(単語埋め込み、画像特徴量など)にそのまま適用できる。コサイン類似度が意味を持つ多くの機械学習の埋め込み表現と相性が良い
- **ハッシュのビット数と精度のトレードオフ**: 超平面の本数`k`(ハッシュのビット長)を増やすほど、角度の推定精度は上がるが、ハッシュ自体のサイズ(ストレージ)と計算コストも増える。実務では数十〜数百ビット程度が典型的に使われる
- **[直積量子化](/algorithms/product-quantization)・[HNSW](/algorithms/hnsw)との比較**: ランダム射影LSHはハッシュの一致・不一致という単純な二値情報に基づくため実装が非常に軽量だが、[HNSW](/algorithms/hnsw)のグラフベースの手法や[直積量子化](/algorithms/product-quantization)のクラスタリングベースの手法と比べると、同じビット数・メモリ量あたりの検索精度では見劣りすることが多い。データ量が巨大でシンプルな実装が求められる場面や、他の手法の前処理・フィルタリング段階として使われることが多い
- **使いどころ**: 大規模な埋め込みベクトルの重複検出・近似最近傍探索の初期絞り込み、[SimHash](/algorithms/simhash)によるテキスト重複検出の理論的基盤、機械学習における次元圧縮の前処理(Johnson-Lindenstrauss型のランダム射影全般との関連)、プライバシー保護を考慮した類似度計算(元のベクトルを直接比較せずハッシュだけで近似できる)

## 実装例

```python
import random
import math

def generate_random_hyperplanes(dim: int, k: int, seed: int | None = None) -> list[list[float]]:
    rng = random.Random(seed)
    return [[rng.gauss(0, 1) for _ in range(dim)] for _ in range(k)]

def hash_vector(vector: list[float], hyperplanes: list[list[float]]) -> list[int]:
    return [1 if sum(v * r for v, r in zip(vector, plane)) >= 0 else 0 for plane in hyperplanes]

def hamming_distance(a: list[int], b: list[int]) -> int:
    return sum(x != y for x, y in zip(a, b))

def estimate_cosine_similarity(hash_a: list[int], hash_b: list[int]) -> float:
    """ハミング距離から元のコサイン類似度(角度)を近似する。"""
    k = len(hash_a)
    disagreement_ratio = hamming_distance(hash_a, hash_b) / k
    estimated_angle = disagreement_ratio * math.pi
    return math.cos(estimated_angle)
```

```typescript
function generateRandomHyperplanes(dim: number, k: number, rand: () => number = Math.random): number[][] {
  const gaussian = () => {
    const u1 = rand(), u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  return Array.from({ length: k }, () => Array.from({ length: dim }, gaussian));
}

function hashVector(vector: number[], hyperplanes: number[][]): number[] {
  return hyperplanes.map((plane) => {
    const dot = vector.reduce((sum, v, i) => sum + v * plane[i], 0);
    return dot >= 0 ? 1 : 0;
  });
}

function hammingDistance(a: number[], b: number[]): number {
  return a.reduce((sum, x, i) => sum + (x !== b[i] ? 1 : 0), 0);
}

function estimateCosineSimilarity(hashA: number[], hashB: number[]): number {
  const k = hashA.length;
  const disagreementRatio = hammingDistance(hashA, hashB) / k;
  const estimatedAngle = disagreementRatio * Math.PI;
  return Math.cos(estimatedAngle);
}
```

```cpp
#include <vector>
#include <random>
#include <cmath>

std::vector<std::vector<double>> generateRandomHyperplanes(int dim, int k, unsigned seed) {
    std::mt19937 rng(seed);
    std::normal_distribution<double> dist(0.0, 1.0);
    std::vector<std::vector<double>> hyperplanes(k, std::vector<double>(dim));
    for (auto& plane : hyperplanes) for (auto& v : plane) v = dist(rng);
    return hyperplanes;
}

std::vector<int> hashVector(const std::vector<double>& vector, const std::vector<std::vector<double>>& hyperplanes) {
    std::vector<int> hash;
    for (auto& plane : hyperplanes) {
        double dot = 0.0;
        for (size_t i = 0; i < vector.size(); i++) dot += vector[i] * plane[i];
        hash.push_back(dot >= 0 ? 1 : 0);
    }
    return hash;
}

int hammingDistance(const std::vector<int>& a, const std::vector<int>& b) {
    int count = 0;
    for (size_t i = 0; i < a.size(); i++) if (a[i] != b[i]) count++;
    return count;
}

double estimateCosineSimilarity(const std::vector<int>& hashA, const std::vector<int>& hashB) {
    int k = static_cast<int>(hashA.size());
    double disagreementRatio = static_cast<double>(hammingDistance(hashA, hashB)) / k;
    double estimatedAngle = disagreementRatio * M_PI;
    return std::cos(estimatedAngle);
}
```

```rust
use rand_distr::{Distribution, Normal};
use rand::Rng;

fn generate_random_hyperplanes(dim: usize, k: usize, rng: &mut impl Rng) -> Vec<Vec<f64>> {
    let normal = Normal::new(0.0, 1.0).unwrap();
    (0..k).map(|_| (0..dim).map(|_| normal.sample(rng)).collect()).collect()
}

fn hash_vector(vector: &[f64], hyperplanes: &[Vec<f64>]) -> Vec<u8> {
    hyperplanes
        .iter()
        .map(|plane| {
            let dot: f64 = vector.iter().zip(plane.iter()).map(|(v, r)| v * r).sum();
            if dot >= 0.0 { 1 } else { 0 }
        })
        .collect()
}

fn hamming_distance(a: &[u8], b: &[u8]) -> usize {
    a.iter().zip(b.iter()).filter(|(x, y)| x != y).count()
}

fn estimate_cosine_similarity(hash_a: &[u8], hash_b: &[u8]) -> f64 {
    let k = hash_a.len() as f64;
    let disagreement_ratio = hamming_distance(hash_a, hash_b) as f64 / k;
    let estimated_angle = disagreement_ratio * std::f64::consts::PI;
    estimated_angle.cos()
}
```

```csharp
static double[][] GenerateRandomHyperplanes(int dim, int k, Random rand)
{
    double NextGaussian()
    {
        double u1 = 1.0 - rand.NextDouble(), u2 = rand.NextDouble();
        return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
    }

    var hyperplanes = new double[k][];
    for (int i = 0; i < k; i++)
    {
        hyperplanes[i] = new double[dim];
        for (int d = 0; d < dim; d++) hyperplanes[i][d] = NextGaussian();
    }
    return hyperplanes;
}

static int[] HashVector(double[] vector, double[][] hyperplanes)
{
    return hyperplanes.Select(plane =>
    {
        double dot = vector.Select((v, i) => v * plane[i]).Sum();
        return dot >= 0 ? 1 : 0;
    }).ToArray();
}

static int HammingDistance(int[] a, int[] b) => a.Where((x, i) => x != b[i]).Count();

static double EstimateCosineSimilarity(int[] hashA, int[] hashB)
{
    int k = hashA.Length;
    double disagreementRatio = (double)HammingDistance(hashA, hashB) / k;
    double estimatedAngle = disagreementRatio * Math.PI;
    return Math.Cos(estimatedAngle);
}
```
